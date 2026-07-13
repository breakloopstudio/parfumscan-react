// src/services/fragella.ts — API Fragella (74K parfums)
// Compatible Expo Go

import type { Parfum } from '../models';

let _functions: any = null;
try { _functions = require('@react-native-firebase/functions').default; } catch {}

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
  source?: string;
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
  source: 'fragella';
  typeParfum?: string | null;
}

// ─── Helpers ──────────────────────────────────────────────

function normalize(s: string): string {
  return s.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();
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
  };
}

// ─── API ──────────────────────────────────────────────────

export async function searchFragrance(marque: string, nom: string, typeParfum?: string | null): Promise<FragranceResult[]> {
  if (!_functions) return [];
  const callable = _functions().httpsCallable<{ marque: string; nom: string; typeParfum?: string | null }, { results: FragranceResult[] } | null>('searchFragrance');
  try {
    const result = await callable({ marque, nom, typeParfum });
    const data = result.data as any;
    return data?.results ?? [];
  } catch (err: any) {
    console.error('[Fragella] search error:', err?.message ?? err);
    throw err;
  }
}

export async function searchFragranceByQuery(query: string): Promise<FragranceResult[]> {
  if (!_functions) return [];
  const callable = _functions().httpsCallable<{ query: string }, { results: FragranceResult[] } | null>('searchFragrance');
  try {
    const result = await callable({ query });
    const data = result.data as any;
    return data?.results ?? [];
  } catch (err: any) {
    console.error('[Fragella] searchByQuery error:', err?.message ?? err);
    return [];
  }
}