// src/services/fragella.ts — API Fragella (74K parfums) — via Cloud Function
// La clé API Fragella est côté serveur uniquement (Cloud Functions)

import { getApp } from '@react-native-firebase/app';
import { getFunctions, httpsCallable } from '@react-native-firebase/functions';

// ─── Types ─────────────────────────────────────────────────

export interface FragranceResult {
  id?: string;
  fragellaId?: string;     // ID original Fragella (pour l'endpoint /:id)
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
  popularityScore?: number;  // score normalise (0-100)
  ratingScore?: number;      // parseFloat(rating)
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
  fragellaId?: string;     // ID original Fragella (pour l'endpoint /:id)
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
  popularityScore?: number;
  ratingScore?: number;
  priceValue?: string | null;
  country?: string;
  imageUrlTransparent?: string;
  mainAccordsPercentage?: Record<string, string>;
  generalNotes?: string[];
  confidence?: string;
  seasonRanking?: { name: string; score: number }[];
  occasionRanking?: { name: string; score: number }[];
  imageFallbacks?: string[];
  similarIds?: string[];
}

// ─── Helpers ──────────────────────────────────────────────


function popScore(v: string | undefined): number | undefined {
  if (!v) return undefined;
  const k = v.toLowerCase().trim();
  if (k.includes('very high') || k.includes('extremely')) return 100;
  if (k.includes('high')) return 75;
  if (k.includes('medium') || k.includes('moderate')) return 50;
  if (k.includes('low') && !k.includes('very')) return 25;
  if (k.includes('very low')) return 0;
  const n = parseFloat(k);
  return isNaN(n) ? undefined : n;
}

function rateScore(v: string | undefined): number | undefined {
  if (!v) return undefined;
  const n = parseFloat(v);
  return isNaN(n) ? undefined : n;
}

export function normalize(s: string): string {
  return s.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().replace(/[^a-z0-9]+/g, '_').replace(/^_|_$/g, '');
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
  
  // DEBUG: log les cl�s du premier r�sultat pour v�rifier les m�tadonn�es enrichies
  if (!((globalThis as { __fragellaLogged?: boolean }).__fragellaLogged)) { console.log('[Fragella] raw keys:', Object.keys(raw).sort().join(', ')); (globalThis as { __fragellaLogged?: boolean }).__fragellaLogged = true; }

  // DEBUG: log Popularity et rating bruts pour voir ce que l'API renvoie
  const pop = raw['Popularity'];
  const rat = raw['rating'];
  if (pop !== undefined || rat !== undefined) {
    console.log('[Fragella]', brand, name, '| popularity:', JSON.stringify(pop), typeof pop, '| rating:', JSON.stringify(rat), typeof rat);
  }

  const seasonRanking = (raw['Season Ranking'] as Array<{ name: string; score: number }>) ?? undefined;
  const occasionRanking = (raw['Occasion Ranking'] as Array<{ name: string; score: number }>) ?? undefined;
  // Capturer l'ID original Fragella (pour les appels à l'endpoint détail /:id)
  const fragellaId = (raw['_id'] ?? raw['Id'] ?? raw['id'] ?? raw['ID']) as string | undefined;
  if (!seasonRanking || !occasionRanking) {
    console.log('[Fragella] ⚠️ Metadata missing for', brand, name, '— season:', !!seasonRanking, 'occasion:', !!occasionRanking);
  }
  return {
    fragellaId,
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
    popularityScore: popScore(pop as string),
    ratingScore: rateScore(rat as string),
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
    fragellaId: frag.fragellaId,
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
    popularityScore: frag.popularityScore,
    ratingScore: frag.ratingScore,
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

// ─── HTTP (via Cloud Function) ────────────────────────────

async function callFragella(data: Record<string, unknown>): Promise<Record<string, unknown> | null> {
  try {
    const funcs = getFunctions(getApp(), 'europe-west1');
    const result = await httpsCallable<typeof data, Record<string, unknown> | null>(funcs, 'searchFragrance')(data);
    return result.data;
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    console.warn('[Fragella] Cloud Function error:', msg);
    return null;
  }
}

// ─── API ──────────────────────────────────────────────────

/** Récupère un parfum par son ID Fragella (détail complet).
 *  Passe par la Cloud Function (clé API côté serveur). */
export async function getFragranceById(id: string): Promise<FragranceResult | null> {
  if (!id) return null;
  const r = await callFragella({ id });
  if (!r || !r.results) return null;
  const results = r.results as FragranceResult[];
  return results.length > 0 ? results[0] : null;
}

export async function searchFragrance(marque: string, nom: string, typeParfum?: string | null): Promise<FragranceResult[]> {
  const query = [marque, nom].filter(Boolean).join(' ');
  if (!query) return [];
  const r = await callFragella({ marque, nom, typeParfum });
  if (!r || !r.results) return [];
  let results = (r.results as FragranceResult[]);
  if (!results || results.length === 0) return [];

  // Filtrer par typeParfum si fourni
  if (typeParfum && results.length > 0) {
    const filtered = results.filter(res =>
      normalize(res.typeParfum ?? '').includes(normalize(typeParfum))
    );
    if (filtered.length > 0) results = filtered;
  }

  return results;
}

export async function searchFragranceByQuery(query: string): Promise<FragranceResult[]> {
  if (!query || query.trim().length < 3) return [];
  const r = await callFragella({ query: query.trim() });
  if (!r || !r.results) return [];
  return (r.results as FragranceResult[]);
}

export async function getSimilarFragrances(marque: string, nom: string, limit: number = 6): Promise<FragranceResult[]> {
  const similarTo = `${marque} ${nom}`.trim();
  if (!similarTo) return [];
  const r = await callFragella({ similarTo });
  if (!r || !r.results) return [];
  return (r.results as FragranceResult[]).slice(0, limit);
}
