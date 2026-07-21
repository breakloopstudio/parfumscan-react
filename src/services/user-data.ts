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
  }, (err) => { console.warn('[user-data] onFavoris error:', err.message); cb([]); });
}

export async function addFavori(uid: string, parfumId: string, nom?: string, marque?: string, imageUrl?: string, familleOlactive?: string, bestPrice?: number, referencePrice?: number, annee?: number): Promise<string> {
  try {
    const dRef = doc(favCol(uid), parfumId);
    await setDoc(dRef, { parfumId, nom: nom ?? null, marque: marque ?? null, imageUrl: imageUrl ?? null, familleOlactive: familleOlactive ?? null, bestPrice: bestPrice ?? null, referencePrice: referencePrice ?? null, annee: annee ?? null, addedAt: new Date() }, { merge: true });
    return dRef.id;
  } catch (e: unknown) {
    console.warn('[user-data] addFavori failed:', (e as Error)?.message ?? String(e));
    throw e;
  }
}

export async function removeFavori(uid: string, favoriId: string): Promise<void> {
  try {
    await deleteDoc(doc(favCol(uid), favoriId));
  } catch (e: unknown) {
    console.warn('[user-data] removeFavori failed:', (e as Error)?.message ?? String(e));
  }
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
  }, (err) => { console.warn('[user-data] onScans error:', err.message); cb([]); });
}

export async function saveScan(uid: string, scanData: Omit<UserScan, 'id' | 'scannedAt'>): Promise<void> {
  try {
    const clean = Object.fromEntries(
      Object.entries({ ...scanData, scannedAt: new Date() }).filter(([_, v]) => v !== undefined)
    );
    await addDoc(scanCol(uid), clean);
  } catch (e: unknown) {
    console.warn('[user-data] saveScan failed:', (e as Error)?.message ?? String(e));
  }
}

export async function removeScan(uid: string, scanId: string): Promise<void> {
  try {
    await deleteDoc(doc(scanCol(uid), scanId));
  } catch (e: unknown) {
    console.warn('[user-data] removeScan failed:', (e as Error)?.message ?? String(e));
  }
}

export function onCollection(uid: string, cb: (items: UserCollectionItem[]) => void): () => void {
  return onSnapshot(collCol(uid), (snap) => {
    if (!snap) { cb([]); return; }
    cb(snap.docs.map((d) => ({ id: d.id, ...d.data() } as UserCollectionItem))
      .sort((a, b) => ((b.addedAt as unknown as { toDate?: () => Date })?.toDate?.()?.getTime?.() ?? 0) - ((a.addedAt as unknown as { toDate?: () => Date })?.toDate?.()?.getTime?.() ?? 0)));
  }, (err) => { console.warn('[user-data] onCollection error:', err.message); cb([]); });
}

export async function addToCollection(uid: string, parfumId: string, nom?: string, marque?: string, imageUrl?: string): Promise<string> {
  try {
    const dRef = doc(collCol(uid), parfumId);
    await setDoc(dRef, {
      parfumId, nom: nom ?? null, marque: marque ?? null, imageUrl: imageUrl ?? null, addedAt: new Date(),
    }, { merge: true });
    return dRef.id;
  } catch (e: unknown) {
    console.warn('[user-data] addToCollection failed:', (e as Error)?.message ?? String(e));
    const dRef = doc(collCol(uid), parfumId);
    return dRef.id;
  }
}

export async function removeFromCollection(uid: string, itemId: string): Promise<void> {
  try {
    await deleteDoc(doc(collCol(uid), itemId));
  } catch (e: unknown) {
    console.warn('[user-data] removeFromCollection failed:', (e as Error)?.message ?? String(e));
  }
}

export async function moveToCollection(uid: string, fromTab: string, fromItemId: string, parfumId: string, nom?: string | null, marque?: string | null, imageUrl?: string | null): Promise<void> {
  try {
    const batch = writeBatch(db);
    if (fromTab === 'favoris') batch.delete(doc(favCol(uid), fromItemId));
    else if (fromTab === 'wishlist') batch.delete(doc(wishCol(uid), fromItemId));
    batch.set(doc(collCol(uid), parfumId), { parfumId, nom: nom ?? null, marque: marque ?? null, imageUrl: imageUrl ?? null, addedAt: new Date() }, { merge: true });
    await batch.commit();
  } catch (e: unknown) {
    console.warn('[user-data] moveToCollection failed:', (e as Error)?.message ?? String(e));
  }
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
      .sort((a, b) => ((b.addedAt as unknown as { toDate?: () => Date })?.toDate?.()?.getTime?.() ?? 0) - ((a.addedAt as unknown as { toDate?: () => Date })?.toDate?.()?.getTime?.() ?? 0)));
  }, (err) => { console.warn('[user-data] onWishlist error:', err.message); cb([]); });
}

export async function addToWishlist(uid: string, parfumId: string, nom?: string, marque?: string, imageUrl?: string, familleOlactive?: string): Promise<string> {
  try {
    const dRef = doc(wishCol(uid), parfumId);
    await setDoc(dRef, {
      parfumId, nom: nom ?? null, marque: marque ?? null, imageUrl: imageUrl ?? null, familleOlactive: familleOlactive ?? null, addedAt: new Date(),
    }, { merge: true });
    return dRef.id;
  } catch (e: unknown) {
    console.warn('[user-data] addToWishlist failed:', (e as Error)?.message ?? String(e));
    const dRef = doc(wishCol(uid), parfumId);
    return dRef.id;
  }
}

export async function removeFromWishlist(uid: string, itemId: string): Promise<void> {
  try {
    await deleteDoc(doc(wishCol(uid), itemId));
  } catch (e: unknown) {
    console.warn('[user-data] removeFromWishlist failed:', (e as Error)?.message ?? String(e));
  }
}

export async function moveToWishlist(uid: string, fromTab: string, fromItemId: string, parfumId: string, nom?: string | null, marque?: string | null, imageUrl?: string | null, familleOlactive?: string | null): Promise<void> {
  try {
    const batch = writeBatch(db);
    if (fromTab === 'favoris') batch.delete(doc(favCol(uid), fromItemId));
    else if (fromTab === 'collection') batch.delete(doc(collCol(uid), fromItemId));
    batch.set(doc(wishCol(uid), parfumId), { parfumId, nom: nom ?? null, marque: marque ?? null, imageUrl: imageUrl ?? null, familleOlactive: familleOlactive ?? null, addedAt: new Date() }, { merge: true });
    await batch.commit();
  } catch (e: unknown) {
    console.warn('[user-data] moveToWishlist failed:', (e as Error)?.message ?? String(e));
  }
}

export async function moveFavori(uid: string, fromTab: string, fromItemId: string, parfumId: string, nom?: string | null, marque?: string | null, imageUrl?: string | null, familleOlactive?: string | null): Promise<void> {
  try {
    const batch = writeBatch(db);
    if (fromTab === 'collection') batch.delete(doc(collCol(uid), fromItemId));
    else if (fromTab === 'wishlist') batch.delete(doc(wishCol(uid), fromItemId));
    batch.set(doc(favCol(uid), parfumId), { parfumId, nom: nom ?? null, marque: marque ?? null, imageUrl: imageUrl ?? null, familleOlactive: familleOlactive ?? null, addedAt: new Date() }, { merge: true });
    await batch.commit();
  } catch (e: unknown) {
    console.warn('[user-data] moveFavori failed:', (e as Error)?.message ?? String(e));
  }
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
  } catch (e: unknown) { console.warn('[user-data] getUserSettings failed:', (e as Error)?.message ?? String(e)); }
  return { priceAlerts: false, pushNotifs: true };
}

export async function updateUserSetting(uid: string, key: 'priceAlerts' | 'pushNotifs', value: boolean): Promise<void> {
  try {
    await setDoc(doc(settingsCol(uid), 'preferences'), { [key]: value }, { merge: true });
  } catch (e: unknown) {
    console.warn('[user-data] updateUserSetting failed:', (e as Error)?.message ?? String(e));
  }
}

function alertsCol(uid: string) { return collection(db, `users/${uid}/priceAlerts`); }

export async function isPriceAlertActive(uid: string, parfumId: string): Promise<boolean> {
  try {
    const snap = await getDocs(query(alertsCol(uid), where('parfumId', '==', parfumId), limit(1)));
    return !snap.empty;
  } catch { return false; }
}

export async function setPriceAlert(uid: string, parfumId: string, active: boolean, currentPrice?: number): Promise<void> {
  const dRef = doc(alertsCol(uid), parfumId);
  if (active) {
    await setDoc(dRef, {
      parfumId,
      addedAt: new Date(),
      lastPrice: currentPrice ?? null,
      lastChecked: new Date(),
    }, { merge: true });
  } else {
    await deleteDoc(dRef).catch(() => {});
  }
}
