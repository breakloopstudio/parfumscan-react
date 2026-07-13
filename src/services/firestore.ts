// src/services/firestore.ts — CRUD collection `parfums`
// Compatible Expo Go (dégradé si Firebase natif non dispo)

import type { Parfum } from '../models';

let _firestore: any = null;
try { _firestore = require('@react-native-firebase/firestore').default; } catch {}

const col = () => _firestore?.().collection('parfums');

export function onParfums(cb: (parfums: Parfum[]) => void): () => void {
  if (!_firestore) { cb([]); return () => {}; }
  const q = col().orderBy('createdAt', 'desc');
  return q.onSnapshot((snap: any) => cb(snap.docs.map((d: any) => ({ id: d.id, ...d.data() } as Parfum))));
}

export async function getParfumById(id: string): Promise<Parfum | undefined> {
  if (!_firestore) return undefined;
  const snap = await col().doc(id).get();
  return snap.exists ? ({ id: snap.id, ...snap.data() } as Parfum) : undefined;
}

export function onParfumsByMarque(marque: string, cb: (parfums: Parfum[]) => void): () => void {
  if (!_firestore) { cb([]); return () => {}; }
  const q = col().where('marque', '>=', marque).where('marque', '<=', marque + '\uf8ff');
  return q.onSnapshot((snap: any) => {
    cb(snap.docs.map((d: any) => ({ id: d.id, ...d.data() } as Parfum))
      .filter((p: Parfum) => p.marque.toLowerCase().includes(marque.toLowerCase())));
  });
}

export async function createParfum(data: Omit<Parfum, 'id' | 'createdAt' | 'updatedAt'>): Promise<any> {
  if (!_firestore) throw new Error('Firebase non disponible');
  const now = new Date();
  return col().add({ ...data, createdAt: now, updatedAt: now });
}

export async function updateParfum(id: string, data: Partial<Omit<Parfum, 'id' | 'createdAt' | 'updatedAt'>>): Promise<void> {
  if (!_firestore) return;
  await col().doc(id).update({ ...data, updatedAt: new Date() });
}

export async function deleteParfum(id: string): Promise<void> {
  if (!_firestore) return;
  await col().doc(id).delete();
}

export async function seedCatalog(parfums: Array<Omit<Parfum, 'id' | 'createdAt' | 'updatedAt'>>): Promise<number> {
  if (!_firestore) return 0;
  const batch = _firestore().batch();
  const now = new Date();
  let count = 0;
  for (const p of parfums) {
    if (count >= 500) break;
    batch.set(col().doc(), { ...p, createdAt: now, updatedAt: now });
    count++;
  }
  await batch.commit();
  return count;
}