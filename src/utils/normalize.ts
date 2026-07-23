// src/utils/normalize.ts — Utilitaires de normalisation des chaînes

export const STOP_WORDS = new Set([
  'de', 'la', 'le', 'eau', 'pour', 'l', 'd', 'du', 'des', 'et',
  'a', 'un', 'une', 'en', 'sur', 'par', 'au', 'aux', 'les',
  'dans', 'avec', 'sans', 'sous', 'ou', 'est', 'ce', 'son', 'sa',
  'the', 'of', 'and', 'for', 'by', 'to', 'in', 'is', 'it', 'on',
]);

export function normalize(s: string): string {
  return s.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().replace(/[^a-z0-9]+/g, '_').replace(/^_|_$/g, '');
}

export function normalizeId(s: string): string {
  return normalize(s);
}

export function generateTrigrams(word: string): string[] {
  const padded = `$${word}$`;
  const out: string[] = [];
  for (let i = 0; i < padded.length - 2; i++) {
    out.push(padded.substring(i, i + 3));
  }
  return out;
}

export function buildSearchKeywords(marque: string, nom: string, familleOlactive?: string): string[] {
  const m = normalize(marque);
  const n = normalize(nom);
  const tokens = new Set<string>();

  const addWordAndPrefixes = (word: string) => {
    if (word.length < 2 || STOP_WORDS.has(word)) return;
    tokens.add(word);
    for (let i = 3; i < word.length; i++) {
      tokens.add(word.slice(0, i));
    }
    for (const tg of generateTrigrams(word)) {
      tokens.add(`~${tg}`);
    }
  };

  m.split('_').filter(Boolean).forEach(addWordAndPrefixes);
  n.split('_').filter(Boolean).forEach(addWordAndPrefixes);

  tokens.add(`${m}_${n}`);
  tokens.add(m);
  tokens.add(n);

  if (familleOlactive) {
    const famWords = normalize(familleOlactive).split('_').filter(Boolean);
    for (const w of famWords) {
      addWordAndPrefixes(w);
    }
  }

  return [...tokens];
}
