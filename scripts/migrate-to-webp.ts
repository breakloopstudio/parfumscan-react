/**
 * Script de migration JPEG/PNG → WebP pour les images existantes
 *
 * Télécharge chaque image depuis le bucket Storage, la convertit en WebP,
 * l'upload, régénère l'URL signée et met à jour le doc Firestore.
 *
 * Usage:
 *   npm run migrate-webp              Migration complète (reprend si interrompue)
 *   npm run migrate-webp -- --dry-run  Simulation sans écriture
 *   npm run migrate-webp -- --reset    Ignore la progression précédente
 */

import * as fs from 'fs';
import * as path from 'path';
import { initializeApp, getApps, cert } from 'firebase-admin/app';
import { getFirestore, type Firestore } from 'firebase-admin/firestore';
import { getStorage } from 'firebase-admin/storage';
import sharp from 'sharp';

type Bucket = ReturnType<ReturnType<typeof getStorage>['bucket']>;

// ---------------------------------------------------------------------------
// Configuration
// ---------------------------------------------------------------------------

const SERVICE_ACCOUNT_PATH = path.resolve('service-account.json');
const PROGRESS_FILE = path.resolve('migration-webp-progress.json');
const FAILED_LOG = path.resolve('migration-webp-failed.json');

const CONCURRENCY = 8;
const WEBP_QUALITY = 82;
const TEN_YEARS_MS = 1000 * 60 * 60 * 24 * 365 * 10;

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface FailedEntry {
  parfumId: string;
  reason: string;
}

interface Progress {
  startedAt: string;
  updatedAt: string;
  converted: string[];
  skipped: string[];
  failed: FailedEntry[];
}

// ---------------------------------------------------------------------------
// Persistance de la progression
// ---------------------------------------------------------------------------

function loadProgress(reset: boolean): Progress {
  if (!reset && fs.existsSync(PROGRESS_FILE)) {
    const data = JSON.parse(fs.readFileSync(PROGRESS_FILE, 'utf-8')) as Progress;
    process.stderr.write(
      `Reprise: ${data.converted.length} OK, ${data.skipped.length} skip, ${data.failed.length} échecs\n\n`,
    );
    return data;
  }
  return {
    startedAt: new Date().toISOString(),
    updatedAt: '',
    converted: [],
    skipped: [],
    failed: [],
  };
}

function saveProgress(p: Progress): void {
  p.updatedAt = new Date().toISOString();
  fs.writeFileSync(PROGRESS_FILE, JSON.stringify(p, null, 2));
}

function saveFailedLog(entries: FailedEntry[]): void {
  fs.writeFileSync(FAILED_LOG, JSON.stringify(entries, null, 2));
}

// ---------------------------------------------------------------------------
// Formatage
// ---------------------------------------------------------------------------

function formatBytes(n: number): string {
  if (n < 1024) return `${n} o`;
  return `${(n / 1024).toFixed(1)} Ko`;
}

function formatDuration(ms: number): string {
  const s = Math.floor(ms / 1000);
  const m = Math.floor(s / 60);
  const h = Math.floor(m / 60);
  if (h > 0) return `${h}h ${m % 60}m ${s % 60}s`;
  if (m > 0) return `${m}m ${s % 60}s`;
  return `${s}s`;
}

// ---------------------------------------------------------------------------
// Opérations image
// ---------------------------------------------------------------------------

async function downloadFromBucket(
  bucket: Bucket,
  parfumId: string,
): Promise<{ buffer: Buffer; oldPath: string } | null> {
  const extensions = ['jpg', 'jpeg', 'png'];

  for (const ext of extensions) {
    const filePath = `parfums/${parfumId}/primary.${ext}`;
    try {
      const file = bucket.file(filePath);
      const [exists] = await file.exists();
      if (!exists) continue;

      const [buffer] = await file.download();
      return { buffer, oldPath: filePath };
    } catch {
      continue;
    }
  }
  return null;
}

async function downloadFromUrl(url: string): Promise<Buffer | null> {
  try {
    const res = await fetch(url, { signal: AbortSignal.timeout(15_000) });
    if (!res.ok) return null;
    const arrayBuf = await res.arrayBuffer();
    return Buffer.from(arrayBuf);
  } catch {
    return null;
  }
}

async function convertToWebp(buffer: Buffer): Promise<Buffer> {
  const metadata = await sharp(buffer).metadata();
  let instance = sharp(buffer);

  if (metadata.format === 'png') {
    instance = instance.flatten({ background: { r: 255, g: 255, b: 255 } });
  }

  return instance.webp({ quality: WEBP_QUALITY }).toBuffer();
}

async function uploadWebp(
  bucket: Bucket,
  parfumId: string,
  webpBuffer: Buffer,
): Promise<string> {
  const filePath = `parfums/${parfumId}/primary.webp`;
  const file = bucket.file(filePath);

  await file.save(webpBuffer, {
    contentType: 'image/webp',
    metadata: { cacheControl: 'public, max-age=31536000' },
  });

  const [url] = await file.getSignedUrl({
    action: 'read',
    expires: Date.now() + TEN_YEARS_MS,
  });

  return url;
}

// ---------------------------------------------------------------------------
// Traitement d'un parfum
// ---------------------------------------------------------------------------

async function processOne(
  db: Firestore,
  bucket: Bucket,
  parfumId: string,
  imageUrl: string,
  dryRun: boolean,
): Promise<{ status: 'converted' | 'skipped' | 'failed'; detail: string }> {
  // Vérifier si déjà converti (fichier .webp existant)
  const webpFile = bucket.file(`parfums/${parfumId}/primary.webp`);
  try {
    const [exists] = await webpFile.exists();
    if (exists) {
      return { status: 'skipped', detail: 'déjà en WebP' };
    }
  } catch {
    // fichier inexistant → continuer
  }

  // 1. Télécharger l'image existante (bucket d'abord, puis URL Firestore)
  let buffer: Buffer | null = null;

  const bucketResult = await downloadFromBucket(bucket, parfumId);
  if (bucketResult) {
    buffer = bucketResult.buffer;
  } else {
    buffer = await downloadFromUrl(imageUrl);
  }

  if (!buffer || buffer.length === 0) {
    return { status: 'failed', detail: 'téléchargement échoué (bucket + URL)' };
  }

  // 2. Convertir en WebP
  let webpBuffer: Buffer;
  try {
    webpBuffer = await convertToWebp(buffer);
  } catch (err) {
    return { status: 'failed', detail: `conversion sharp: ${(err as Error).message.slice(0, 80)}` };
  }

  if (webpBuffer.length === 0) {
    return { status: 'failed', detail: 'buffer WebP vide après conversion' };
  }

  const savings = ((1 - webpBuffer.length / buffer.length) * 100).toFixed(0);
  const detail = `${formatBytes(buffer.length)} → ${formatBytes(webpBuffer.length)} (${savings}%)`;

  if (dryRun) {
    return { status: 'skipped', detail: `[DRY] ${detail}` };
  }

  // 3. Uploader le WebP
  let newUrl: string;
  try {
    newUrl = await uploadWebp(bucket, parfumId, webpBuffer);
  } catch (err) {
    return { status: 'failed', detail: `upload: ${(err as Error).message.slice(0, 80)}` };
  }

  // 4. Mettre à jour Firestore
  try {
    await db.collection('parfums').doc(parfumId).update({
      imageUrl: newUrl,
      updatedAt: new Date(),
    });
  } catch (err) {
    return { status: 'failed', detail: `Firestore update: ${(err as Error).message.slice(0, 80)}` };
  }

  return { status: 'converted', detail };
}

// ---------------------------------------------------------------------------
// Boucle principale
// ---------------------------------------------------------------------------

async function main() {
  const args = process.argv.slice(2);
  const dryRun = args.includes('--dry-run');
  const reset = args.includes('--reset');

  if (dryRun) {
    console.log('*** DRY RUN — aucune écriture ***\n');
  }

  // Init Firebase Admin
  const projectId = process.env.FIREBASE_PROJECT_ID || 'parfumscan-60549';

  if (!fs.existsSync(SERVICE_ACCOUNT_PATH)) {
    console.error(`Clé de service introuvable: ${SERVICE_ACCOUNT_PATH}`);
    console.error(
      'Générer: https://console.firebase.google.com/project/parfumscan-60549/settings/serviceaccounts/adminsdk',
    );
    process.exit(1);
  }

  if (getApps().length === 0) {
    const serviceAccount = JSON.parse(fs.readFileSync(SERVICE_ACCOUNT_PATH, 'utf-8'));
    initializeApp({
      credential: cert(serviceAccount),
      projectId,
      storageBucket: `${projectId}.firebasestorage.app`,
    });
  }

  const db = getFirestore();
  const bucket = getStorage().bucket();

  console.log(`Projet   : ${projectId}`);
  console.log(`Parallèle: ${CONCURRENCY}`);
  console.log(`Qualité  : ${WEBP_QUALITY}\n`);

  // Charger ou initialiser la progression
  const progress = loadProgress(reset);
  const doneSet = new Set([...progress.converted, ...progress.skipped]);

  // Requête Firestore : tous les parfums avec imageUrl
  console.log('Requête Firestore...');
  const snapshot = await db
    .collection('parfums')
    .where('imageUrl', '!=', null)
    .select('imageUrl')
    .get();

  console.log(`${snapshot.docs.length} parfums avec imageUrl dans Firestore.\n`);

  // Filtrer les candidats
  const candidates: Array<{ id: string; imageUrl: string }> = [];
  for (const doc of snapshot.docs) {
    const id = doc.id;
    const url = (doc.data() as { imageUrl?: string }).imageUrl;

    if (!url || doneSet.has(id)) continue;

    // Sauter si l'URL pointe déjà vers un .webp
    if (url.includes('primary.webp') || url.endsWith('.webp')) {
      progress.skipped.push(id);
      continue;
    }

    candidates.push({ id, imageUrl: url });
  }

  console.log(`${candidates.length} candidats à migrer (${doneSet.size} déjà traités).\n`);

  if (candidates.length === 0) {
    console.log('Rien à migrer.');
    saveProgress(progress);
    process.exit(0);
  }

  // Gestion de l'arrêt gracieux (Ctrl+C)
  let shuttingDown = false;
  const shutdown = () => {
    if (shuttingDown) {
      process.stderr.write('\nForce exit.\n');
      process.exit(1);
    }
    shuttingDown = true;
    process.stderr.write('\n\nArrêt gracieux — sauvegarde de la progression...\n');
    saveProgress(progress);
    if (progress.failed.length > 0) saveFailedLog(progress.failed);
    process.stderr.write(
      `Progression sauvegardée. ${progress.converted.length} convertis. Relancer avec: npm run migrate-webp\n`,
    );
    process.exit(0);
  };
  process.on('SIGINT', shutdown);
  process.on('SIGTERM', shutdown);

  // Traitement par lots avec parallélisme contrôlé
  const startTime = Date.now();
  let completedBatch = 0;

  for (let i = 0; i < candidates.length; i += CONCURRENCY) {
    if (shuttingDown) break;

    const batch = candidates.slice(i, i + CONCURRENCY);
    const results = await Promise.allSettled(
      batch.map((c) => processOne(db, bucket, c.id, c.imageUrl, dryRun)),
    );

    for (let j = 0; j < batch.length; j++) {
      const result = results[j];
      if (result.status === 'rejected') {
        progress.failed.push({
          parfumId: batch[j].id,
          reason: `exception: ${(result.reason as Error)?.message?.slice(0, 120) ?? String(result.reason)}`,
        });
        continue;
      }

      const { status, detail } = result.value;
      if (status === 'converted') {
        progress.converted.push(batch[j].id);
      } else if (status === 'skipped') {
        progress.skipped.push(batch[j].id);
      } else {
        progress.failed.push({ parfumId: batch[j].id, reason: detail });
      }
    }

    completedBatch += batch.length;
    const elapsed = Date.now() - startTime;
    const rate = completedBatch / (elapsed / 1000);
    const remaining = candidates.length - completedBatch;
    const etaSec = rate > 0 ? remaining / rate : 0;
    const totalConverted = progress.converted.length;

    // Barre de progression
    const pct = ((completedBatch / candidates.length) * 100).toFixed(1);
    process.stdout.write(
      `\r[${pct.padStart(5)}%] ${completedBatch}/${candidates.length} | ` +
        `${'█'.repeat(Math.floor(completedBatch / candidates.length * 30))}${'░'.repeat(
          Math.max(0, 30 - Math.floor(completedBatch / candidates.length * 30)),
        )} | ` +
        `OK: ${totalConverted} | Échecs: ${progress.failed.length} | ` +
        `ETA: ${etaSec > 0 ? formatDuration(etaSec * 1000) : '--'}   `,
    );

    // Sauvegarde périodique
    if (completedBatch % 50 === 0) {
      saveProgress(progress);
      if (progress.failed.length > 0) saveFailedLog(progress.failed);
    }
  }

  // Final
  saveProgress(progress);
  if (progress.failed.length > 0) saveFailedLog(progress.failed);

  const totalTime = Date.now() - startTime;
  console.log('\n');
  console.log('═'.repeat(58));
  console.log(`Migration terminée en ${formatDuration(totalTime)}`);
  console.log(`  Convertis : ${progress.converted.length}`);
  console.log(`  Ignorés   : ${progress.skipped.length}`);
  console.log(`  Échecs    : ${progress.failed.length}`);
  if (progress.failed.length > 0) {
    console.log(`  → Détail  : ${FAILED_LOG}`);
  }
  console.log('═'.repeat(58));
}

main().catch((err) => {
  console.error('Erreur fatale:', err);
  process.exit(1);
});
