// src/services/user-data.ts — Favoris + scans + collection + wishlist utilisateur

import firestore, { type FirebaseFirestoreTypes } from '@react-native-firebase/firestore';
import type { UserFavori, UserScan, UserCollectionItem, UserWishlistItem } from '../models';

function favCol(uid: string) { return firestore().collection(`users/${uid}/favoris`); }
function scanCol(uid: string) { return firestore().collection(`users/${uid}/scans`); }
function collCol(uid: string) { return firestore().collection(`users/${uid}/collection`); }
function wishCol(uid: string) { return firestore().collection(`users/${uid}/wishlist`); }

export function onFavoris(uid: string, cb: (favoris: UserFavori[]) => void): () => void {
  const q = favCol(uid).orderBy('addedAt', 'desc');
  return q.onSnapshot((snap: FirebaseFirestoreTypes.QuerySnapshot) => {
    if (!snap) { cb([]); return; }
    cb(snap.docs.map((d: FirebaseFirestoreTypes.DocumentSnapshot) => ({ id: d.id, ...d.data() } as UserFavori)));
  });
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
  try {
    const snap = await favCol(uid).where('parfumId', '==', parfumId).limit(1).get();
    if (!snap.empty) return { isFavori: true, favoriId: snap.docs[0].id };
    return { isFavori: false, favoriId: null };
  } catch {
    return { isFavori: false, favoriId: null };
  }
}

export function onScans(uid: string, cb: (scans: UserScan[]) => void): () => void {
  const q = scanCol(uid).orderBy('scannedAt', 'desc');
  return q.onSnapshot((snap: FirebaseFirestoreTypes.QuerySnapshot) => {
    if (!snap) { cb([]); return; }
    cb(snap.docs.map((d: FirebaseFirestoreTypes.DocumentSnapshot) => ({ id: d.id, ...d.data() } as UserScan)));
  });
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
  return collCol(uid).onSnapshot((snap: FirebaseFirestoreTypes.QuerySnapshot) => {
    if (!snap) { cb([]); return; }
    cb(snap.docs.map((d) => ({ id: d.id, ...d.data() } as UserCollectionItem))
      .sort((a, b) => (b.addedAt?.getTime?.() ?? 0) - (a.addedAt?.getTime?.() ?? 0)));
  });
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

export async function moveToCollection(uid: string, fromTab: string, fromItemId: string, parfumId: string, nom?: string | null, marque?: string | null, imageUrl?: string | null): Promise<void> {
  const batch = firestore().batch();
  if (fromTab === 'favoris') batch.delete(favCol(uid).doc(fromItemId));
  else if (fromTab === 'wishlist') batch.delete(wishCol(uid).doc(fromItemId));
  const collRef = collCol(uid).doc();
  batch.set(collRef, { parfumId, nom: nom ?? null, marque: marque ?? null, imageUrl: imageUrl ?? null, addedAt: new Date() });
  await batch.commit();
}

export async function isInCollection(uid: string, parfumId: string): Promise<{ isInCollection: boolean; itemId: string | null }> {
  try {
    const snap = await collCol(uid).where('parfumId', '==', parfumId).limit(1).get();
    if (!snap.empty) return { isInCollection: true, itemId: snap.docs[0].id };
    return { isInCollection: false, itemId: null };
  } catch {
    return { isInCollection: false, itemId: null };
  }
}

// ─── Wishlist ────────────────────────────────────────────────

export function onWishlist(uid: string, cb: (items: UserWishlistItem[]) => void): () => void {
  return wishCol(uid).onSnapshot((snap: FirebaseFirestoreTypes.QuerySnapshot) => {
    if (!snap) { cb([]); return; }
    cb(snap.docs.map((d) => ({ id: d.id, ...d.data() } as UserWishlistItem))
      .sort((a, b) => (b.addedAt?.getTime?.() ?? 0) - (a.addedAt?.getTime?.() ?? 0)));
  });
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

export async function moveToWishlist(uid: string, fromTab: string, fromItemId: string, parfumId: string, nom?: string | null, marque?: string | null, imageUrl?: string | null, familleOlactive?: string | null): Promise<void> {
  const batch = firestore().batch();
  if (fromTab === 'favoris') batch.delete(favCol(uid).doc(fromItemId));
  else if (fromTab === 'collection') batch.delete(collCol(uid).doc(fromItemId));
  const wishRef = wishCol(uid).doc();
  batch.set(wishRef, { parfumId, nom: nom ?? null, marque: marque ?? null, imageUrl: imageUrl ?? null, familleOlactive: familleOlactive ?? null, addedAt: new Date() });
  await batch.commit();
}

export async function moveFavori(uid: string, fromTab: string, fromItemId: string, parfumId: string, nom?: string | null, marque?: string | null, imageUrl?: string | null, familleOlactive?: string | null): Promise<void> {
  const batch = firestore().batch();
  if (fromTab === 'collection') batch.delete(collCol(uid).doc(fromItemId));
  else if (fromTab === 'wishlist') batch.delete(wishCol(uid).doc(fromItemId));
  const favRef = favCol(uid).doc();
  batch.set(favRef, { parfumId, nom: nom ?? null, marque: marque ?? null, imageUrl: imageUrl ?? null, familleOlactive: familleOlactive ?? null, addedAt: new Date() });
  await batch.commit();
}

export async function isInWishlist(uid: string, parfumId: string): Promise<{ isInWishlist: boolean; itemId: string | null }> {
  try {
    const snap = await wishCol(uid).where('parfumId', '==', parfumId).limit(1).get();
    if (!snap.empty) return { isInWishlist: true, itemId: snap.docs[0].id };
    return { isInWishlist: false, itemId: null };
  } catch {
    return { isInWishlist: false, itemId: null };
  }
}

// ─── Settings utilisateur ──────────────────────────────────

const settingsCol = (uid: string) => firestore().collection(`users/${uid}/settings`);

export async function getUserSettings(uid: string): Promise<{ priceAlerts: boolean; pushNotifs: boolean }> {
  try {
    const snap = await settingsCol(uid).doc('preferences').get();
    const d = (snap as FirebaseFirestoreTypes.DocumentSnapshot).data();
    if (d) {
      return { priceAlerts: d.priceAlerts === true, pushNotifs: d.pushNotifs !== false };
    }
  } catch {}
  return { priceAlerts: false, pushNotifs: true };
}

export async function updateUserSetting(uid: string, key: 'priceAlerts' | 'pushNotifs', value: boolean): Promise<void> {
  await settingsCol(uid).doc('preferences').set({ [key]: value }, { merge: true });
}

// ─── Alertes prix par parfum ───────────────────────────────

function alertsCol(uid: string) { return firestore().collection(`users/${uid}/priceAlerts`); }

export async function isPriceAlertActive(uid: string, parfumId: string): Promise<boolean> {
  try {
    const snap = await alertsCol(uid).where('parfumId', '==', parfumId).limit(1).get();
    return !snap.empty;
  } catch { return false; }
}

export async function setPriceAlert(uid: string, parfumId: string, active: boolean): Promise<void> {
  if (active) {
    const existing = await alertsCol(uid).where('parfumId', '==', parfumId).limit(1).get();
    if (!existing.empty) return;
    await alertsCol(uid).add({ parfumId, addedAt: new Date() });
  } else {
    const snap = await alertsCol(uid).where('parfumId', '==', parfumId).limit(1).get();
    const batch = firestore().batch();
    snap.docs.forEach(d => batch.delete(d.ref));
    if (!snap.empty) await batch.commit();
  }
}