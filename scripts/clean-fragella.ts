// scripts/clean-fragella.ts — Supprime tous les parfums importés via Fragella (source: fragella-cached)
// Usage : npx tsx scripts/clean-fragella.ts

import { initializeApp, getApps, cert } from 'firebase-admin/app';
import { getFirestore, FieldValue } from 'firebase-admin/firestore';
import * as path from 'path';

const SERVICE_ACCOUNT_PATH = path.resolve('service-account.json');

if (!getApps().length) {
  initializeApp({
    credential: cert(SERVICE_ACCOUNT_PATH),
    storageBucket: 'parfumscan-95803.firebasestorage.app',
  });
}

const db = getFirestore();
const BATCH_SIZE = 400;

async function deleteFragellaParfums(): Promise<void> {
  console.log('🔍 Recherche des parfums fragella-cached...');

  const snap = await db.collection('parfums')
    .where('source', '==', 'fragella-cached')
    .get();

  const total = snap.size;

  if (total === 0) {
    console.log('✅ Aucun parfum fragella-cached trouvé.');
    return;
  }

  console.log(`🗑️  ${total} parfums fragella-cached à supprimer...`);

  let deleted = 0;
  let batch = db.batch();
  let batchCount = 0;

  for (const doc of snap.docs) {
    batch.delete(doc.ref);
    batchCount++;
    deleted++;

    if (batchCount >= BATCH_SIZE) {
      await batch.commit();
      console.log(`   ${deleted}/${total} supprimés...`);
      batch = db.batch();
      batchCount = 0;
    }
  }

  if (batchCount > 0) {
    await batch.commit();
    console.log(`   ${deleted}/${total} supprimés.`);
  }

  console.log('✅ Nettoyage terminé.');
}

deleteFragellaParfums().catch((err) => {
  console.error('❌ Erreur:', err);
  process.exit(1);
});
