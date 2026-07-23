// scripts/backfill-search-fields.ts — Backfill reviewCount/ratingCount/popularityScore = 0
// pour les docs où ces champs sont absents ou null.
//
// Usage: npx tsx scripts/backfill-search-fields.ts

import * as fs from 'fs';
import * as path from 'path';
import { initializeApp, getApps, cert } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';

const SERVICE_ACCOUNT_PATH = path.resolve('service-account.json');
const BATCH_SIZE = 500;

async function main(): Promise<void> {
  const projectId = process.env.FIREBASE_PROJECT_ID || 'parfumscan-60549';

  if (!fs.existsSync(SERVICE_ACCOUNT_PATH)) {
    console.error(`Service account key not found: ${SERVICE_ACCOUNT_PATH}`);
    process.exit(1);
  }

  if (getApps().length === 0) {
    const serviceAccount = JSON.parse(fs.readFileSync(SERVICE_ACCOUNT_PATH, 'utf-8'));
    initializeApp({ credential: cert(serviceAccount), projectId });
  }

  const db = getFirestore();
  const collectionRef = db.collection('parfums');

  let totalFixed = 0;
  let lastDoc: FirebaseFirestore.DocumentSnapshot | null = null;

  console.log('Backfilling missing search fields...\n');

  while (true) {
    let query: FirebaseFirestore.Query = collectionRef.limit(BATCH_SIZE);
    if (lastDoc) query = query.startAfter(lastDoc);

    const snap = await query.get();
    if (snap.empty) break;

    const batch = db.batch();
    let batchCount = 0;

    for (const doc of snap.docs) {
      const data = doc.data();
      const updates: Record<string, number> = {};

      if (!('reviewCount' in data) || data.reviewCount === null) {
        updates.reviewCount = 0;
      }
      if (!('ratingCount' in data) || data.ratingCount === null) {
        updates.ratingCount = 0;
      }
      if (!('popularityScore' in data) || data.popularityScore === null) {
        updates.popularityScore = 0;
      }

      if (Object.keys(updates).length > 0) {
        batch.set(doc.ref, updates, { merge: true });
        batchCount++;
      }
    }

    if (batchCount > 0) {
      await batch.commit();
      totalFixed += batchCount;
    }

    process.stdout.write(`  Processed ${String(totalFixed).padStart(5)} docs...\r`);

    lastDoc = snap.docs[snap.docs.length - 1];
    if (snap.docs.length < BATCH_SIZE) break;
  }

  console.log(`\nDone. Fixed ${totalFixed} docs.`);
}

main().catch((err) => {
  console.error('Backfill failed:', err);
  process.exit(1);
});
