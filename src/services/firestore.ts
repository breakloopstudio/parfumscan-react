// src/services/firestore.ts — CRUD collection `parfums` (catalogue 100% Firestore)

import { getFirestore, collection, doc, query, where, orderBy, limit, startAfter, getDocs, getDoc, addDoc, setDoc, updateDoc, deleteDoc, writeBatch, onSnapshot } from '@react-native-firebase/firestore';
import type { QuerySnapshot, DocumentSnapshot, DocumentData, DocumentReference, QueryDocumentSnapshot } from '@react-native-firebase/firestore';
import type { Parfum } from '../models';

const db = getFirestore();
const parfumsCol = () => collection(db, 'parfums');


// ─── Type utilitaire pour le scoring local de searchParfumsCached ───

type ScoredDoc = { id: string; _score: number; searchKeywords?: string[] } & Record<string, unknown>;

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
    priceValue: data.priceValue as string | null | undefined,
    country: data.country as string | undefined,
    mainAccordsPercentage: data.mainAccordsPercentage as Record<string, string> | undefined,
    generalNotes: data.generalNotes as string[] | undefined,
    confidence: data.confidence as string | undefined,
    seasonRanking: data.seasonRanking as { name: string; score: number }[] | undefined,
    occasionRanking: data.occasionRanking as { name: string; score: number }[] | undefined,
    similarIds: data.similarIds as string[] | undefined,
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
  const q = query(parfumsCol(), where('marque', '>=', marque), where('marque', '<=', marque + '\uf8ff'));
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

  const tokens = q.split(/\s+/).filter(t => t.length >= 2);
  if (tokens.length === 0) return [];

  const searchTokens = tokens.slice(0, 10);

  try {
    const snap = await getDocs(query(parfumsCol(), where('searchKeywords', 'array-contains-any', searchTokens), limit(200)));

    if (snap.empty) return [];

    const docs: ScoredDoc[] = snap.docs.map((d) => ({ id: d.id, _score: 0, ...d.data() } as ScoredDoc));

    const scored = docs.map((scoredDoc: ScoredDoc) => {
      const kw = (scoredDoc.searchKeywords ?? []) as string[];
      let matchScore = 0;
      for (const token of searchTokens) {
        const best = kw
          .filter(k => k.startsWith(token))
          .sort((a, b) => a.length - b.length)[0];
        if (best) {
          matchScore += token.length / best.length;
        }
      }
      const exactMatch = kw.includes(q) ? 10 : 0;
      const reviewBonus = typeof scoredDoc.reviewCount === 'number'
        ? Math.log(scoredDoc.reviewCount + 1) / 8
        : 0;
      return { ...scoredDoc, _score: matchScore + exactMatch + reviewBonus };
    });

    return scored
      .filter((scoredDoc: ScoredDoc) => scoredDoc._score > 0)
      .sort((a: ScoredDoc, b: ScoredDoc) => b._score - a._score)
      .slice(0, 15)
      .map(({ _score, ...rest }: ScoredDoc) => rest as unknown as Parfum);
  } catch (err: unknown) {
    console.warn('[firestore] searchParfumsCached failed:', (err as Error)?.message ?? String(err));
    return [];
  }
}

/** Recupere les parfums les plus populaires depuis le cache Firestore. */
export async function getPopularParfums(limitCount: number = 6): Promise<Parfum[]> {
  try {
    const snap = await getDocs(query(parfumsCol(), orderBy('popularityScore', 'desc'), limit(limitCount)));
    if (snap.empty) return [];
    return snap.docs.map((d) => ({ id: d.id, ...d.data() } as Parfum));
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
    candidates = familySnap.docs.map(
      (d) => ({ id: d.id, ...d.data() } as Parfum),
    );
  } catch {}

  let popular: Parfum[] = [];
  try {
    popular = await getPopularParfums(20);
  } catch {}

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

export async function getSimilarParfums(familleOlactive: string, excludeId: string, limitCount: number = 6): Promise<Parfum[]> {
  try {
    const snap = await getDocs(query(parfumsCol(), where('familleOlactive', '==', familleOlactive), limit(60)));
    if (snap.empty) return [];
    const today = Math.floor(Date.now() / 86400000);
    const pool = snap.docs
      .map((d) => ({ id: d.id, ...d.data() } as Parfum))
      .filter(p => p.id !== excludeId && p.imageUrl)
      .sort((a, b) => (b.popularityScore ?? 0) - (a.popularityScore ?? 0))
      .slice(0, 40);
    return seededShuffle(pool, today).slice(0, limitCount);
  } catch {
    return [];
  }
}
