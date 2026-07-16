// src/services/user-data.ts — Favoris + scans + collection + wishlist utilisateur

import firestore, { type FirebaseFirestoreTypes } from '@react-native-firebase/firestore';
import type { UserFavori, UserScan, UserCollectionItem, UserWishlistItem } from '../models';

function favCol(uid: string) { return firestore().collection(`users/${uid}/favoris`); }
function scanCol(uid: string) { return firestore().collection(`users/${uid}/scans`); }
function collCol(uid: string) { return firestore().collection(`users/${uid}/collection`); }
function wishCol(uid: string) { return firestore().collection(`users/${uid}/wishlist`); }

export function onFavoris(uid: string, cb: (favoris: UserFavori[]) => void): () => void {
  const q = favCol(uid).orderBy('addedAt', 'desc');
  return q.onSnapshot((snap: FirebaseFirestoreTypes.QuerySnapshot) => cb(snap.docs.map((d: FirebaseFirestoreTypes.DocumentSnapshot) => ({ id: d.id, ...d.data() } as UserFavori))));
}

export async function addFavori(uid: string, parfumId: string, nom?: string, marque?: string, imageUrl?: string, familleOlactive?: string): Promise<string> {
  const existing = await favCol(uid).where('parfumId', '==', parfumId).limit(1).get();
  if (!existing.empty) return existing.docs[0].id;
  const ref = await favCol(uid).add({ parfumId, nom: nom ?? null, marque: marque ?? null, imageUrl: imageUrl ?? null, familleOlactive: familleOlactive ?? null, addedAt: new Date() });
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
  return q.onSnapshot((snap: FirebaseFirestoreTypes.QuerySnapshot) => cb(snap.docs.map((d: FirebaseFirestoreTypes.DocumentSnapshot) => ({ id: d.id, ...d.data() } as UserScan))));
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

// ─── Collection ─────────────────────────────────────────────

export function onCollection(uid: string, cb: (items: UserCollectionItem[]) => void): () => void {
  return collCol(uid).onSnapshot((snap: FirebaseFirestoreTypes.QuerySnapshot) =>
    cb(snap.docs.map((d) => ({ id: d.id, ...d.data() } as UserCollectionItem))
      .sort((a, b) => (b.addedAt?.getTime?.() ?? 0) - (a.addedAt?.getTime?.() ?? 0)))
  );
}

export async function addToCollection(uid: string, parfumId: string, nom?: string, marque?: string, imageUrl?: string): Promise<string> {
  const existing = await collCol(uid).where('parfumId', '==', parfumId).limit(1).get();
  if (!existing.empty) return existing.docs[0].id;
  const ref = await collCol(uid).add({
    parfumId, nom: nom ?? null, marque: marque ?? null, imageUrl: imageUrl ?? null, addedAt: new Date(),
  });
  return ref.id;
}

export async function removeFromCollection(uid: string, itemId: string): Promise<void> {
  await collCol(uid).doc(itemId).delete();
}

// ─── Wishlist ────────────────────────────────────────────────

export function onWishlist(uid: string, cb: (items: UserWishlistItem[]) => void): () => void {
  return wishCol(uid).onSnapshot((snap: FirebaseFirestoreTypes.QuerySnapshot) =>
    cb(snap.docs.map((d) => ({ id: d.id, ...d.data() } as UserWishlistItem))
      .sort((a, b) => (b.addedAt?.getTime?.() ?? 0) - (a.addedAt?.getTime?.() ?? 0)))
  );
}

export async function addToWishlist(uid: string, parfumId: string, nom?: string, marque?: string, imageUrl?: string, familleOlactive?: string): Promise<string> {
  const existing = await wishCol(uid).where('parfumId', '==', parfumId).limit(1).get();
  if (!existing.empty) return existing.docs[0].id;
  const ref = await wishCol(uid).add({
    parfumId, nom: nom ?? null, marque: marque ?? null, imageUrl: imageUrl ?? null, familleOlactive: familleOlactive ?? null, addedAt: new Date(),
  });
  return ref.id;
}

export async function removeFromWishlist(uid: string, itemId: string): Promise<void> {
  await wishCol(uid).doc(itemId).delete();
}