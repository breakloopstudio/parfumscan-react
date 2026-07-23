import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';
import { execSync } from 'child_process';
import { initializeApp, getApps, cert } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';
import { getStorage } from 'firebase-admin/storage';
import sharp from 'sharp';

const SERVICE_ACCOUNT_PATH = path.resolve('service-account.json');
const BG_REMOVAL_SCRIPT = path.resolve('scripts/bgremoval/remove-bg.cjs');
const BG_REMOVAL_CWD = path.resolve('scripts/bgremoval');
const BG_REMOVAL_ENABLED = process.env.BG_REMOVAL === 'true';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface CleanEntry {
  title: string;
  primaryImageUrl?: string;
  brandName: string;
  mainAccords: { accord: string; value: number }[];
  pyramid: {
    type: string;
    topNotes: { name: string }[];
    middleNotes: { name: string }[];
    baseNotes: { name: string }[];
    allNotes?: { name: string }[];
  };
  longevityBreakout: Record<string, number>[];
  longevityAverage: number;
  sillageBreakout: Record<string, number>[];
  sillageAverage: number;
  priceValueBreakout: Record<string, number>[];
  priceValueAverage: number;
  perfumeRating: number;
  ratingBreakout: Record<string, number>[];
  ratingAverage: number;
  bestRating: number;
  ratingCount: number;
  reviewCount: number;
  gender: string;
  genderBreakout: Record<string, number>;
  seasonBreakout: Record<string, number>;
  relationBreakout: Record<string, number>;
  perfumers: string[];
  [key: string]: unknown;
}

interface ParsedTitle {
  nom: string;
  annee: number | undefined;
  typeParfum: string | undefined;
  genderLabel: string | undefined;
}

interface ImportStats {
  fileName: string;
  imported: number;
  updated: number;
  skipped: number;
  errors: number;
}

// ---------------------------------------------------------------------------
// Helpers: title parsing
// ---------------------------------------------------------------------------

function parseTitle(title: string, brandName: string): ParsedTitle {
  const parts = title.split(' - ');
  const left = (parts[0] ?? '').trim();
  const right = (parts[1] ?? '').trim();

  let nom = left;
  let typeParfum: string | undefined;

  const brandLower = brandName.toLowerCase();
  const leftLower = left.toLowerCase();
  const lastBrandIdx = leftLower.lastIndexOf(brandLower);

  if (lastBrandIdx !== -1) {
    nom = left.slice(0, lastBrandIdx).trim();
    const remainder = left.slice(lastBrandIdx + brandName.length).trim();

    const typeWords = [
      'eau de parfum',
      'eau de toilette',
      'eau de cologne',
      'extrait de parfum',
      'parfum',
      'perfume',
      'cologne',
      'edp',
      'edt',
      'edc',
    ];

    let remainderLower = remainder.toLowerCase();
    for (const tw of typeWords) {
      if (remainderLower.startsWith(tw)) {
        typeParfum = remainder.slice(0, tw.length).trim();
        break;
      }
    }
  }

  if (!nom) nom = left;

  let annee: number | undefined;
  if (right) {
    const yearMatch = right.match(/\b(\d{4})\b/);
    if (yearMatch) {
      annee = parseInt(yearMatch[1], 10);
      if (annee < 1900 || annee > 2030) annee = undefined;
    }
  }

  let genderLabel: string | undefined;
  if (right) {
    const rl = right.toLowerCase();
    if (rl.includes('women and men') || rl.includes('men and women') || rl.includes('women & men')) {
      genderLabel = 'unisex';
    } else if (rl.includes('unisex')) {
      genderLabel = 'unisex';
    } else if (rl.includes('women') || rl.includes('female')) {
      genderLabel = 'female';
    } else if (rl.includes('men') || rl.includes('male')) {
      genderLabel = 'male';
    }
  }

  return { nom, annee, typeParfum, genderLabel };
}

// ---------------------------------------------------------------------------
// Helpers: ID generation
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

function normaliseTokens(s: string): string {
  return normaliseTexte(s).replace(/[^a-z0-9]+/g, '_').replace(/^_|_$/g, '');
}

function buildSearchKeywords(marque: string, nom: string, familleOlactive?: string): string[] {
  const STOP_WORDS_SCRIPT = new Set([
    'de', 'la', 'le', 'eau', 'pour', 'l', 'd', 'du', 'des', 'et',
    'a', 'un', 'une', 'en', 'sur', 'par', 'au', 'aux', 'les',
    'dans', 'avec', 'sans', 'sous', 'ou', 'est', 'ce', 'son', 'sa',
    'the', 'of', 'and', 'for', 'by', 'to', 'in', 'is', 'it', 'on',
  ]);

  const m = normaliseTokens(marque);
  const n = normaliseTokens(nom);
  const tokens = new Set<string>();

  const generateTri = (word: string): string[] => {
    const padded = `$${word}$`;
    const out: string[] = [];
    for (let i = 0; i < padded.length - 2; i++) {
      out.push(padded.substring(i, i + 3));
    }
    return out;
  };

  const addWordAndPrefixes = (word: string) => {
    if (word.length < 2 || STOP_WORDS_SCRIPT.has(word)) return;
    tokens.add(word);
    for (let i = 3; i < word.length; i++) {
      tokens.add(word.slice(0, i));
    }
    for (const tg of generateTri(word)) {
      tokens.add(`~${tg}`);
    }
  };

  m.split('_')
    .filter(Boolean)
    .forEach((t) => addWordAndPrefixes(t));
  n.split('_')
    .filter(Boolean)
    .forEach((t) => addWordAndPrefixes(t));

  tokens.add(`${m}_${n}`);
  tokens.add(m);
  tokens.add(n);

  if (familleOlactive) {
    const famWords = normaliseTokens(familleOlactive).split('_').filter(Boolean);
    for (const w of famWords) {
      addWordAndPrefixes(w);
    }
  }

  return [...tokens];
}

// ---------------------------------------------------------------------------
// Helpers: data conversion
// ---------------------------------------------------------------------------

function longevityString(avg: number): string {
  if (avg < 2.0) return 'weak';
  if (avg < 3.0) return 'moderate';
  if (avg < 4.0) return 'long lasting';
  return 'eternal';
}

function sillageString(avg: number): string {
  if (avg < 1.5) return 'intimate';
  if (avg < 2.5) return 'moderate';
  if (avg < 3.5) return 'strong';
  return 'enormous';
}

function priceValueString(avg: number): string {
  if (avg < 2.5) return 'overpriced';
  if (avg < 3.5) return 'fair';
  return 'deal';
}

function genderNormalise(g: string | undefined): string | null {
  if (!g) return null;
  const k = g.toLowerCase().trim();
  if (k.includes('unisex') || k.includes('women and men') || k.includes('men and women')) return 'unisex';
  if (k.includes('female') || k.includes('women')) return 'female';
  if (k.includes('male') || k.includes('men')) return 'male';
  return 'unisex';
}

// ---------------------------------------------------------------------------
// Helpers: image download + upload
// ---------------------------------------------------------------------------

async function sleep(ms: number): Promise<void> {
  return new Promise((r) => setTimeout(r, ms));
}

async function downloadAndUpload(
  sourceUrl: string,
  parfumId: string,
  retries = 3,
): Promise<string | null> {
  const bucket = getStorage().bucket();

  for (let attempt = 1; attempt <= retries; attempt++) {
    try {
      const res = await fetch(sourceUrl, { signal: AbortSignal.timeout(10000) });
      if (!res.ok) {
        if (res.status === 404) return null;
        throw new Error(`HTTP ${res.status}`);
      }

      let buffer = Buffer.from(await res.arrayBuffer());
      if (buffer.length === 0) return null;

      // Optional background removal (env BG_REMOVAL=true)
      let hasAlpha = false;
      if (BG_REMOVAL_ENABLED) {
        try {
          const tmpIn = path.join(os.tmpdir(), `pscan_${parfumId}_in`);
          const tmpOut = path.join(os.tmpdir(), `pscan_${parfumId}_out.png`);
          fs.writeFileSync(tmpIn, buffer);
          execSync(`node remove-bg.cjs "${tmpIn}" "${tmpOut}"`, {
            cwd: BG_REMOVAL_CWD,
            stdio: 'pipe',
            timeout: 30000,
          });
          if (fs.existsSync(tmpOut) && fs.statSync(tmpOut).size > 0) {
            buffer = fs.readFileSync(tmpOut);
            hasAlpha = true;
          }
          // Cleanup temp files
          try { fs.unlinkSync(tmpIn); } catch { /* ignore */ }
          try { fs.unlinkSync(tmpOut); } catch { /* ignore */ }
        } catch {
          // BG removal failed — fall back to regular conversion
        }
      }

      // Convert to WebP (quality 82 — best size/perception tradeoff for 375×500 bottles)
      let sharpPipe = sharp(buffer);
      if (!hasAlpha) {
        sharpPipe = sharpPipe.flatten({ background: { r: 255, g: 255, b: 255 } });
      }
      const webpBuffer = await sharpPipe.webp({ quality: 82 }).toBuffer();

      const filePath = `parfums/${parfumId}/primary.webp`;
      const file = bucket.file(filePath);

      await file.save(webpBuffer, {
        contentType: 'image/webp',
        metadata: { cacheControl: 'public, max-age=31536000' },
      });

      const [url] = await file.getSignedUrl({
        action: 'read',
        expires: Date.now() + 1000 * 60 * 60 * 24 * 365 * 10,
      });

      return url;
    } catch (err) {
      if (attempt === retries) {
        process.stderr.write(`  img fail (${(err as Error).message.slice(0, 60)})\n`);
        return null;
      }
      await sleep(1000 * attempt);
    }
  }
  return null;
}

// ---------------------------------------------------------------------------
// Core: process one clean file
// ---------------------------------------------------------------------------

async function processFile(
  filePath: string,
  stats: ImportStats,
  delayMs: number,
): Promise<void> {
  const fileName = path.basename(filePath);

  let entries: CleanEntry[];
  try {
    entries = JSON.parse(fs.readFileSync(filePath, 'utf-8'));
  } catch {
    process.stderr.write(`  SKIP ${fileName}: parse error\n`);
    return;
  }

  if (!Array.isArray(entries) || entries.length === 0) {
    console.log(`  ${fileName.padEnd(35)} 0 entries — skip`);
    return;
  }

  const db = getFirestore();
  let imported = 0;
  let updated = 0;
  let skipped = 0;
  let errors = 0;

  for (const entry of entries) {
    const { title, brandName } = entry;
    const { nom, annee, typeParfum, genderLabel } = parseTitle(title, brandName);
    const parfumId = normaliseId(`${brandName}_${nom}`);

    if (!parfumId) {
      skipped++;
      continue;
    }

    // Update if already imported, create if not
    const docRef = db.collection('parfums').doc(parfumId);
    const existing = await docRef.get();
    if (existing.exists) {
      await docRef.update({
        popularityScore: entry.reviewCount ?? 0,
        brandLower: brandName.toLowerCase(),
        updatedAt: new Date(),
      });
      updated++;
      if (updated % 50 === 0) {
        process.stdout.write(`  ${fileName.padEnd(35)} ${String(updated).padStart(4)} updated...\r`);
      }
      continue;
    }

    try {
      // Map pyramid notes to string arrays
      const pyramid = entry.pyramid ?? {};
      const notesTete: string[] =
        entry.pyramid?.type === 'full'
          ? (pyramid.topNotes ?? []).map((n) => n.name)
          : [];
      const notesCoeur: string[] =
        entry.pyramid?.type === 'full'
          ? (pyramid.middleNotes ?? []).map((n) => n.name)
          : [];
      const notesFond: string[] =
        entry.pyramid?.type === 'full'
          ? (pyramid.baseNotes ?? []).map((n) => n.name)
          : [];
      const generalNotes: string[] = (pyramid.allNotes ?? []).map((n) => n.name);

      const familleOlactive = entry.mainAccords?.[0]?.accord ?? null;
      const mainAccords = entry.mainAccords?.map((a) => a.accord) ?? [];
      const mainAccordsPercentage: Record<string, string> = {};
      if (entry.mainAccords) {
        const maxVal = entry.mainAccords[0]?.value ?? 100;
        for (const a of entry.mainAccords) {
          mainAccordsPercentage[a.accord] = `${Math.round((a.value / maxVal) * 100)}%`;
        }
      }

      // Resolve gender (prefer gender field, fallback to parsed from title, fallback to breakout)
      const rawGender = genderNormalise(entry.gender) ?? genderNormalise(genderLabel);
      let gender = rawGender;
      if (!gender && entry.genderBreakout) {
        const gb = entry.genderBreakout;
        const male = (gb.male ?? 0) + (gb.maleUnisex ?? 0);
        const female = (gb.female ?? 0) + (gb.femaleUnisex ?? 0);
        const uni = gb.unisex ?? 0;
        gender = male > female && male > uni ? 'male' : female > male && female > uni ? 'female' : 'unisex';
      }

      const imageUrl = entry.primaryImageUrl
        ? await downloadAndUpload(entry.primaryImageUrl, parfumId)
        : null;

      await sleep(delayMs);

      const now = new Date();
      const searchKeywords = buildSearchKeywords(brandName, nom, familleOlactive ?? undefined);

      const doc = {
        nom,
        marque: brandName,
        annee: annee ?? null,
        familleOlactive: familleOlactive ?? '',
        notesTete,
        notesCoeur,
        notesFond,
        generalNotes,
        mainAccords,
        mainAccordsPercentage: Object.keys(mainAccordsPercentage).length > 0 ? mainAccordsPercentage : null,
        imageUrl: imageUrl ?? null,
        imageUrlTransparent: null,
        imageFallbacks: [],
        typeParfum: typeParfum ?? null,
        gender: gender ?? null,
        longevity: longevityString(entry.longevityAverage),
        sillage: sillageString(entry.sillageAverage),
        perfumeRating: entry.perfumeRating,
        bestRating: entry.bestRating,
        ratingCount: entry.ratingCount ?? 0,
        reviewCount: entry.reviewCount ?? 0,
        rating: entry.perfumeRating != null ? String(entry.perfumeRating) : null,
        ratingScore: entry.perfumeRating ?? null,
        priceValue: priceValueString(entry.priceValueAverage),
        popularity: null,
        popularityScore: entry.reviewCount ?? 0,
        brandLower: brandName.toLowerCase(),
        country: null,
        confidence: null,
        seasonRanking: entry.seasonBreakout
          ? Object.entries(entry.seasonBreakout)
              .filter(([k]) => ['winter', 'spring', 'summer', 'autumn', 'day', 'night'].includes(k))
              .map(([name, score]) => ({ name, score }))
          : [],
        occasionRanking: null,
        perfumers: entry.perfumers ?? [],
        longevityAverage: entry.longevityAverage,
        sillageAverage: entry.sillageAverage,
        priceValueAverage: entry.priceValueAverage,
        ratingAverage: entry.ratingAverage,
        longevityBreakout: entry.longevityBreakout ?? [],
        sillageBreakout: entry.sillageBreakout ?? [],
        priceValueBreakout: entry.priceValueBreakout ?? [],
        ratingBreakout: entry.ratingBreakout ?? [],
        genderBreakout: entry.genderBreakout ?? {},
        seasonBreakout: entry.seasonBreakout ?? {},
        relationBreakout: entry.relationBreakout ?? {},
        searchKeywords,
        source: 'seed',
        fragellaId: null,
        cachedAt: now,
        createdAt: now,
        updatedAt: now,
        imageVerified: false,
      };

      await docRef.set(doc);
      imported++;

      if (imported % 10 === 0) {
        process.stdout.write(`  ${fileName.padEnd(35)} ${String(imported).padStart(4)} imported...\r`);
      }
    } catch (err) {
      errors++;
      process.stderr.write(`  ERR ${parfumId}: ${(err as Error).message.slice(0, 80)}\n`);
    }
  }

  console.log(
    `  ${fileName.padEnd(35)} ${String(imported).padStart(5)} imported, ${String(updated).padStart(4)} updated, ${String(skipped).padStart(4)} skipped, ${String(errors).padStart(3)} errors`,
  );

  stats.imported += imported;
  stats.updated += updated;
  stats.skipped += skipped;
  stats.errors += errors;
}

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------

async function main(): Promise<void> {
  const cleanDir = path.resolve('data', 'clean');

  if (!fs.existsSync(cleanDir)) {
    console.error(`Clean directory not found: ${cleanDir}`);
    console.error('Run "npm run clean-data" first.');
    process.exit(1);
  }

  // Initialise Firebase Admin with service account key
  const projectId = process.env.FIREBASE_PROJECT_ID || 'parfumscan-60549';

  if (!fs.existsSync(SERVICE_ACCOUNT_PATH)) {
    console.error(`Service account key not found: ${SERVICE_ACCOUNT_PATH}`);
    console.error('Generate one at: https://console.firebase.google.com/project/parfumscan-60549/settings/serviceaccounts/adminsdk');
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

  console.log(`Service account:  ${SERVICE_ACCOUNT_PATH}`);
  console.log(`Firebase project: ${projectId}`);
  console.log(`Firestore host:   ${process.env.FIRESTORE_EMULATOR_HOST || 'production'}`);
  console.log(`Storage host:     ${process.env.FIREBASE_STORAGE_EMULATOR_HOST || 'production'}`);
  console.log('');

  const files = fs.readdirSync(cleanDir).filter((f) => f.endsWith('.json'));
  console.log(`Processing ${files.length} files...\n`);

  const stats: ImportStats = { fileName: '', imported: 0, updated: 0, skipped: 0, errors: 0 };
  const delayMs = 300; // delay between image downloads (ms)

  for (const file of files) {
    await processFile(path.join(cleanDir, file), stats, delayMs);
  }

  console.log(`\n${'\u2500'.repeat(58)}`);
  console.log(`Total: ${stats.imported} imported, ${stats.updated} updated, ${stats.skipped} skipped, ${stats.errors} errors`);
}

main().catch((err) => {
  console.error('Fatal error:', err);
  process.exit(1);
});
