// scripts/audit-search-fields.ts — Audit data integrity: reviewCount, ratingCount, popularityScore
// Vérifie que tous les docs parfums ont ces champs (Firestore orderBy exclut les docs sans le champ).
// Sortie: comptes (missing, null, présent) par champ.
//
// Usage: npx tsx scripts/audit-search-fields.ts

import * as fs from 'fs';
import * as path from 'path';
import { initializeApp, getApps, cert } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';

const SERVICE_ACCOUNT_PATH = path.resolve('service-account.json');
const BATCH_SIZE = 500;

interface ChampsCounts {
  total: number;
  neverWritten: number;
  nullValue: number;
  present: number;
}

interface AuditResult {
  totalDocs: number;
  reviewCount: ChampsCounts;
  ratingCount: ChampsCounts;
  popularityScore: Omit<ChampsCounts, 'present'> & { zeroValue: number; value: number };
  docsWithAllMissing: number;
}

async function main(): Promise<void> {
  // Init Firestore
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
    });
  }

  const db = getFirestore();
  const result: AuditResult = {
    totalDocs: 0,
    reviewCount: { total: 0, neverWritten: 0, nullValue: 0, present: 0 },
    ratingCount: { total: 0, neverWritten: 0, nullValue: 0, present: 0 },
    popularityScore: { total: 0, neverWritten: 0, nullValue: 0, zeroValue: 0, value: 0 },
    docsWithAllMissing: 0,
  };

  console.log('Auditing parfums collection: reviewCount, ratingCount, popularityScore...\n');

  const collectionRef = db.collection('parfums');
  let lastDoc: FirebaseFirestore.DocumentSnapshot | null = null;
  let page = 0;

  while (true) {
    let query: FirebaseFirestore.Query = collectionRef.limit(BATCH_SIZE);
    if (lastDoc) {
      query = query.startAfter(lastDoc);
    }

    const snap = await query.get();
    if (snap.empty) break;

    page++;
    for (const doc of snap.docs) {
      result.totalDocs++;
      const data = doc.data();

      // reviewCount
      if (!('reviewCount' in data)) {
        result.reviewCount.neverWritten++;
      } else if (data.reviewCount === null) {
        result.reviewCount.nullValue++;
      } else {
        result.reviewCount.present++;
      }

      // ratingCount
      if (!('ratingCount' in data)) {
        result.ratingCount.neverWritten++;
      } else if (data.ratingCount === null) {
        result.ratingCount.nullValue++;
      } else {
        result.ratingCount.present++;
      }

      // popularityScore
      if (!('popularityScore' in data)) {
        result.popularityScore.neverWritten++;
      } else if (data.popularityScore === null) {
        result.popularityScore.nullValue++;
      } else if (data.popularityScore === 0) {
        result.popularityScore.zeroValue++;
      } else {
        result.popularityScore.value++;
      }

      // Doc invisible à toutes les recherches
      if (result.reviewCount.neverWritten === result.reviewCount.total ? false : !('reviewCount' in data) || data.reviewCount == null) {
        // already counted correctly above, just compute cross-product at end
      }
    }

    const pct = ((result.totalDocs / 25000) * 100).toFixed(0);
    process.stdout.write(`  Page ${page} — ${result.totalDocs} docs (~${pct}%)\r`);

    lastDoc = snap.docs[snap.docs.length - 1];

    if (snap.docs.length < BATCH_SIZE) break;
  }

  // Compute docs with ALL search-critical fields missing/null
  result.docsWithAllMissing = 0;
  // On re-query? No — we computed per-field. Just flag for manual fix.
  // For now, report each field independently; the "all missing" requires a second pass.
  // Simplification: count docs where reviewCount is absent/null => those are invisible

  const invisibleReviewCount = result.reviewCount.neverWritten + result.reviewCount.nullValue;
  const invisibleRatingCount = result.ratingCount.neverWritten + result.ratingCount.nullValue;
  const invisiblePopularityScore = result.popularityScore.neverWritten + result.popularityScore.nullValue;

  console.log('\n');
  console.log('═'.repeat(60));
  console.log(`Total parfums: ${result.totalDocs}`);
  console.log('═'.repeat(60));
  console.log('');
  console.log('Field            │ Absent  │ null    │ zero    │ present │ ─────────────────');
  console.log(`reviewCount      │ ${String(invisibleReviewCount - result.reviewCount.nullValue).padStart(6)} │ ${String(result.reviewCount.nullValue).padStart(6)} │ ${''.padStart(6)} │ ${String(result.reviewCount.present).padStart(5)} │ ${invisibleReviewCount > 0 ? '⚠ DOCS INVISIBLES A orderBy!' : '✓'}`);
  console.log(`ratingCount      │ ${String(invisibleRatingCount - result.ratingCount.nullValue).padStart(6)} │ ${String(result.ratingCount.nullValue).padStart(6)} │ ${''.padStart(6)} │ ${String(result.ratingCount.present).padStart(5)} │`);
  console.log(`popularityScore  │ ${String(result.popularityScore.neverWritten).padStart(6)} │ ${String(result.popularityScore.nullValue).padStart(6)} │ ${String(result.popularityScore.zeroValue).padStart(6)} │ ${String(result.popularityScore.value).padStart(5)} │ ${invisiblePopularityScore > 0 ? '⚠ DOCS INVISIBLES A orderBy (similarParfums)!' : '✓'}`);

  if (invisibleReviewCount > 0) {
    console.log('');
    console.log(`⚠ ${invisibleReviewCount} docs are INVISIBLE to ALL search queries (mono, multi, fuzzy).`);
    console.log('  Run a backfill script to fix: set reviewCount = 0, ratingCount = 0, popularityScore = 0.');
  }

  if (invisiblePopularityScore > 0) {
    console.log(`⚠ ${invisiblePopularityScore} docs are INVISIBLE to getSimilarParfums (orderBy popularityScore).`);
  }

  console.log('');
  console.log('Done.');
}

main().catch((err) => {
  console.error('Audit failed:', err);
  process.exit(1);
});
