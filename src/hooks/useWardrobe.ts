// src/hooks/useWardrobe.ts

import { useState, useEffect, useCallback } from 'react';
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

  const add = useCallback(async (parfumId: string, ownership: WardrobeItem['ownership'], nom?: string, marque?: string, imageUrl?: string, familleOlactive?: string) => {
    if (!uid) return;
    await addToWardrobe(uid, parfumId, ownership, nom, marque, imageUrl, familleOlactive);
  }, [uid]);

  const update = useCallback(async (parfumId: string, data: Parameters<typeof updateWardrobeItem>[2]) => {
    if (!uid) return;
    await updateWardrobeItem(uid, parfumId, data);
  }, [uid]);

  const remove = useCallback(async (parfumId: string) => {
    if (!uid) return;
    await removeFromWardrobe(uid, parfumId);
  }, [uid]);

  const checkInWardrobe = useCallback(async (parfumId: string) => {
    if (!uid) return null;
    return isInWardrobe(uid, parfumId);
  }, [uid]);

  return { items, loading, add, update, remove, checkInWardrobe };
}
