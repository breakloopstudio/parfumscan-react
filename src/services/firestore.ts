// src/services/firestore.ts — CRUD collection `parfums` + cache Fragella

import firestore from '@react-native-firebase/firestore';
import type { Parfum } from '../models';
import type { ParfumSearchResult } from './fragella';
import { buildSearchKeywords, normalize as fragNormalize } from './fragella';

const col = () => firestore().collection('parfums');

// ——— Mapper Firestore → Parfum (Timestamp → Date) ———

function docToParfum(doc: any): Parfum {
  const data = doc.data?.() ?? {};
  return {
    id: doc.id ?? data.id,
    ...data,
    createdAt: data.createdAt?.toDate?.() ?? data.createdAt,
    updatedAt: data.updatedAt?.toDate?.() ?? data.updatedAt,
    cachedAt: data.cachedAt?.toDate?.() ?? data.cachedAt,
  } as Parfum;
}

export function onParfums(cb: (parfums: Parfum[]) => void): () => void {
  const q = col().orderBy('createdAt', 'desc');
  return q.onSnapshot((snap: any) => cb(snap.docs.map(docToParfum)));
}

export async function getParfumById(id: string): Promise<Parfum | undefined> {
  const snap = await col().doc(id).get();
  if (!snap.exists) return undefined;
  return docToParfum(snap);
}

export function onParfumsByMarque(marque: string, cb: (parfums: Parfum[]) => void): () => void {
  const q = col().where('marque', '>=', marque).where('marque', '<=', marque + '\uf8ff');
  return q.onSnapshot((snap: any) => {
    cb(snap.docs.map(docToParfum)
      .filter((p: Parfum) => p.marque.toLowerCase().includes(marque.toLowerCase())));
  });
}

export async function createParfum(data: Omit<Parfum, 'id' | 'createdAt' | 'updatedAt'>): Promise<any> {
  const now = new Date();
  return col().add({ ...data, createdAt: now, updatedAt: now });
}

export async function updateParfum(id: string, data: Partial<Omit<Parfum, 'id' | 'createdAt' | 'updatedAt'>>): Promise<void> {
  await col().doc(id).update({ ...data, updatedAt: new Date() });
}

export async function deleteParfum(id: string): Promise<void> {
  await col().doc(id).delete();
}

/** Vide la collection parfums (reset du cache). À utiliser avec précaution. */
export async function resetCache(): Promise<number> {
  const snap = await col().get();
  if (snap.empty) return 0;
  const batchSize = 500; // limite Firestore par batch
  const docs = snap.docs;
  for (let i = 0; i < docs.length; i += batchSize) {
    const batch = firestore().batch();
    docs.slice(i, i + batchSize).forEach((d: any) => batch.delete(d.ref));
    await batch.commit();
  }
  return docs.length;
}

export async function seedCatalog(parfums: Array<Omit<Parfum, 'id' | 'createdAt' | 'updatedAt'>>): Promise<number> {
  const batch = firestore().batch();
  const now = new Date();
  let count = 0;
  for (const p of parfums) {
    if (count >= 500) break;
    const id = fragNormalize(p.marque) + '_' + fragNormalize(p.nom);
    const keywords = buildSearchKeywords(p.marque, p.nom);
    batch.set(col().doc(id), {
      ...p,
      searchKeywords: keywords,
      source: (p.source ?? 'seed') as 'fragella' | 'seed' | 'manual',
      createdAt: now,
      updatedAt: now,
    });
    count++;
  }
  await batch.commit();
  return count;
}

/** Cache un résultat Fragella dans Firestore (upsert intelligent).
 *  - 1er accès → set() complet avec toutes les métadonnées
 *  - Accès suivant → update() partiel (prix, image) sans écraser les enrichissements manuels
 */
export async function cacheParfumFromSearch(p: ParfumSearchResult): Promise<string> {
  const docRef = col().doc(p.id);
  const existing = await docRef.get();

  if (!existing.exists) {
    const now = new Date();
    const keywords = buildSearchKeywords(p.marque, p.nom);
    await docRef.set({
      nom: p.nom,
      marque: p.marque,
      annee: p.annee,
      familleOlactive: p.familleOlactive,
      notesTete: p.notesTete,
      notesCoeur: p.notesCoeur,
      notesFond: p.notesFond,
      imageUrl: p.imageUrl,
      bestPrice: p.bestPrice,
      referencePrice: p.referencePrice,
      typeParfum: p.typeParfum,
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
      priceValue: p.priceValue ?? null,
      country: p.country ?? null,
      imageUrlTransparent: p.imageUrlTransparent ?? null,
      mainAccordsPercentage: p.mainAccordsPercentage ?? null,
      generalNotes: p.generalNotes ?? null,
      confidence: p.confidence ?? null,
      seasonRanking: p.seasonRanking ?? null,
      occasionRanking: p.occasionRanking ?? null,
      imageFallbacks: p.imageFallbacks ?? null,
    });
  } else {
    // Refresh : uniquement les champs volatils (skip undefined)
    const updateData: Record<string, unknown> = {
      cachedAt: new Date(),
      updatedAt: new Date(),
    };
    if (p.bestPrice !== undefined) updateData.bestPrice = p.bestPrice;
    if (p.referencePrice !== undefined) updateData.referencePrice = p.referencePrice;
    if (p.imageUrl !== undefined) updateData.imageUrl = p.imageUrl;
    // Rafraîchir aussi les keywords au cas où le nom/marque aurait changé
    const keywords = buildSearchKeywords(p.marque, p.nom);
    updateData.searchKeywords = keywords;
    await docRef.update(updateData);
  }
  return p.id;
}

/** Cache plusieurs résultats Fragella en batch (max 500 par batch Firestore).
 *  Appelé après chaque recherche pour éviter de rappeler l'API. */
export async function batchCacheParfums(parfums: ParfumSearchResult[]): Promise<number> {
  if (parfums.length === 0) return 0;
  let count = 0;
  for (let i = 0; i < parfums.length; i += 500) {
    const batch = firestore().batch();
    const chunk = parfums.slice(i, i + 500);
    const now = new Date();
    for (const p of chunk) {
      const docRef = col().doc(p.id);
      const keywords = buildSearchKeywords(p.marque, p.nom);
      batch.set(docRef, {
        nom: p.nom,
        marque: p.marque,
        annee: p.annee,
        familleOlactive: p.familleOlactive,
        notesTete: p.notesTete,
        notesCoeur: p.notesCoeur,
        notesFond: p.notesFond,
        imageUrl: p.imageUrl,
        bestPrice: p.bestPrice,
        referencePrice: p.referencePrice,
        typeParfum: p.typeParfum,
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
      count++;
    }
    await batch.commit();
  }
  return count;
}

/** Cherche dans le cache Firestore avant d'appeler l'API Fragella.
 *  Retourne les parfums dont les searchKeywords contiennent au moins un des tokens.
 *  Limited à 15 résultats, filtrés côté client par pertinence. */
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

    const docs = snap.docs.map((d: any) => ({ id: d.id, ...d.data() }));

    // Score de pertinence : nombre de tokens matchés
    const scored = docs.map((d: any) => {
      const kw = (d.searchKeywords ?? []) as string[];
      const matches = searchTokens.filter(t => kw.includes(t)).length;
      const exactMatch = kw.includes(q) ? 10 : 0;
      return { ...d, _score: matches + exactMatch };
    });

    // Trier par score décroissant, garder ceux avec au moins 1 match
    return scored
      .filter((d: any) => d._score > 0)
      .sort((a: any, b: any) => b._score - a._score)
      .slice(0, 15)
      .map(({ _score, ...rest }: any) => rest as ParfumSearchResult);
  } catch {
    return [];
  }
}