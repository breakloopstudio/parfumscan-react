// src/services/wardrobe.ts — CRUD Firestore pour la Wardrobe

import { getFirestore, collection, doc, query, getDoc, getDocs, setDoc, deleteDoc, writeBatch, onSnapshot, Timestamp } from '@react-native-firebase/firestore';
import type { WardrobeItem, Shelf, SotdEntry } from '../models/wardrobe.interface';

const db = getFirestore();

function wCol(uid: string) { return collection(db, `users/${uid}/wardrobe`); }
function shCol(uid: string) { return collection(db, `users/${uid}/shelves`); }
function sCol(uid: string) { return collection(db, `users/${uid}/sotd`); }

function today(): string {
  const d = new Date();
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

function docToWardrobeItem(docId: string, data: Record<string, unknown>): WardrobeItem {
  const addedAt = (data.addedAt as Timestamp)?.toDate?.() ?? new Date();
  const updatedAt = (data.updatedAt as Timestamp)?.toDate?.() ?? addedAt;
  return {
    parfumId: (data.parfumId as string) ?? docId,
    nom: (data.nom as string) ?? null,
    marque: (data.marque as string) ?? null,
    imageUrl: (data.imageUrl as string) ?? null,
    familleOlactive: (data.familleOlactive as string) ?? null,
    ownership: (data.ownership as WardrobeItem['ownership']) ?? 'have',
    rating: typeof data.rating === 'number' ? data.rating : null,
    notes: (data.notes as string) ?? null,
    shelfIds: Array.isArray(data.shelfIds) ? data.shelfIds as string[] : [],
    sizeMl: typeof data.sizeMl === 'number' ? data.sizeMl : null,
    sotdCount: typeof data.sotdCount === 'number' ? data.sotdCount : 0,
    isSignature: data.isSignature === true,
    addedAt,
    updatedAt,
  };
}

function docToShelf(docId: string, data: Record<string, unknown>): Shelf {
  return {
    id: docId,
    name: (data.name as string) ?? '',
    icon: (data.icon as string) ?? null,
    color: (data.color as string) ?? null,
    order: typeof data.order === 'number' ? data.order : 0,
    createdAt: (data.createdAt as Timestamp)?.toDate?.() ?? new Date(),
  };
}

// ── Wardrobe ──

export function onWardrobe(uid: string, cb: (items: WardrobeItem[]) => void): () => void {
  return onSnapshot(wCol(uid), (snap) => {
    if (!snap) { cb([]); return; }
    cb(snap.docs.map(d => docToWardrobeItem(d.id, d.data())));
  }, (err) => { console.warn('[wardrobe] onWardrobe error:', err.message); cb([]); });
}

export async function addToWardrobe(
  uid: string, parfumId: string, ownership: WardrobeItem['ownership'],
  nom?: string, marque?: string, imageUrl?: string, familleOlactive?: string,
  sizeMl?: number | null,
): Promise<void> {
  const dRef = doc(wCol(uid), parfumId);
  const now = new Date();
  await setDoc(dRef, {
    parfumId,
    ownership,
    nom: nom ?? null,
    marque: marque ?? null,
    imageUrl: imageUrl ?? null,
    familleOlactive: familleOlactive ?? null,
    rating: null,
    notes: null,
    shelfIds: [],
    sizeMl: sizeMl ?? null,
    sotdCount: 0,
    isSignature: false,
    addedAt: now,
    updatedAt: now,
  }, { merge: true });
}

export async function updateWardrobeItem(
  uid: string, parfumId: string,
  data: Partial<Pick<WardrobeItem, 'ownership' | 'rating' | 'notes' | 'shelfIds' | 'sizeMl' | 'isSignature'>>,
): Promise<void> {
  const dRef = doc(wCol(uid), parfumId);
  await setDoc(dRef, { ...data, updatedAt: new Date() }, { merge: true });
}

export async function removeFromWardrobe(uid: string, parfumId: string): Promise<void> {
  await deleteDoc(doc(wCol(uid), parfumId));
}

export async function isInWardrobe(uid: string, parfumId: string): Promise<WardrobeItem | null> {
  try {
    const snap = await getDoc(doc(wCol(uid), parfumId));
    const d = snap.data();
    if (d) return docToWardrobeItem(snap.id, d);
    return null;
  } catch { return null; }
}

// ── Shelves ──

export function onShelves(uid: string, cb: (shelves: Shelf[]) => void): () => void {
  return onSnapshot(shCol(uid), (snap) => {
    if (!snap) { cb([]); return; }
    cb(snap.docs.map(d => docToShelf(d.id, d.data())));
  }, (err) => { console.warn('[wardrobe] onShelves error:', err.message); cb([]); });
}

export async function createShelf(uid: string, name: string, icon?: string, color?: string): Promise<string> {
  const existing = await getDocs(shCol(uid));
  const nextOrder = existing.docs.length;
  const dRef = doc(shCol(uid));
  await setDoc(dRef, {
    name,
    icon: icon ?? null,
    color: color ?? null,
    order: nextOrder,
    createdAt: new Date(),
  });
  return dRef.id;
}

export async function updateShelf(uid: string, shelfId: string, data: Partial<Pick<Shelf, 'name' | 'icon' | 'color' | 'order'>>): Promise<void> {
  await setDoc(doc(shCol(uid), shelfId), data, { merge: true });
}

export async function deleteShelf(uid: string, shelfId: string): Promise<void> {
  const batch = writeBatch(db);
  batch.delete(doc(shCol(uid), shelfId));

  const wSnap = await getDocs(wCol(uid));
  for (const wDoc of wSnap.docs) {
    const shelfIds: string[] = wDoc.data().shelfIds ?? [];
    if (shelfIds.includes(shelfId)) {
      batch.update(doc(wCol(uid), wDoc.id), {
        shelfIds: shelfIds.filter((id: string) => id !== shelfId),
        updatedAt: new Date(),
      });
    }
  }

  await batch.commit();
}

// ── SOTD ──

export async function getTodaySotd(uid: string): Promise<SotdEntry | null> {
  try {
    const snap = await getDoc(doc(sCol(uid), today()));
    const d = snap.data();
    if (d) {
      return {
        parfumId: d.parfumId as string,
        nom: d.nom as string,
        marque: d.marque as string,
        imageUrl: (d.imageUrl as string) ?? null,
      };
    }
    return null;
  } catch { return null; }
}

export async function setSotd(uid: string, parfumId: string, nom: string, marque: string, imageUrl?: string | null): Promise<void> {
  const batch = writeBatch(db);
  batch.set(doc(sCol(uid), today()), {
    parfumId,
    nom,
    marque,
    imageUrl: imageUrl ?? null,
  });
  const wSnap = await getDoc(doc(wCol(uid), parfumId));
  const wData = wSnap.data();
  const currentCount: number = (wData?.sotdCount as number) ?? 0;
  batch.update(doc(wCol(uid), parfumId), {
    sotdCount: currentCount + 1,
    updatedAt: new Date(),
  });
  await batch.commit();
}
