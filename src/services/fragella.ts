// src/services/fragella.ts — API Fragella (74K parfums) — appel direct REST
// Compatible Expo Go (pas de dépendance Firebase)

import { env } from '../config/env';

// ─── Types ─────────────────────────────────────────────────

export interface FragranceResult {
  id?: string;
  nom: string;
  marque: string;
  annee?: number;
  imageUrl?: string;
  bestPrice?: number;
  typeParfum?: string | null;
  familleOlactive: string;
  notesTete: string[];
  notesCoeur: string[];
  notesFond: string[];
  longevity?: string | null;
  sillage?: string | null;
  gender?: string | null;
  purchaseUrl?: string | null;
  priceValue?: string | null;
  mainAccords?: string[];
  rating?: string | null;
  popularity?: string | null;
  // Métadonnées étendues (maximiser la collecte)
  country?: string;
  imageUrlTransparent?: string;
  mainAccordsPercentage?: Record<string, string>;
  generalNotes?: string[];
  confidence?: string;
  seasonRanking?: { name: string; score: number }[];
  occasionRanking?: { name: string; score: number }[];
  imageFallbacks?: string[];
}

/** Résultat de recherche converti — différent d'un Parfum Firestore */
export interface ParfumSearchResult {
  id: string;
  nom: string;
  marque: string;
  annee?: number;
  familleOlactive: string;
  notesTete: string[];
  notesCoeur: string[];
  notesFond: string[];
  imageUrl?: string;
  bestPrice?: number;
  referencePrice?: number;
  discountPct?: number;
  source: 'fragella';
  typeParfum?: string | null;
  // Métadonnées étendues
  purchaseUrl?: string | null;
  mainAccords?: string[];
  longevity?: string | null;
  sillage?: string | null;
  gender?: string | null;
  rating?: string | null;
  popularity?: string | null;
  priceValue?: string | null;
  country?: string;
  imageUrlTransparent?: string;
  mainAccordsPercentage?: Record<string, string>;
  generalNotes?: string[];
  confidence?: string;
  seasonRanking?: { name: string; score: number }[];
  occasionRanking?: { name: string; score: number }[];
  imageFallbacks?: string[];
}

// ─── Constantes ────────────────────────────────────────────

const FRAGELLA_BASE = 'https://api.fragella.com/api/v1';

// ─── Helpers ──────────────────────────────────────────────

export function normalize(s: string): string {
  return s.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().replace(/[^a-z0-9]+/g, '_').replace(/^_|_$/g, '');
}

function apiKey(): string {
  return env.FRAGELLA_API_KEY;
}

/** Mappe une entrée brute Fragella vers notre format */
function mapFragrance(raw: Record<string, unknown>): FragranceResult {
  const notes = raw['Notes'] as Record<string, Array<{ name: string }>> | undefined;
  const brand = String(raw['Brand'] ?? '');
  let name = String(raw['Name'] ?? '');

  // L'API Fragella inclut parfois la marque dans le nom (ex: "Tom Ford Ombre Leather")
  // → on la retire pour éviter "tom_ford_tom_ford_ombre_leather"
  if (brand && name.toLowerCase().startsWith(brand.toLowerCase() + ' ')) {
    name = name.slice(brand.length).trim();
  }

  const brandNorm = normalize(brand);
  const nameNorm = normalize(name);
  return {
    id: brandNorm + '_' + nameNorm,
    nom: name,
    marque: brand,
    annee: raw['Year'] ? (parseInt(String(raw['Year']), 10) || undefined) : undefined,
    imageUrl: (raw['Image URL'] as string) ?? undefined,
    bestPrice: raw['Price'] ? (parseFloat(String(raw['Price'])) || undefined) : undefined,
    typeParfum: (raw['OilType'] as string) ?? undefined,
    familleOlactive: ((raw['Main Accords'] as string[])?.[0]) ?? '',
    notesTete: notes?.Top?.map(n => n.name) ?? [],
    notesCoeur: notes?.Middle?.map(n => n.name) ?? [],
    notesFond: notes?.Base?.map(n => n.name) ?? [],
    longevity: (raw['Longevity'] as string) ?? undefined,
    sillage: (raw['Sillage'] as string) ?? undefined,
    gender: (raw['Gender'] as string) ?? undefined,
    purchaseUrl: (raw['Purchase URL'] as string) ?? undefined,
    priceValue: (raw['Price Value'] as string) ?? undefined,
    mainAccords: (raw['Main Accords'] as string[]) ?? undefined,
    rating: (raw['rating'] as string) ?? undefined,
    popularity: (raw['Popularity'] as string) ?? undefined,
    // Métadonnées étendues
    country: (raw['Country'] as string) ?? undefined,
    imageUrlTransparent: (raw['Image URL Transparent'] as string) ?? undefined,
    mainAccordsPercentage: (raw['Main Accords Percentage'] as Record<string, string>) ?? undefined,
    generalNotes: (raw['General Notes'] as string[]) ?? undefined,
    confidence: (raw['Confidence'] as string) ?? undefined,
    seasonRanking: (raw['Season Ranking'] as Array<{ name: string; score: number }>) ?? undefined,
    occasionRanking: (raw['Occasion Ranking'] as Array<{ name: string; score: number }>) ?? undefined,
    imageFallbacks: (raw['Image Fallbacks'] as string[]) ?? undefined,
  };
}

/** Génère les mots-clés de recherche pour le cache Firestore */
export function buildSearchKeywords(marque: string, nom: string): string[] {
  const m = normalize(marque);
  const n = normalize(nom);
  const tokens = new Set<string>();
  // Tokens individuels de la marque et du nom
  m.split('_').filter(Boolean).forEach(t => tokens.add(t));
  n.split('_').filter(Boolean).forEach(t => tokens.add(t));
  // Combinaison complète
  tokens.add(`${m}_${n}`);
  tokens.add(`${m} ${n}`.trim());
  // Marque seule (pour recherche par marque)
  tokens.add(m);
  return [...tokens];
}

export function fragellaToParfum(frag: FragranceResult): ParfumSearchResult {
  return {
    id: frag.id || `${normalize(frag.marque)}_${normalize(frag.nom)}`,
    nom: frag.nom,
    marque: frag.marque,
    annee: frag.annee,
    familleOlactive: frag.familleOlactive || (frag.mainAccords?.[0] ?? ''),
    notesTete: frag.notesTete ?? [],
    notesCoeur: frag.notesCoeur ?? [],
    notesFond: frag.notesFond ?? [],
    imageUrl: frag.imageUrl,
    bestPrice: frag.bestPrice,
    referencePrice: frag.bestPrice ? Math.round(frag.bestPrice * 1.3) : undefined,
    source: 'fragella' as const,
    typeParfum: frag.typeParfum ?? undefined,
    // Métadonnées étendues
    purchaseUrl: frag.purchaseUrl,
    mainAccords: frag.mainAccords,
    longevity: frag.longevity,
    sillage: frag.sillage,
    gender: frag.gender,
    rating: frag.rating,
    popularity: frag.popularity,
    priceValue: frag.priceValue,
    country: frag.country,
    imageUrlTransparent: frag.imageUrlTransparent,
    mainAccordsPercentage: frag.mainAccordsPercentage,
    generalNotes: frag.generalNotes,
    confidence: frag.confidence,
    seasonRanking: frag.seasonRanking,
    occasionRanking: frag.occasionRanking,
    imageFallbacks: frag.imageFallbacks,
  };
}

// ─── HTTP ──────────────────────────────────────────────────

async function fragellaGet(path: string): Promise<Response> {
  return fetch(`${FRAGELLA_BASE}${path}`, {
    headers: { 'x-api-key': apiKey() },
  });
}

// ─── API ──────────────────────────────────────────────────

export async function searchFragrance(marque: string, nom: string, typeParfum?: string | null): Promise<FragranceResult[]> {
  if (!apiKey()) {
    console.warn('[Fragella] Clé API non configurée.');
    return [];
  }
  const query = [marque, nom].filter(Boolean).join(' ');
  if (!query) return [];

  try {
    const response = await fragellaGet(`/fragrances?search=${encodeURIComponent(query)}&limit=10`);
    if (!response.ok) {
      console.error('[Fragella] search error:', response.status);
      return [];
    }
    const data = await response.json() as Array<Record<string, unknown>>;
    let results = data.map(mapFragrance);

    // Filtrer par typeParfum si fourni
    if (typeParfum && results.length > 0) {
      const filtered = results.filter(r =>
        normalize(r.typeParfum ?? '').includes(normalize(typeParfum))
      );
      if (filtered.length > 0) results = filtered;
    }

    return results;
  } catch (err: any) {
    console.error('[Fragella] search error:', err?.message ?? err);
    throw err;
  }
}

export async function searchFragranceByQuery(query: string): Promise<FragranceResult[]> {
  if (!apiKey()) {
    console.warn('[Fragella] Clé API non configurée.');
    return [];
  }
  if (!query || query.trim().length < 3) return [];

  try {
    const response = await fragellaGet(`/fragrances?search=${encodeURIComponent(query.trim())}&limit=7`);
    if (!response.ok) {
      console.error('[Fragella] searchByQuery error:', response.status);
      return [];
    }
    const data = await response.json() as Array<Record<string, unknown>>;
    return data.map(mapFragrance);
  } catch (err: any) {
    console.error('[Fragella] searchByQuery error:', err?.message ?? err);
    return [];
  }
}