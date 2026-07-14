// src/services/user-data.ts — Favoris + scans utilisateur

import firestore from '@react-native-firebase/firestore';
import type { UserFavori, UserScan } from '../models';

function favCol(uid: string) { return firestore().collection(`users/${uid}/favoris`); }
function scanCol(uid: string) { return firestore().collection(`users/${uid}/scans`); }

export function onFavoris(uid: string, cb: (favoris: UserFavori[]) => void): () => void {
  const q = favCol(uid).orderBy('addedAt', 'desc');
  return q.onSnapshot((snap: any) => cb(snap.docs.map((d: any) => ({ id: d.id, ...d.data() } as UserFavori))));
}

export async function addFavori(uid: string, parfumId: string, nom?: string, marque?: string): Promise<string> {
  const existing = await favCol(uid).where('parfumId', '==', parfumId).limit(1).get();
  if (!existing.empty) return existing.docs[0].id;
  const ref = await favCol(uid).add({ parfumId, nom: nom ?? null, marque: marque ?? null, addedAt: new Date() });
  return ref.id;
}

export async function removeFavori(uid: string, favoriId: string): Promise<void> {
  await favCol(uid).doc(favoriId).delete();
}

export async function isParfumFavori(uid: string, parfumId: string): Promise<{ isFavori: boolean; favoriId: string | null }> {
  const snap = await favCol(uid).where('parfumId', '==', parfumId).limit(1).get();
  if (!snap.empty) return { isFavori: true, favoriId: snap.docs[0].id };
  return { isFavori: false, favoriId: null };
}

export function onScans(uid: string, cb: (scans: UserScan[]) => void): () => void {
  const q = scanCol(uid).orderBy('scannedAt', 'desc');
  return q.onSnapshot((snap: any) => cb(snap.docs.map((d: any) => ({ id: d.id, ...d.data() } as UserScan))));
}

export async function saveScan(uid: string, data: Omit<UserScan, 'id' | 'scannedAt'>): Promise<void> {
  const clean = Object.fromEntries(
    Object.entries({ ...data, scannedAt: new Date() }).filter(([_, v]) => v !== undefined)
  );
  await scanCol(uid).add(clean);
}

export async function removeScan(uid: string, scanId: string): Promise<void> {
  await scanCol(uid).doc(scanId).delete();
}