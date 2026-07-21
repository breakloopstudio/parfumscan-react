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

function buildSearchKeywords(marque: string, nom: string, familleOlactive?: string): string[] {
  const STOP_WORDS_MIG = new Set([
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
    if (STOP_WORDS_MIG.has(word)) return;
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
  tokens.add(`${m} ${n}`.trim());
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

async function main() {
  if (!getApps().length) {
    initializeApp({ credential: cert(SERVICE_ACCOUNT_PATH) });
  }
  const db = getFirestore();

  console.log('Reading parfums collection...');
  const snap = await db.collection('parfums').select('marque', 'nom', 'familleOlactive').get();
  const total = snap.size;
  console.log(`Found ${total} documents.`);

  let updated = 0;
  let batch = db.batch();
  let batchCount = 0;
  const BATCH_SIZE = 450;

  for (const doc of snap.docs) {
    const { marque, nom, familleOlactive } = doc.data() as { marque: string; nom: string; familleOlactive?: string };
    const searchKeywords = buildSearchKeywords(marque, nom, familleOlactive);

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
