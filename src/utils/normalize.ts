// src/utils/normalize.ts — Utilitaires de normalisation des chaînes

export function normalize(s: string): string {
  return s.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().replace(/[^a-z0-9]+/g, '_').replace(/^_|_$/g, '');
}

export function normalizeId(s: string): string {
  return normalize(s);
}

export function buildSearchKeywords(marque: string, nom: string): string[] {
  const m = normalize(marque);
  const n = normalize(nom);
  const tokens = new Set<string>();

  const addWordAndPrefixes = (word: string) => {
    tokens.add(word);
    for (let i = 3; i < word.length; i++) {
      tokens.add(word.slice(0, i));
    }
  };

  m.split('_').filter(Boolean).forEach(addWordAndPrefixes);
  n.split('_').filter(Boolean).forEach(addWordAndPrefixes);

  tokens.add(`${m}_${n}`);
  tokens.add(`${m} ${n}`.trim());
  tokens.add(m);

  return [...tokens];
}
