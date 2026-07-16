// src/services/user-data.ts — Favoris + scans + collection + wishlist utilisateur

import { getFirestore, collection, doc, query, where, orderBy, limit, getDocs, getDoc, addDoc, setDoc, deleteDoc, writeBatch, onSnapshot } from '@react-native-firebase/firestore';
import type { DocumentSnapshot, DocumentData } from '@react-native-firebase/firestore';
import type { UserFavori, UserScan, UserCollectionItem, UserWishlistItem } from '../models';

const db = getFirestore();

function favCol(uid: string) { return collection(db, `users/${uid}/favoris`); }
function scanCol(uid: string) { return collection(db, `users/${uid}/scans`); }
function collCol(uid: string) { return collection(db, `users/${uid}/collection`); }
function wishCol(uid: string) { return collection(db, `users/${uid}/wishlist`); }

export function onFavoris(uid: string, cb: (favoris: UserFavori[]) => void): () => void {
  const q = query(favCol(uid), orderBy('addedAt', 'desc'));
  return onSnapshot(q, (snap) => {
    if (!snap) { cb([]); return; }
    cb(snap.docs.map((d) => ({ id: d.id, ...d.data() } as UserFavori)));
  });
}

export async function addFavori(uid: string, parfumId: string, nom?: string, marque?: string, imageUrl?: string, familleOlactive?: string): Promise<string> {
  const existing = await getDocs(query(favCol(uid), where('parfumId', '==', parfumId), limit(1)));
  if (!existing.empty) return existing.docs[0].id;
  const ref = await addDoc(favCol(uid), { parfumId, nom: nom ?? null, marque: marque ?? null, imageUrl: imageUrl ?? null, familleOlactive: familleOlactive ?? null, addedAt: new Date() });
  return ref.id;
}

export async function removeFavori(uid: string, favoriId: string): Promise<void> {
  await deleteDoc(doc(favCol(uid), favoriId));
}

export async function isParfumFavori(uid: string, parfumId: string): Promise<{ isFavori: boolean; favoriId: string | null }> {
  try {
    const snap = await getDocs(query(favCol(uid), where('parfumId', '==', parfumId), limit(1)));
    if (!snap.empty) return { isFavori: true, favoriId: snap.docs[0].id };
    return { isFavori: false, favoriId: null };
  } catch {
    return { isFavori: false, favoriId: null };
  }
}

export function onScans(uid: string, cb: (scans: UserScan[]) => void): () => void {
  const q = query(scanCol(uid), orderBy('scannedAt', 'desc'));
  return onSnapshot(q, (snap) => {
    if (!snap) { cb([]); return; }
    cb(snap.docs.map((d) => ({ id: d.id, ...d.data() } as UserScan)));
  });
}

export async function saveScan(uid: string, scanData: Omit<UserScan, 'id' | 'scannedAt'>): Promise<void> {
  const clean = Object.fromEntries(
    Object.entries({ ...scanData, scannedAt: new Date() }).filter(([_, v]) => v !== undefined)
  );
  await addDoc(scanCol(uid), clean);
}

export async function removeScan(uid: string, scanId: string): Promise<void> {
  await deleteDoc(doc(scanCol(uid), scanId));
}

export function onCollection(uid: string, cb: (items: UserCollectionItem[]) => void): () => void {
  return onSnapshot(collCol(uid), (snap) => {
    if (!snap) { cb([]); return; }
    cb(snap.docs.map((d) => ({ id: d.id, ...d.data() } as UserCollectionItem))
      .sort((a, b) => (b.addedAt?.getTime?.() ?? 0) - (a.addedAt?.getTime?.() ?? 0)));
  });
}

export async function addToCollection(uid: string, parfumId: string, nom?: string, marque?: string, imageUrl?: string): Promise<string> {
  const existing = await getDocs(query(collCol(uid), where('parfumId', '==', parfumId), limit(1)));
  if (!existing.empty) return existing.docs[0].id;
  const ref = await addDoc(collCol(uid), {
    parfumId, nom: nom ?? null, marque: marque ?? null, imageUrl: imageUrl ?? null, addedAt: new Date(),
  });
  return ref.id;
}

export async function removeFromCollection(uid: string, itemId: string): Promise<void> {
  await deleteDoc(doc(collCol(uid), itemId));
}

export async function moveToCollection(uid: string, fromTab: string, fromItemId: string, parfumId: string, nom?: string | null, marque?: string | null, imageUrl?: string | null): Promise<void> {
  const batch = writeBatch(db);
  if (fromTab === 'favoris') batch.delete(doc(favCol(uid), fromItemId));
  else if (fromTab === 'wishlist') batch.delete(doc(wishCol(uid), fromItemId));
  const collRef = doc(collCol(uid));
  batch.set(collRef, { parfumId, nom: nom ?? null, marque: marque ?? null, imageUrl: imageUrl ?? null, addedAt: new Date() });
  await batch.commit();
}

export async function isInCollection(uid: string, parfumId: string): Promise<{ isInCollection: boolean; itemId: string | null }> {
  try {
    const snap = await getDocs(query(collCol(uid), where('parfumId', '==', parfumId), limit(1)));
    if (!snap.empty) return { isInCollection: true, itemId: snap.docs[0].id };
    return { isInCollection: false, itemId: null };
  } catch {
    return { isInCollection: false, itemId: null };
  }
}

export function onWishlist(uid: string, cb: (items: UserWishlistItem[]) => void): () => void {
  return onSnapshot(wishCol(uid), (snap) => {
    if (!snap) { cb([]); return; }
    cb(snap.docs.map((d) => ({ id: d.id, ...d.data() } as UserWishlistItem))
      .sort((a, b) => (b.addedAt?.getTime?.() ?? 0) - (a.addedAt?.getTime?.() ?? 0)));
  });
}

export async function addToWishlist(uid: string, parfumId: string, nom?: string, marque?: string, imageUrl?: string, familleOlactive?: string): Promise<string> {
  const existing = await getDocs(query(wishCol(uid), where('parfumId', '==', parfumId), limit(1)));
  if (!existing.empty) return existing.docs[0].id;
  const ref = await addDoc(wishCol(uid), {
    parfumId, nom: nom ?? null, marque: marque ?? null, imageUrl: imageUrl ?? null, familleOlactive: familleOlactive ?? null, addedAt: new Date(),
  });
  return ref.id;
}

export async function removeFromWishlist(uid: string, itemId: string): Promise<void> {
  await deleteDoc(doc(wishCol(uid), itemId));
}

export async function moveToWishlist(uid: string, fromTab: string, fromItemId: string, parfumId: string, nom?: string | null, marque?: string | null, imageUrl?: string | null, familleOlactive?: string | null): Promise<void> {
  const batch = writeBatch(db);
  if (fromTab === 'favoris') batch.delete(doc(favCol(uid), fromItemId));
  else if (fromTab === 'collection') batch.delete(doc(collCol(uid), fromItemId));
  const wishRef = doc(wishCol(uid));
  batch.set(wishRef, { parfumId, nom: nom ?? null, marque: marque ?? null, imageUrl: imageUrl ?? null, familleOlactive: familleOlactive ?? null, addedAt: new Date() });
  await batch.commit();
}

export async function moveFavori(uid: string, fromTab: string, fromItemId: string, parfumId: string, nom?: string | null, marque?: string | null, imageUrl?: string | null, familleOlactive?: string | null): Promise<void> {
  const batch = writeBatch(db);
  if (fromTab === 'collection') batch.delete(doc(collCol(uid), fromItemId));
  else if (fromTab === 'wishlist') batch.delete(doc(wishCol(uid), fromItemId));
  const favRef = doc(favCol(uid));
  batch.set(favRef, { parfumId, nom: nom ?? null, marque: marque ?? null, imageUrl: imageUrl ?? null, familleOlactive: familleOlactive ?? null, addedAt: new Date() });
  await batch.commit();
}

export async function isInWishlist(uid: string, parfumId: string): Promise<{ isInWishlist: boolean; itemId: string | null }> {
  try {
    const snap = await getDocs(query(wishCol(uid), where('parfumId', '==', parfumId), limit(1)));
    if (!snap.empty) return { isInWishlist: true, itemId: snap.docs[0].id };
    return { isInWishlist: false, itemId: null };
  } catch {
    return { isInWishlist: false, itemId: null };
  }
}

const settingsCol = (uid: string) => collection(db, `users/${uid}/settings`);

export async function getUserSettings(uid: string): Promise<{ priceAlerts: boolean; pushNotifs: boolean }> {
  try {
    const snap = await getDoc(doc(settingsCol(uid), 'preferences'));
    const d = (snap as DocumentSnapshot<DocumentData, DocumentData>).data();
    if (d) {
      return { priceAlerts: d.priceAlerts === true, pushNotifs: d.pushNotifs !== false };
    }
  } catch {}
  return { priceAlerts: false, pushNotifs: true };
}

export async function updateUserSetting(uid: string, key: 'priceAlerts' | 'pushNotifs', value: boolean): Promise<void> {
  await setDoc(doc(settingsCol(uid), 'preferences'), { [key]: value }, { merge: true });
}

function alertsCol(uid: string) { return collection(db, `users/${uid}/priceAlerts`); }

export async function isPriceAlertActive(uid: string, parfumId: string): Promise<boolean> {
  try {
    const snap = await getDocs(query(alertsCol(uid), where('parfumId', '==', parfumId), limit(1)));
    return !snap.empty;
  } catch { return false; }
}

export async function setPriceAlert(uid: string, parfumId: string, active: boolean): Promise<void> {
  if (active) {
    const existing = await getDocs(query(alertsCol(uid), where('parfumId', '==', parfumId), limit(1)));
    if (!existing.empty) return;
    await addDoc(alertsCol(uid), { parfumId, addedAt: new Date() });
  } else {
    const snap = await getDocs(query(alertsCol(uid), where('parfumId', '==', parfumId), limit(1)));
    const batch = writeBatch(db);
    snap.docs.forEach(d => batch.delete(d.ref));
    if (!snap.empty) await batch.commit();
  }
}
