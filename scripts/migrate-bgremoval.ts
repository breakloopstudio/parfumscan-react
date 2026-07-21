/**
 * Migration background removal v2 — source = data/clean/*.json (Fragrantica URLs)
 *
 * Lit les JSON locaux, télécharge chaque image depuis son URL Fragrantica,
 * retire le fond (MODNet), convertit en WebP avec alpha, upload dans Storage,
 * met à jour Firestore.
 *
 * Usage:
 *   npm run migrate-bg              Migration complète (reprend si interrompue)
 *   npm run migrate-bg -- --dry-run  Simulation sans écriture
 *   npm run migrate-bg -- --reset    Ignore la progression précédente
 */

import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';
import { execSync } from 'child_process';
import { initializeApp, getApps, cert } from 'firebase-admin/app';
import { getFirestore, type Firestore } from 'firebase-admin/firestore';
import { getStorage } from 'firebase-admin/storage';
import sharp from 'sharp';

// ---------------------------------------------------------------------------
// Configuration
// ---------------------------------------------------------------------------

const SERVICE_ACCOUNT_PATH = path.resolve('service-account.json');
const CLEAN_DIR = path.resolve('data', 'clean');
const PROGRESS_FILE = path.resolve('migration-bg-progress.json');
const FAILED_LOG = path.resolve('migration-bg-failed.json');
const BG_REMOVAL_SCRIPT = path.resolve('scripts/bgremoval/remove-bg.cjs');
const BG_REMOVAL_CWD = path.resolve('scripts/bgremoval');

const CONCURRENCY = 8;
const WEBP_QUALITY = 82;
const TEN_YEARS_MS = 1000 * 60 * 60 * 24 * 365 * 10;
const IMG_DOWNLOAD_TIMEOUT_MS = 15_000;
const BG_TIMEOUT_MS = 60_000;

type Bucket = ReturnType<ReturnType<typeof getStorage>['bucket']>;

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface CleanEntry {
  title: string;
  primaryImageUrl?: string;
  brandName: string;
}

interface ParsedTitle {
  nom: string;
}

interface MigrationEntry {
  parfumId: string;
  imageUrl: string;
  brandName: string;
  nom: string;
  sourceFile: string;
}

interface FailedEntry {
  parfumId: string;
  brandName: string;
  nom: string;
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
// Helpers
// ---------------------------------------------------------------------------

function normaliseTexte(s: string): string {
  return s
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase();
}

function normaliseId(s: string): string {
  return normaliseTexte(s)
    .replace(/[^a-z0-9]+/g, '_')
    .replace(/^_|_$/g, '');
}

function parseTitle(title: string, brandName: string): ParsedTitle {
  const parts = title.split(' - ');
  const left = (parts[0] ?? '').trim();
  let nom = left;

  const brandLower = brandName.toLowerCase();
  const leftLower = left.toLowerCase();
  const lastBrandIdx = leftLower.lastIndexOf(brandLower);

  if (lastBrandIdx !== -1) {
    nom = left.slice(0, lastBrandIdx).trim();
  }

  if (!nom) nom = left;
  return { nom };
}

// ---------------------------------------------------------------------------
// Persistance
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

function formatDuration(ms: number): string {
  const s = Math.floor(ms / 1000);
  const m = Math.floor(s / 60);
  const h = Math.floor(m / 60);
  if (h > 0) return `${h}h ${m % 60}m ${s % 60}s`;
  if (m > 0) return `${m}m ${s % 60}s`;
  return `${s}s`;
}

// ---------------------------------------------------------------------------
// Background removal via subprocess
// ---------------------------------------------------------------------------

function removeBackground(inputBuffer: Buffer): Buffer | null {
  const tmpIn = path.join(os.tmpdir(), `bgmig_${Date.now()}_${Math.random().toString(36).slice(2)}_in.png`);
  const tmpOut = path.join(os.tmpdir(), `bgmig_${Date.now()}_${Math.random().toString(36).slice(2)}_out.png`);

  try {
    fs.writeFileSync(tmpIn, inputBuffer);
    execSync(`node remove-bg.cjs "${tmpIn}" "${tmpOut}"`, {
      cwd: BG_REMOVAL_CWD,
      stdio: 'pipe',
      timeout: BG_TIMEOUT_MS,
    });
    if (!fs.existsSync(tmpOut) || fs.statSync(tmpOut).size === 0) return null;
    return fs.readFileSync(tmpOut);
  } catch {
    return null;
  } finally {
    try { fs.unlinkSync(tmpIn); } catch { /* ignore */ }
    try { fs.unlinkSync(tmpOut); } catch { /* ignore */ }
  }
}

// ---------------------------------------------------------------------------
// Download image from Fragrantica URL
// ---------------------------------------------------------------------------

async function downloadFromUrl(url: string): Promise<Buffer | null> {
  try {
    const res = await fetch(url, { signal: AbortSignal.timeout(IMG_DOWNLOAD_TIMEOUT_MS) });
    if (!res.ok) return null;
    const buf = Buffer.from(await res.arrayBuffer());
    return buf.length > 100 ? buf : null;
  } catch {
    return null;
  }
}

// ---------------------------------------------------------------------------
// Upload WebP to Storage
// ---------------------------------------------------------------------------

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
  entry: MigrationEntry,
  dryRun: boolean,
): Promise<{ status: 'converted' | 'skipped' | 'failed'; detail: string }> {
  // 1. Télécharger le JPG depuis l'URL Fragrantica
  const jpgBuffer = await downloadFromUrl(entry.imageUrl);
  if (!jpgBuffer) {
    return { status: 'failed', detail: 'download failed (URL dead or timeout)' };
  }

  // 2. Background removal
  const pngBuffer = removeBackground(jpgBuffer);
  if (!pngBuffer) {
    return { status: 'failed', detail: 'background removal failed' };
  }

  // 3. Convert to WebP (no flatten — preserve alpha)
  const webpBuffer = await sharp(pngBuffer)
    .webp({ quality: WEBP_QUALITY })
    .toBuffer();

  const detail = `${(jpgBuffer.length / 1024).toFixed(0)}K → ${(webpBuffer.length / 1024).toFixed(0)}K`;

  if (dryRun) {
    return { status: 'skipped', detail: `[DRY] ${detail}` };
  }

  // 4. Upload WebP
  let newUrl: string;
  try {
    newUrl = await uploadWebp(bucket, entry.parfumId, webpBuffer);
  } catch (err) {
    return { status: 'failed', detail: `upload: ${(err as Error).message.slice(0, 80)}` };
  }

  // 5. Mettre à jour Firestore
  try {
    await db.collection('parfums').doc(entry.parfumId).update({
      imageUrl: newUrl,
      updatedAt: new Date(),
    });
  } catch (err) {
    return { status: 'failed', detail: `Firestore update: ${(err as Error).message.slice(0, 80)}` };
  }

  return { status: 'converted', detail };
}

// ---------------------------------------------------------------------------
// Indexation des JSON → liste de candidats
// ---------------------------------------------------------------------------

function buildCandidateList(): MigrationEntry[] {
  if (!fs.existsSync(CLEAN_DIR)) {
    console.error(`Dossier introuvable: ${CLEAN_DIR}`);
    process.exit(1);
  }

  const files = fs.readdirSync(CLEAN_DIR).filter((f) => f.endsWith('.json'));
  const candidates: MigrationEntry[] = [];

  for (const file of files) {
    let entries: CleanEntry[];
    try {
      entries = JSON.parse(fs.readFileSync(path.join(CLEAN_DIR, file), 'utf-8'));
    } catch {
      continue;
    }
    if (!Array.isArray(entries)) continue;

    for (const entry of entries) {
      const imageUrl = entry.primaryImageUrl;
      if (!imageUrl) continue;

      const { nom } = parseTitle(entry.title, entry.brandName);
      const parfumId = normaliseId(`${entry.brandName}_${nom}`);
      if (!parfumId) continue;

      candidates.push({
        parfumId,
        imageUrl,
        brandName: entry.brandName,
        nom,
        sourceFile: file,
      });
    }
  }

  return candidates;
}

// ---------------------------------------------------------------------------
// Main
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
  console.log(`Source   : ${CLEAN_DIR}\n`);

  // Construire la liste des candidats depuis les JSON locaux
  console.log('Indexation des fichiers JSON...');
  const allEntries = buildCandidateList();
  console.log(`${allEntries.length} entrées avec primaryImageUrl.\n`);

  // Charger la progression
  const progress = loadProgress(reset);
  const doneSet = new Set([...progress.converted, ...progress.skipped]);

  // Filtrer
  const candidates = allEntries.filter((e) => !doneSet.has(e.parfumId));
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
    process.stderr.write('\n\nArrêt gracieux — sauvegarde...\n');
    saveProgress(progress);
    if (progress.failed.length > 0) saveFailedLog(progress.failed);
    process.stderr.write(
      `Progression sauvegardée. ${progress.converted.length} convertis. Relancer: npm run migrate-bg\n`,
    );
    process.exit(0);
  };
  process.on('SIGINT', shutdown);
  process.on('SIGTERM', shutdown);

  // Traitement par lots
  const startTime = Date.now();
  let completedBatch = 0;

  for (let i = 0; i < candidates.length; i += CONCURRENCY) {
    if (shuttingDown) break;

    const batch = candidates.slice(i, i + CONCURRENCY);
    const results = await Promise.allSettled(
      batch.map((e) => processOne(db, bucket, e, dryRun)),
    );

    for (let j = 0; j < batch.length; j++) {
      const result = results[j];
      if (result.status === 'rejected') {
        progress.failed.push({
          parfumId: batch[j].parfumId,
          brandName: batch[j].brandName,
          nom: batch[j].nom,
          reason: `exception: ${(result.reason as Error)?.message?.slice(0, 120) ?? String(result.reason)}`,
        });
        continue;
      }

      const { status, detail } = result.value;
      if (status === 'converted') {
        progress.converted.push(batch[j].parfumId);
      } else if (status === 'skipped') {
        progress.skipped.push(batch[j].parfumId);
      } else {
        progress.failed.push({
          parfumId: batch[j].parfumId,
          brandName: batch[j].brandName,
          nom: batch[j].nom,
          reason: detail,
        });
      }
    }

    completedBatch += batch.length;
    const elapsed = Date.now() - startTime;
    const rate = completedBatch / (elapsed / 1000);
    const remaining = candidates.length - completedBatch;
    const etaSec = rate > 0 ? remaining / rate : 0;
    const totalConverted = progress.converted.length;

    const pct = ((completedBatch / candidates.length) * 100).toFixed(1);
    process.stdout.write(
      `\r[${pct.padStart(5)}%] ${completedBatch}/${candidates.length} | ` +
        `${'█'.repeat(Math.floor((completedBatch / candidates.length) * 30))}${'░'.repeat(
          Math.max(0, 30 - Math.floor((completedBatch / candidates.length) * 30)),
        )} | ` +
        `OK: ${totalConverted} | Échecs: ${progress.failed.length} | ` +
        `ETA: ${etaSec > 0 ? formatDuration(etaSec * 1000) : '--'}   `,
    );

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
