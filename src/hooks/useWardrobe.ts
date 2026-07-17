// src/hooks/useWardrobe.ts

import { useState, useEffect } from 'react';
import { onWardrobe, addToWardrobe, updateWardrobeItem, removeFromWardrobe, isInWardrobe } from '../services/wardrobe';
import type { WardrobeItem } from '../models/wardrobe.interface';

export function useWardrobe(uid: string | null) {
  const [items, setItems] = useState<WardrobeItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!uid) { setItems([]); setLoading(false); return; }
    setLoading(true);
    const unsub = onWardrobe(uid, (data) => { setItems(data); setLoading(false); });
    return () => unsub();
  }, [uid]);

  const add = async (parfumId: string, ownership: WardrobeItem['ownership'], nom?: string, marque?: string, imageUrl?: string, familleOlactive?: string) => {
    if (!uid) return;
    await addToWardrobe(uid, parfumId, ownership, nom, marque, imageUrl, familleOlactive);
  };

  const update = async (parfumId: string, data: Parameters<typeof updateWardrobeItem>[2]) => {
    if (!uid) return;
    await updateWardrobeItem(uid, parfumId, data);
  };

  const remove = async (parfumId: string) => {
    if (!uid) return;
    await removeFromWardrobe(uid, parfumId);
  };

  const checkInWardrobe = async (parfumId: string) => {
    if (!uid) return null;
    return isInWardrobe(uid, parfumId);
  };

  return { items, loading, add, update, remove, checkInWardrobe };
}
