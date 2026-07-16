// src/hooks/useWishlist.ts — Wishlist temps réel (envies d'achat)

import { useState, useEffect, useCallback } from 'react';
import { onWishlist, addToWishlist, removeFromWishlist } from '../services/user-data';
import type { UserWishlistItem } from '../models';

export function useWishlist(uid: string | null) {
  const [items, setItems] = useState<UserWishlistItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!uid) { setItems([]); setLoading(false); return; }
    setLoading(true);
    const unsub = onWishlist(uid, (data) => { setItems(data); setLoading(false); });
    return unsub;
  }, [uid]);

  const add = useCallback(async (parfumId: string, nom?: string, marque?: string, imageUrl?: string, familleOlactive?: string) => {
    if (!uid) return;
    await addToWishlist(uid, parfumId, nom, marque, imageUrl, familleOlactive);
  }, [uid]);

  const remove = useCallback(async (itemId: string) => {
    if (!uid) return;
    await removeFromWishlist(uid, itemId);
  }, [uid]);

  return { items, loading, add, remove };
}
