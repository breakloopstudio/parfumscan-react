// src/services/firestore.ts — CRUD collection `parfums` + cache Fragella

import { getFirestore, collection, doc, query, where, orderBy, limit, startAfter, getDocs, getDoc, addDoc, setDoc, updateDoc, deleteDoc, writeBatch, onSnapshot } from '@react-native-firebase/firestore';
import type { QuerySnapshot, DocumentSnapshot, DocumentReference, QueryDocumentSnapshot, DocumentData } from '@react-native-firebase/firestore';
import type { Parfum } from '../models';
import type { ParfumSearchResult } from './fragella';
import { buildSearchKeywords } from './fragella';

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
    discountPct: data.discountPct as number | undefined,
    offers: data.offers as Parfum['offers'],
    typeParfum: data.typeParfum as string | null | undefined,
    source: data.source as Parfum['source'],
    cachedAt: (data.cachedAt as { toDate?: () => Date })?.toDate?.() ?? (data.cachedAt as Date | undefined),
    imageVerified: data.imageVerified as boolean | undefined,
    searchKeywords: data.searchKeywords as string[] | undefined,
    fragellaId: data.fragellaId as string | undefined,
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
    imageUrlTransparent: data.imageUrlTransparent as string | undefined,
    mainAccordsPercentage: data.mainAccordsPercentage as Record<string, string> | undefined,
    generalNotes: data.generalNotes as string[] | undefined,
    confidence: data.confidence as string | undefined,
    seasonRanking: data.seasonRanking as { name: string; score: number }[] | undefined,
    occasionRanking: data.occasionRanking as { name: string; score: number }[] | undefined,
    imageFallbacks: data.imageFallbacks as string[] | undefined,
    createdAt: (data.createdAt as { toDate?: () => Date })?.toDate?.() ?? (data.createdAt as Date),
    updatedAt: (data.updatedAt as { toDate?: () => Date })?.toDate?.() ?? (data.updatedAt as Date),
  };
}

export function onParfums(cb: (parfums: Parfum[]) => void): () => void {
  const q = query(parfumsCol(), orderBy('updatedAt', 'desc'));
  return onSnapshot(q, (snap) => { if (!snap) { cb([]); return; } cb(snap.docs.map(docToParfum)); });
}

export async function getParfumById(id: string): Promise<Parfum | undefined> {
  const snap = await getDoc(doc(parfumsCol(), id));
  if (!snap.exists) return undefined;
  return docToParfum(snap);
}

export function onParfumsByMarque(marque: string, cb: (parfums: Parfum[]) => void): () => void {
  const q = query(parfumsCol(), where('marque', '>=', marque), where('marque', '<=', marque + '\uf8ff'));
  return onSnapshot(q, (snap) => {
    cb(snap.docs.map(docToParfum)
      .filter((p: Parfum) => p.marque.toLowerCase().includes(marque.toLowerCase())));
  });
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



/** Cache un résultat Fragella dans Firestore (upsert intelligent).
 *  - 1er accès → set() complet avec toutes les métadonnées
 *  - Accès suivant → update() partiel (prix, image) sans écraser les enrichissements manuels
 */
export async function cacheParfumFromSearch(p: ParfumSearchResult): Promise<string> {
  const dRef = doc(parfumsCol(), p.id);
  let existing: DocumentSnapshot<DocumentData, DocumentData>;
  try { existing = await getDoc(dRef); } catch { existing = { exists: false } as unknown as DocumentSnapshot<DocumentData, DocumentData>; }

  if (!existing.exists) {
    const now = new Date();
    const keywords = buildSearchKeywords(p.marque, p.nom);
    await setDoc(dRef, {
      nom: p.nom,
      marque: p.marque,
      annee: p.annee ?? null,
      familleOlactive: p.familleOlactive,
      notesTete: p.notesTete,
      notesCoeur: p.notesCoeur,
      notesFond: p.notesFond,
      imageUrl: p.imageUrl ?? null,
      bestPrice: p.bestPrice ?? null,
      referencePrice: p.referencePrice ?? null,
      typeParfum: p.typeParfum ?? null,
      source: 'fragella-cached' as const,
      cachedAt: now,
      createdAt: now,
      updatedAt: now,
      searchKeywords: keywords,
      purchaseUrl: p.purchaseUrl ?? null,
      mainAccords: p.mainAccords ?? null,
      longevity: p.longevity ?? null,
      sillage: p.sillage ?? null,
      gender: p.gender ?? null,
      rating: p.rating ?? null,
      popularity: p.popularity ?? null,
      popularityScore: p.popularityScore ?? null,
      ratingScore: p.ratingScore ?? null,
      priceValue: p.priceValue ?? null,
      country: p.country ?? null,
      imageUrlTransparent: p.imageUrlTransparent ?? null,
      mainAccordsPercentage: p.mainAccordsPercentage ?? null,
      generalNotes: p.generalNotes ?? null,
      confidence: p.confidence ?? null,
      seasonRanking: p.seasonRanking ?? null,
      occasionRanking: p.occasionRanking ?? null,
      imageFallbacks: p.imageFallbacks ?? null,
      fragellaId: p.fragellaId ?? null,
    });
  } else {
    const updateData: Record<string, unknown> = {
      cachedAt: new Date(),
      updatedAt: new Date(),
    };
    const existingData = existing.data() ?? {};
    if (p.bestPrice !== undefined) updateData.bestPrice = p.bestPrice;
    if (p.referencePrice !== undefined) updateData.referencePrice = p.referencePrice;
    if (p.imageUrl !== undefined) updateData.imageUrl = p.imageUrl;
    const keywords = buildSearchKeywords(p.marque, p.nom);
    updateData.searchKeywords = keywords;
    const enrichFields: Array<keyof ParfumSearchResult> = [
      'fragellaId', 'seasonRanking', 'occasionRanking', 'mainAccords', 'mainAccordsPercentage',
      'longevity', 'sillage', 'gender', 'rating', 'popularity', 'priceValue',
      'country', 'imageUrlTransparent', 'generalNotes', 'confidence', 'imageFallbacks',
      'purchaseUrl',
    ];
    for (const field of enrichFields) {
      const newVal = (p as unknown as Record<string, unknown>)[field];
      const existingVal = existingData[field];
      if (newVal !== undefined && newVal !== null && (existingVal === undefined || existingVal === null)) {
        updateData[field] = newVal;
      }
    }
    await updateDoc(dRef, updateData);
  }
  return p.id;
}

/** Cache plusieurs resultats Fragella en batch. Utilise set+merge (pas de get prealable). */
export async function batchCacheParfums(parfums: ParfumSearchResult[]): Promise<number> {
  if (parfums.length === 0) return 0;
  const now = new Date();
  const b = writeBatch(db);

  for (const p of parfums) {
    const keywords = buildSearchKeywords(p.marque, p.nom);
    b.set(doc(parfumsCol(), p.id), {
      nom: p.nom,
      marque: p.marque,
      annee: p.annee ?? null,
      familleOlactive: p.familleOlactive,
      notesTete: p.notesTete,
      notesCoeur: p.notesCoeur,
      notesFond: p.notesFond,
      imageUrl: p.imageUrl ?? null,
      bestPrice: p.bestPrice ?? null,
      referencePrice: p.referencePrice ?? null,
      typeParfum: p.typeParfum ?? null,
      source: 'fragella-cached' as const,
      cachedAt: now,
      updatedAt: now,
      searchKeywords: keywords,
      fragellaId: p.fragellaId ?? null,
      purchaseUrl: p.purchaseUrl ?? null,
      mainAccords: p.mainAccords ?? null,
      longevity: p.longevity ?? null,
      sillage: p.sillage ?? null,
      gender: p.gender ?? null,
      rating: p.rating ?? null,
      popularity: p.popularity ?? null,
      popularityScore: p.popularityScore ?? null,
      ratingScore: p.ratingScore ?? null,
      priceValue: p.priceValue ?? null,
      country: p.country ?? null,
      imageUrlTransparent: p.imageUrlTransparent ?? null,
      mainAccordsPercentage: p.mainAccordsPercentage ?? null,
      generalNotes: p.generalNotes ?? null,
      confidence: p.confidence ?? null,
      seasonRanking: p.seasonRanking ?? null,
      occasionRanking: p.occasionRanking ?? null,
      imageFallbacks: p.imageFallbacks ?? null,
    }, { merge: true });
  }

  await b.commit();
  return parfums.length;
}

export async function searchParfumsCached(queryStr: string): Promise<ParfumSearchResult[]> {
  const q = queryStr.trim().toLowerCase();
  if (q.length < 2) return [];

  const tokens = q.split(/\s+/).filter(t => t.length >= 2);
  if (tokens.length === 0) return [];

  const searchTokens = tokens.slice(0, 10);

  try {
    const snap = await getDocs(query(parfumsCol(), where('searchKeywords', 'array-contains-any', searchTokens), limit(20)));

    if (snap.empty) return [];

    const docs: ScoredDoc[] = snap.docs.map((d) => ({ id: d.id, _score: 0, ...d.data() } as ScoredDoc));

    const scored = docs.map((scoredDoc: ScoredDoc) => {
      const kw = (scoredDoc.searchKeywords ?? []) as string[];
      const matches = searchTokens.filter(t => kw.includes(t)).length;
      const exactMatch = kw.includes(q) ? 10 : 0;
      const popBonus = typeof scoredDoc.popularityScore === 'number' ? scoredDoc.popularityScore / 20 : 0;
      return { ...scoredDoc, _score: matches + exactMatch + popBonus };
    });

    return scored
      .filter((scoredDoc: ScoredDoc) => scoredDoc._score > 0)
      .sort((a: ScoredDoc, b: ScoredDoc) => b._score - a._score)
      .slice(0, 15)
      .map(({ _score, ...rest }: ScoredDoc) => rest as unknown as ParfumSearchResult);
  } catch {
    return [];
  }
}

/** Recupere les parfums les plus populaires depuis le cache Firestore. */
export async function getPopularParfums(limitCount: number = 6): Promise<ParfumSearchResult[]> {
  try {
    const snap = await getDocs(query(parfumsCol(), orderBy('popularityScore', 'desc'), limit(limitCount)));
    if (snap.empty) return [];
    return snap.docs.map((d) => ({ id: d.id, ...d.data() } as ParfumSearchResult));
  } catch {
    return [];
  }
}

/** Suggestions personnalisees basees sur l'historique de scans et favoris. */
export async function getPersonalizedSuggestions(
  uid: string,
  limitCount: number = 16,
): Promise<ParfumSearchResult[]> {
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

  let candidates: ParfumSearchResult[] = [];
  try {
    const familySnap = await getDocs(query(parfumsCol(), where('familleOlactive', 'in', topFamilies), limit(20)));
    candidates = familySnap.docs.map(
      (d) => ({ id: d.id, ...d.data() } as ParfumSearchResult),
    );
  } catch {}

  let popular: ParfumSearchResult[] = [];
  try {
    popular = await getPopularParfums(20);
  } catch {}

  const unique = new Map<string, ParfumSearchResult>();
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
