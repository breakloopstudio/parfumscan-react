import * as path from 'path';
import { initializeApp, getApps, cert } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';

const SERVICE_ACCOUNT_PATH = path.resolve('service-account.json');

function normaliseTexte(s: string): string {
  return s
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase();
}

function normaliseTokens(s: string): string {
  return normaliseTexte(s).replace(/[^a-z0-9]+/g, '_').replace(/^_|_$/g, '');
}

function buildSearchKeywords(marque: string, nom: string): string[] {
  const m = normaliseTokens(marque);
  const n = normaliseTokens(nom);
  const tokens = new Set<string>();

  const addWordAndPrefixes = (word: string) => {
    tokens.add(word);
    for (let i = 3; i < word.length; i++) {
      tokens.add(word.slice(0, i));
    }
  };

  m.split('_')
    .filter(Boolean)
    .forEach((t) => addWordAndPrefixes(t));
  n.split('_')
    .filter(Boolean)
    .forEach((t) => addWordAndPrefixes(t));

  tokens.add(`${m}_${n}`);
  tokens.add(`${m} ${n}`.trim());
  tokens.add(m);

  return [...tokens];
}

async function main() {
  if (!getApps().length) {
    initializeApp({ credential: cert(SERVICE_ACCOUNT_PATH) });
  }
  const db = getFirestore();

  console.log('Reading parfums collection...');
  const snap = await db.collection('parfums').select('marque', 'nom').get();
  const total = snap.size;
  console.log(`Found ${total} documents.`);

  let updated = 0;
  let batch = db.batch();
  let batchCount = 0;
  const BATCH_SIZE = 450;

  for (const doc of snap.docs) {
    const { marque, nom } = doc.data() as { marque: string; nom: string };
    const searchKeywords = buildSearchKeywords(marque, nom);

    batch.update(doc.ref, { searchKeywords });
    batchCount++;
    updated++;

    if (batchCount >= BATCH_SIZE) {
      await batch.commit();
      batch = db.batch();
      batchCount = 0;
      process.stdout.write(`  ${String(updated).padStart(5)}/${total} updated...\r`);
    }
  }

  if (batchCount > 0) {
    await batch.commit();
  }

  console.log(`\nDone. ${updated}/${total} documents updated.`);
}

main().catch((err) => {
  console.error('Migration failed:', err);
  process.exit(1);
});
