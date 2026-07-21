// src/services/firestore.ts — CRUD collection `parfums` (catalogue 100% Firestore)

import { getFirestore, collection, doc, query, where, orderBy, limit, startAfter, getDocs, getDoc, addDoc, setDoc, updateDoc, deleteDoc, writeBatch, onSnapshot } from '@react-native-firebase/firestore';
import type { QuerySnapshot, DocumentSnapshot, DocumentData, DocumentReference, QueryDocumentSnapshot } from '@react-native-firebase/firestore';
import type { Parfum } from '../models';
import { normalize, STOP_WORDS, generateTrigrams } from '../utils/normalize';

const db = getFirestore();
const parfumsCol = () => collection(db, 'parfums');


// ─── Type utilitaire pour le scoring local de searchParfumsCached ───

type ScoredDoc = { id: string; _score: number; _pop: number; searchKeywords?: string[] } & Record<string, unknown>;

class LRUCache {
  private map = new Map<string, Parfum[]>();
  private maxSize: number;

  constructor(maxSize = 200) {
    this.maxSize = maxSize;
  }

  get(key: string): Parfum[] | undefined {
    const val = this.map.get(key);
    if (val !== undefined) {
      this.map.delete(key);
      this.map.set(key, val);
    }
    return val;
  }

  set(key: string, value: Parfum[]): void {
    if (this.map.has(key)) {
      this.map.delete(key);
    } else if (this.map.size >= this.maxSize) {
      const first = this.map.keys().next().value;
      if (first !== undefined) this.map.delete(first);
    }
    this.map.set(key, value);
  }

  has(key: string): boolean {
    return this.map.has(key);
  }

  entries(): IterableIterator<[string, Parfum[]]> {
    return this.map.entries();
  }
}

const _searchCache = new LRUCache(200);

function generateQueryTrigrams(query: string): string[] {
  const words = normalize(query).split('_').filter(w => w.length >= 2);
  const trigrams = new Set<string>();
  for (const word of words) {
    for (const tg of generateTrigrams(word)) {
      trigrams.add(tg);
    }
  }
  return [...trigrams];
}

// ——— Mapper Firestore → Parfum (Timestamp → Date) ———

function docToParfum(d: DocumentSnapshot<DocumentData, DocumentData>): Parfum {
  const data = d.data?.() ?? ({} as Record<string, unknown>);
  const id = d.id ?? (data.id as string);
  return {
    id,
    nom: data.nom as string,
    marque: data.marque as string,
    annee: data.annee as number | undefined,
    familleOlactive: data.familleOlactive as string,
    notesTete: (data.notesTete as string[]) ?? [],
    notesCoeur: (data.notesCoeur as string[]) ?? [],
    notesFond: (data.notesFond as string[]) ?? [],
    imageUrl: data.imageUrl as string | undefined,
    bestPrice: data.bestPrice as number | undefined,
    referencePrice: data.referencePrice as number | undefined,
    offers: data.offers as Parfum['offers'],
    typeParfum: data.typeParfum as string | null | undefined,
    source: data.source as Parfum['source'],
    cachedAt: (data.cachedAt as { toDate?: () => Date })?.toDate?.() ?? (data.cachedAt as Date | undefined),
    imageVerified: data.imageVerified as boolean | undefined,
    searchKeywords: data.searchKeywords as string[] | undefined,
    purchaseUrl: data.purchaseUrl as string | null | undefined,
    mainAccords: data.mainAccords as string[] | undefined,
    longevity: data.longevity as string | null | undefined,
    sillage: data.sillage as string | null | undefined,
    gender: data.gender as string | null | undefined,
    rating: data.rating as string | null | undefined,
    popularity: data.popularity as string | null | undefined,
    popularityScore: data.popularityScore as number | undefined,
    ratingScore: data.ratingScore as number | undefined,
    reviewCount: data.reviewCount as number | undefined,
    ratingCount: data.ratingCount as number | undefined,
    priceValue: data.priceValue as string | null | undefined,
    country: data.country as string | undefined,
    mainAccordsPercentage: data.mainAccordsPercentage as Record<string, string> | undefined,
    generalNotes: data.generalNotes as string[] | undefined,
    confidence: data.confidence as string | undefined,
    seasonRanking: data.seasonRanking as { name: string; score: number }[] | undefined,
    occasionRanking: data.occasionRanking as { name: string; score: number }[] | undefined,
    similarIds: data.similarIds as string[] | undefined,
    similarIdsCachedAt: (data.similarIdsCachedAt as { toDate?: () => Date })?.toDate?.() ?? (data.similarIdsCachedAt as Date | undefined),
    createdAt: (data.createdAt as { toDate?: () => Date })?.toDate?.() ?? (data.createdAt as Date),
    updatedAt: (data.updatedAt as { toDate?: () => Date })?.toDate?.() ?? (data.updatedAt as Date),
  };
}

export function onParfums(cb: (parfums: Parfum[]) => void): () => void {
  const q = query(parfumsCol(), orderBy('updatedAt', 'desc'));
  return onSnapshot(q, (snap) => { if (!snap) { cb([]); return; } cb(snap.docs.map(docToParfum)); }, (err) => { console.warn('[firestore] onParfums error:', err.message); cb([]); });
}

export async function getParfumById(id: string): Promise<Parfum | undefined> {
  const snap = await getDoc(doc(parfumsCol(), id));
  if (!snap.exists()) return undefined;
  return docToParfum(snap);
}

export function onParfumsByMarque(marque: string, cb: (parfums: Parfum[]) => void): () => void {
  const q = query(parfumsCol(), where('marque', '>=', marque), where('marque', '<=', marque + '\uf8ff'), orderBy('marque'));
  return onSnapshot(q, (snap) => {
    cb(snap.docs.map(docToParfum)
      .filter((p: Parfum) => p.marque.toLowerCase().includes(marque.toLowerCase())));
  }, (err) => { console.warn('[firestore] onParfumsByMarque error:', err.message); cb([]); });
}

export async function createParfum(fragranceData: Omit<Parfum, 'id' | 'createdAt' | 'updatedAt'>): Promise<DocumentReference<DocumentData, DocumentData>> {
  const now = new Date();
  return addDoc(parfumsCol(), { ...fragranceData, createdAt: now, updatedAt: now });
}

export async function updateParfum(id: string, fragranceData: Partial<Omit<Parfum, 'id' | 'createdAt' | 'updatedAt'>>): Promise<void> {
  await updateDoc(doc(parfumsCol(), id), { ...fragranceData, updatedAt: new Date() });
}

export async function deleteParfum(id: string): Promise<void> {
  await deleteDoc(doc(parfumsCol(), id));
}

/** Supprime TOUS les parfums de la collection Firestore (reset cache complet).
 *  Utilise des batchs de 500 docs (limite Firestore). */
export async function deleteAllCachedParfums(): Promise<number> {
  const snap = await getDocs(query(parfumsCol(), limit(500)));
  if (snap.empty) return 0;

  let totalDeleted = 0;

  let currentSnap: QuerySnapshot<DocumentData, DocumentData> = snap;
  while (!currentSnap.empty) {
    const b = writeBatch(db);
    for (const d of currentSnap.docs) {
      b.delete(d.ref);
    }
    await b.commit();
    totalDeleted += currentSnap.docs.length;
    const lastQueryDoc = currentSnap.docs[currentSnap.docs.length - 1];
    currentSnap = await getDocs(query(parfumsCol(), limit(500), startAfter(lastQueryDoc)));
  }

  return totalDeleted;
}



export async function searchParfumsCached(queryStr: string): Promise<Parfum[]> {
  const q = queryStr.trim().toLowerCase();
  if (q.length < 2) return [];

  const cached = _searchCache.get(q);
  if (cached !== undefined) return cached;

  const rawTokens = q.split(/\s+/).filter(t => t.length >= 2);
  if (rawTokens.length === 0) return [];

  const searchTokens = rawTokens
    .flatMap(t => normalize(t).split('_'))
    .filter(t => t.length >= 2 && !STOP_WORDS.has(t))
    .slice(0, 10);

  if (searchTokens.length === 0) {
    _searchCache.set(q, []);
    return [];
  }

  const multiToken = searchTokens.length >= 2;
  const normalizedQ = normalize(q);

  const _scoreDocs = (docs: ScoredDoc[]): Parfum[] => {
    const scored = docs.map((scoredDoc) => {
      const kw = (scoredDoc.searchKeywords ?? []) as string[];
      let matchScore = 0;
      for (const token of searchTokens) {
        let best: string | undefined;
        for (let i = 0; i < kw.length; i++) {
          const k = kw[i];
          if (!k.startsWith('~') && k.startsWith(token) && (!best || k.length < best.length)) {
            best = k;
          }
        }
        if (best) {
          matchScore += token.length / best.length;
        }
      }
      const exactMatch = multiToken && kw.includes(normalizedQ) ? 10 : 0;
      const popBonus = scoredDoc._pop > 0 ? Math.log(scoredDoc._pop + 1) / 2 : 0;
      return { ...scoredDoc, _score: matchScore + exactMatch + popBonus };
    });

    const sorted = scored
      .filter((d) => d._score > 0)
      .sort((a, b) => {
        const diff = b._score - a._score;
        if (Math.abs(diff) < 0.001) return b._pop - a._pop;
        return diff;
      });

    return sorted.slice(0, 50).map(({ _score, _pop, ...rest }) => rest as unknown as Parfum);
  };

  // Prefix cache: if a shorter query is in cache, re-score locally instead of hitting Firestore.
  // Only use prefix cache when the new query has the same number of words — otherwise
  // the cached results come from fewer tokens and the target may be missing entirely.
  if (rawTokens.length >= 2) {
    for (const [key, results] of _searchCache.entries()) {
      const keyTokens = key.split(/\s+/).filter(t => t.length >= 2).length;
      if (results.length > 0 && q.startsWith(key) && q !== key && rawTokens.length <= keyTokens) {
        const cachedDocs: ScoredDoc[] = results.map((p) => {
          const d = p as unknown as Record<string, unknown>;
          const rCount = (d.reviewCount as number) ?? 0;
          const ratCount = (d.ratingCount as number) ?? 0;
          return { id: p.id, _score: 0, _pop: Math.max(rCount, ratCount, p.popularityScore ?? 0), ...d } as ScoredDoc;
        });
        const reScored = _scoreDocs(cachedDocs);
        let deduped: Parfum[];
        try { deduped = _dedupByMarqueNom(reScored); } catch { deduped = reScored; }
        _searchCache.set(q, deduped);
        if (__DEV__) console.log(`[search] "${q}" — prefix cache hit (from "${key}", ${deduped.length} results)`);
        return deduped;
      }
    }
  }

  const t0 = Date.now();

  try {
    let allResults: Parfum[] = [];

    if (!multiToken) {
      const snap = await getDocs(query(parfumsCol(), where('searchKeywords', 'array-contains', searchTokens[0]), orderBy('reviewCount', 'desc'), limit(100)));

      const t1 = Date.now();

      if (!snap.empty) {
        const docs: ScoredDoc[] = snap.docs.map((d) => {
          const data = d.data() as Record<string, unknown>;
          const reviewCount = (data.reviewCount as number) ?? 0;
          const ratingCount = (data.ratingCount as number) ?? 0;
          const popularityScore = (data.popularityScore as number) ?? 0;
          return { id: d.id, _score: 0, _pop: Math.max(reviewCount, ratingCount, popularityScore), ...data } as ScoredDoc;
        });

        allResults = _scoreDocs(docs);
        const t2 = Date.now();
        if (__DEV__) console.log(`[search] "${q}" — Firestore:${t1 - t0}ms scoring:${t2 - t1}ms total:${t2 - t0}ms (${allResults.length} results)`);
      }
    } else {
      const seen = new Set<string>();
      const allDocs: ScoredDoc[] = [];

      const snaps = await Promise.all(
        searchTokens.map(token =>
          getDocs(query(parfumsCol(), where('searchKeywords', 'array-contains', token), orderBy('reviewCount', 'desc'), limit(300)))
        )
      );

      for (const s of snaps) {
        for (const d of s.docs) {
          if (!seen.has(d.id)) {
            seen.add(d.id);
            const data = d.data() as Record<string, unknown>;
            const reviewCount = (data.reviewCount as number) ?? 0;
            const ratingCount = (data.ratingCount as number) ?? 0;
            const popularityScore = (data.popularityScore as number) ?? 0;
            allDocs.push({ id: d.id, _score: 0, _pop: Math.max(reviewCount, ratingCount, popularityScore), ...data } as ScoredDoc);
          }
        }
      }

      allResults = _scoreDocs(allDocs);
      const t2 = Date.now();
      if (__DEV__) console.log(`[search] "${q}" — Firestore:${t2 - t0}ms (${searchTokens.length} queries, ${allResults.length} results)`);
    }

    // Fuzzy trigram fallback — triggered when primary returns < 5 results
    if (allResults.length < 5) {
      const queryTrigrams = generateQueryTrigrams(q);
      if (queryTrigrams.length > 0) {
        const trigramTokens = queryTrigrams.map(tg => `~${tg}`);
        try {
          const fuzzySnap = await getDocs(query(
            parfumsCol(),
            where('searchKeywords', 'array-contains-any', trigramTokens.slice(0, 30)),
            orderBy('reviewCount', 'desc'),
            limit(200)
          ));

          const seenIds = new Set(allResults.map(r => r.id));
          const fuzzyResults = fuzzySnap.docs
            .map(docToParfum)
            .filter(p => !seenIds.has(p.id))
            .map(p => {
              const docTrigrams = (p.searchKeywords ?? [])
                .filter(k => k.startsWith('~'))
                .map(k => k.slice(1));
              const intersection = queryTrigrams.filter(t => docTrigrams.includes(t)).length;
              const denom = queryTrigrams.length + docTrigrams.length - intersection;
              const jaccard = denom > 0 ? intersection / denom : 0;
              return { p, score: jaccard };
            })
            .filter(({ score }) => score > 0.25)
            .sort((a, b) => b.score - a.score)
            .slice(0, 10)
            .map(({ p }) => p);

          if (fuzzyResults.length > 0) {
            if (__DEV__) console.log(`[search] "${q}" — fuzzy fallback: ${fuzzyResults.length} results`);
            allResults = [...allResults, ...fuzzyResults];
          }
        } catch { console.warn('[firestore] fuzzy fallback failed'); }
      }
    }

    const deduped = _dedupByMarqueNom(allResults);
    _searchCache.set(q, deduped);
    return deduped;
  } catch (err: unknown) {
    console.warn('[firestore] searchParfumsCached failed:', (err as Error)?.message ?? String(err));
    return [];
  }
}

function _dedupByMarqueNom<T extends { marque: string; nom: string }>(items: T[]): T[] {
  try {
    const seen = new Set<string>();
    return items.filter((item) => {
      const m = item?.marque ?? '';
      const n = item?.nom ?? '';
      const key = `${normalize(m)}_${normalize(n)}`;
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });
  } catch {
    return items;
  }
}

/** Recupere les parfums les plus populaires depuis le cache Firestore. */
export async function getPopularParfums(limitCount: number = 6): Promise<Parfum[]> {
  try {
    const snap = await getDocs(query(parfumsCol(), orderBy('popularityScore', 'desc'), limit(limitCount)));
    if (snap.empty) return [];
    return snap.docs.map(docToParfum);
  } catch {
    return [];
  }
}

/** Suggestions personnalisees basees sur l'historique de scans et favoris. */
export async function getPersonalizedSuggestions(
  uid: string,
  limitCount: number = 16,
): Promise<Parfum[]> {
  let favDocs: QueryDocumentSnapshot<DocumentData, DocumentData>[] = [];
  let scanDocs: QueryDocumentSnapshot<DocumentData, DocumentData>[] = [];

  try {
    const [favSnap, scanSnap] = await Promise.all([
      getDocs(collection(db, `users/${uid}/favoris`)),
      getDocs(collection(db, `users/${uid}/scans`)),
    ]);
    favDocs = favSnap.docs;
    scanDocs = scanSnap.docs;
  } catch {
    return [];
  }

  const familyScores: Record<string, number> = {};
  const brandScores: Record<string, number> = {};
  const seenIds = new Set<string>();

  for (const queryDoc of [...favDocs, ...scanDocs]) {
    const docData = queryDoc.data();
    const f = docData.familleOlactive as string | undefined;
    const m = docData.marque as string | undefined;
    const pid = docData.parfumId as string | undefined;
    if (f) familyScores[f] = (familyScores[f] || 0) + 1;
    if (m) brandScores[m] = (brandScores[m] || 0) + 1;
    if (pid) seenIds.add(pid);
  }

  const topFamilies = Object.entries(familyScores)
    .sort(([, a], [, b]) => b - a)
    .slice(0, 3)
    .map(([f]) => f);

  if (topFamilies.length === 0) return [];

  let candidates: Parfum[] = [];
  try {
    const familySnap = await getDocs(query(parfumsCol(), where('familleOlactive', 'in', topFamilies), limit(20)));
    candidates = familySnap.docs.map(docToParfum);
  } catch (e: unknown) { console.warn('[firestore] getSimilarParfums family query failed:', (e as Error)?.message ?? String(e)); }

  let popular: Parfum[] = [];
  try {
    popular = await getPopularParfums(20);
  } catch (e: unknown) { console.warn('[firestore] getSimilarParfums popular fallback failed:', (e as Error)?.message ?? String(e)); }

  const unique = new Map<string, Parfum>();
  for (const p of candidates) unique.set(p.id, p);
  for (const p of popular) {
    if (!unique.has(p.id)) unique.set(p.id, p);
  }
  const all = [...unique.values()];

  const scored = all
    .filter((p) => !seenIds.has(p.id) && p.imageUrl)
    .map((p) => {
      let score = 0;
      if (p.familleOlactive && familyScores[p.familleOlactive]) {
        score += familyScores[p.familleOlactive] * 3;
      }
      if (p.marque && brandScores[p.marque]) {
        score += brandScores[p.marque] * 2;
      }
      score += (p.popularityScore ?? 0) / 20;
      return { p, score };
    });

  scored.sort((a, b) => b.score - a.score);

  return scored.slice(0, limitCount).map((x) => x.p);
}

/** Parfums similaires par famille olfactive (utilisé par la fiche détail). */
function seededShuffle<T>(arr: T[], seed: number): T[] {
  const shuffled = [...arr];
  let s = seed;
  for (let i = shuffled.length - 1; i > 0; i--) {
    s = (s * 16807 + 0) % 2147483647;
    const j = s % (i + 1);
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }
  return shuffled;
}

export async function getSimilarParfums(mainAccords: string[], excludeId: string, limitCount: number = 6): Promise<Parfum[]> {
  if (!mainAccords || mainAccords.length === 0) return [];

  try {
    const snap = await getDocs(query(parfumsCol(), where('mainAccords', 'array-contains-any', mainAccords.slice(0, 10)), orderBy('popularityScore', 'desc'), limit(200)));

    if (snap.empty) return [];

    const today = Math.floor(Date.now() / 86400000);

    const scored = snap.docs
      .map(docToParfum)
      .filter((p) => p.id !== excludeId && p.imageUrl)
      .map((p) => {
        const shared = (p.mainAccords ?? []).filter((a) => mainAccords.includes(a)).length;
        return { p, _score: shared * 10 + (p.popularityScore ?? 0) / 100 };
      });

    scored.sort((a, b) => b._score - a._score);

    const pool = scored.slice(0, 40).map((s) => s.p);

    return seededShuffle(pool, today).slice(0, limitCount);
  } catch {
    return [];
  }
}

/** Recherche optimisée pour le scan — exploite la structure marque+nom fournie par GPT-4o
 *  pour booster le score du match exact au-dessus des variants/flankers.
 *  Le catalogue (exploration) utilise `searchParfumsCached` directement. */
export async function searchParfumFromScan(marque: string | null, nom: string | null): Promise<Parfum[]> {
  if (!marque && !nom) return [];

  const query = [marque, nom].filter(Boolean).join(' ').trim();
  if (query.length < 2) return [];

  let results: Parfum[];
  try {
    results = await searchParfumsCached(query);
  } catch {
    return [];
  }

  if (results.length === 0) return [];

  const normMarque = marque ? normalize(marque) : null;
  const normNom = nom ? normalize(nom) : null;

  const rescored = results.map((p) => {
    const docMarque = normalize(p.marque || '');
    const docNom = normalize(p.nom || '');
    // Ne pas polluer l'objet Parfum original
    const pWithScore = p as Parfum & { _scanScore?: number };
    let bonus = 0;

    if (normNom) {
      if (docNom === normNom) {
        bonus += 50;
      } else if (docNom.includes(normNom) || normNom.includes(docNom)) {
        bonus += 25;
      }
    }

    if (normMarque) {
      if (docMarque === normMarque) {
        bonus += 15;
      } else if (docMarque.includes(normMarque) || normMarque.includes(docMarque)) {
        bonus += 8;
      }
    }

    pWithScore._scanScore = bonus;
    return pWithScore;
  });

  rescored.sort((a, b) => {
    const diff = (b._scanScore ?? 0) - (a._scanScore ?? 0);
    if (diff !== 0) return diff;
    const aPrice = a.bestPrice ?? Infinity;
    const bPrice = b.bestPrice ?? Infinity;
    return aPrice - bPrice;
  });

  return _dedupByMarqueNom(rescored);
}
