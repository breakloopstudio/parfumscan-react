// src/services/firestore.ts — CRUD collection `parfums` + cache Fragella

import firestore, { type FirebaseFirestoreTypes } from '@react-native-firebase/firestore';
import type { Parfum } from '../models';
import type { ParfumSearchResult } from './fragella';
import { buildSearchKeywords } from './fragella';

const col = () => firestore().collection('parfums');


// ─── Type utilitaire pour le scoring local de searchParfumsCached ───

type ScoredDoc = { id: string; _score: number; searchKeywords?: string[] } & Record<string, unknown>;

// ——— Mapper Firestore → Parfum (Timestamp → Date) ———

function docToParfum(doc: FirebaseFirestoreTypes.DocumentSnapshot): Parfum {
  const d = doc.data?.() ?? ({} as Record<string, unknown>);
  const id = doc.id ?? (d.id as string);
  return {
    id,
    nom: d.nom as string,
    marque: d.marque as string,
    annee: d.annee as number | undefined,
    familleOlactive: d.familleOlactive as string,
    notesTete: (d.notesTete as string[]) ?? [],
    notesCoeur: (d.notesCoeur as string[]) ?? [],
    notesFond: (d.notesFond as string[]) ?? [],
    imageUrl: d.imageUrl as string | undefined,
    bestPrice: d.bestPrice as number | undefined,
    referencePrice: d.referencePrice as number | undefined,
    discountPct: d.discountPct as number | undefined,
    offers: d.offers as Parfum['offers'],
    typeParfum: d.typeParfum as string | null | undefined,
    source: d.source as Parfum['source'],
    cachedAt: (d.cachedAt as { toDate?: () => Date })?.toDate?.() ?? (d.cachedAt as Date | undefined),
    imageVerified: d.imageVerified as boolean | undefined,
    searchKeywords: d.searchKeywords as string[] | undefined,
    fragellaId: d.fragellaId as string | undefined,
    purchaseUrl: d.purchaseUrl as string | null | undefined,
    mainAccords: d.mainAccords as string[] | undefined,
    longevity: d.longevity as string | null | undefined,
    sillage: d.sillage as string | null | undefined,
    gender: d.gender as string | null | undefined,
    rating: d.rating as string | null | undefined,
    popularity: d.popularity as string | null | undefined,
    popularityScore: d.popularityScore as number | undefined,
    ratingScore: d.ratingScore as number | undefined,
    priceValue: d.priceValue as string | null | undefined,
    country: d.country as string | undefined,
    imageUrlTransparent: d.imageUrlTransparent as string | undefined,
    mainAccordsPercentage: d.mainAccordsPercentage as Record<string, string> | undefined,
    generalNotes: d.generalNotes as string[] | undefined,
    confidence: d.confidence as string | undefined,
    seasonRanking: d.seasonRanking as { name: string; score: number }[] | undefined,
    occasionRanking: d.occasionRanking as { name: string; score: number }[] | undefined,
    imageFallbacks: d.imageFallbacks as string[] | undefined,
    createdAt: (d.createdAt as { toDate?: () => Date })?.toDate?.() ?? (d.createdAt as Date),
    updatedAt: (d.updatedAt as { toDate?: () => Date })?.toDate?.() ?? (d.updatedAt as Date),
  };
}

export function onParfums(cb: (parfums: Parfum[]) => void): () => void {
  const q = col().orderBy('createdAt', 'desc');
  return q.onSnapshot((snap: FirebaseFirestoreTypes.QuerySnapshot) => cb(snap.docs.map(docToParfum)));
}

export async function getParfumById(id: string): Promise<Parfum | undefined> {
  const snap = await col().doc(id).get();
  if (!snap.exists) return undefined;
  return docToParfum(snap);
}

export function onParfumsByMarque(marque: string, cb: (parfums: Parfum[]) => void): () => void {
  const q = col().where('marque', '>=', marque).where('marque', '<=', marque + '\uf8ff');
  return q.onSnapshot((snap: FirebaseFirestoreTypes.QuerySnapshot) => {
    cb(snap.docs.map(docToParfum)
      .filter((p: Parfum) => p.marque.toLowerCase().includes(marque.toLowerCase())));
  });
}

export async function createParfum(data: Omit<Parfum, 'id' | 'createdAt' | 'updatedAt'>): Promise<FirebaseFirestoreTypes.DocumentReference> {
  const now = new Date();
  return col().add({ ...data, createdAt: now, updatedAt: now });
}

export async function updateParfum(id: string, data: Partial<Omit<Parfum, 'id' | 'createdAt' | 'updatedAt'>>): Promise<void> {
  await col().doc(id).update({ ...data, updatedAt: new Date() });
}

export async function deleteParfum(id: string): Promise<void> {
  await col().doc(id).delete();
}

/** Supprime TOUS les parfums de la collection Firestore (reset cache complet).
 *  Utilise des batchs de 500 docs (limite Firestore). */
export async function deleteAllCachedParfums(): Promise<number> {
  const snap = await col().limit(500).get();
  if (snap.empty) return 0;

  let totalDeleted = 0;

  let currentSnap: FirebaseFirestoreTypes.QuerySnapshot = snap;
  while (!currentSnap.empty) {
    const batch = firestore().batch();
    for (const doc of currentSnap.docs) {
      batch.delete(doc.ref);
    }
    await batch.commit();
    totalDeleted += currentSnap.docs.length;
    const lastDoc = currentSnap.docs[currentSnap.docs.length - 1];
    currentSnap = await col().limit(500).startAfter(lastDoc).get();
  }

  return totalDeleted;
}

 

/** Cache un résultat Fragella dans Firestore (upsert intelligent).
 *  - 1er accès → set() complet avec toutes les métadonnées
 *  - Accès suivant → update() partiel (prix, image) sans écraser les enrichissements manuels
 */
export async function cacheParfumFromSearch(p: ParfumSearchResult): Promise<string> {
  const docRef = col().doc(p.id);
  let existing: FirebaseFirestoreTypes.DocumentSnapshot;
  try { existing = await docRef.get(); } catch { existing = { exists: false } as any; }

  if (!existing.exists) {
    const now = new Date();
    const keywords = buildSearchKeywords(p.marque, p.nom);
    await docRef.set({
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
      // Métadonnées étendues
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
    // Refresh : tous les champs volatils + métadonnées (skip undefined/null)
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
    // Métadonnées enrichies : mettre à jour si présentes dans les nouvelles données
    // et absentes ou null dans le cache existant
    const enrichFields: Array<keyof ParfumSearchResult> = [
      'fragellaId', 'seasonRanking', 'occasionRanking', 'mainAccords', 'mainAccordsPercentage',
      'longevity', 'sillage', 'gender', 'rating', 'popularity', 'priceValue',
      'country', 'imageUrlTransparent', 'generalNotes', 'confidence', 'imageFallbacks',
      'purchaseUrl',
    ];
    for (const field of enrichFields) {
      const newVal = (p as Record<string, unknown>)[field];
      const existingVal = existingData[field];
      if (newVal !== undefined && newVal !== null && (existingVal === undefined || existingVal === null)) {
        updateData[field] = newVal;
      }
    }
    await docRef.update(updateData);
  }
  return p.id;
}

/** Cache plusieurs resultats Fragella en batch. Utilise set+merge (pas de get prealable). */
export async function batchCacheParfums(parfums: ParfumSearchResult[]): Promise<number> {
  if (parfums.length === 0) return 0;
  const now = new Date();
  const batch = firestore().batch();

  for (const p of parfums) {
    const keywords = buildSearchKeywords(p.marque, p.nom);
    const docRef = col().doc(p.id);
    batch.set(docRef, {
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

  await batch.commit();
  return parfums.length;
}

export async function searchParfumsCached(query: string): Promise<ParfumSearchResult[]> {
  const q = query.trim().toLowerCase();
  if (q.length < 2) return [];

  // Tokens de la requête
  const tokens = q.split(/\s+/).filter(t => t.length >= 2);
  if (tokens.length === 0) return [];

  // Limiter à 10 tokens max (limite array-contains-any = 30)
  const searchTokens = tokens.slice(0, 10);

  try {
    const snap = await col()
      .where('searchKeywords', 'array-contains-any', searchTokens)
      .limit(20)
      .get();

    if (snap.empty) return [];

    const docs: ScoredDoc[] = snap.docs.map((d) => ({ id: d.id, _score: 0, ...d.data() } as ScoredDoc));

    // Score de pertinence : tokens matchés + bonus popularité + exact match
    const scored = docs.map((d: ScoredDoc) => {
      const kw = (d.searchKeywords ?? []) as string[];
      const matches = searchTokens.filter(t => kw.includes(t)).length;
      const exactMatch = kw.includes(q) ? 10 : 0;
      const popBonus = typeof d.popularityScore === 'number' ? d.popularityScore / 20 : 0; // 0→5 (100→5)
      return { ...d, _score: matches + exactMatch + popBonus };
    });

    // Trier par score décroissant, garder ceux avec au moins 1 match
    return scored
      .filter((d: ScoredDoc) => d._score > 0)
      .sort((a: ScoredDoc, b: ScoredDoc) => b._score - a._score)
      .slice(0, 15)
      .map(({ _score, ...rest }: ScoredDoc) => rest as ParfumSearchResult);
  } catch {
    return [];
  }
}

/** Recupere les parfums les plus populaires depuis le cache Firestore.
 *  Tries par popularityScore decroissant. docs sans score ignores. */
export async function getPopularParfums(limit: number = 6): Promise<ParfumSearchResult[]> {
  try {
    const snap = await col()
      .orderBy('popularityScore', 'desc')
      .limit(limit)
      .get();
    if (snap.empty) return [];
    return snap.docs.map((d) => ({ id: d.id, ...d.data() } as ParfumSearchResult));
  } catch {
    return [];
  }
}
