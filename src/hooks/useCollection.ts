// src/hooks/useCollection.ts — Collection temps réel (parfums possédés)

import { useState, useEffect, useCallback } from 'react';
import { onCollection, addToCollection, removeFromCollection } from '../services/user-data';
import type { UserCollectionItem } from '../models';

export function useCollection(uid: string | null) {
  const [items, setItems] = useState<UserCollectionItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!uid) { setItems([]); setLoading(false); return; }
    setLoading(true);
    const unsub = onCollection(uid, (data) => { setItems(data); setLoading(false); });
    return unsub;
  }, [uid]);

  const add = useCallback(async (parfumId: string, nom?: string, marque?: string, imageUrl?: string) => {
    if (!uid) return;
    await addToCollection(uid, parfumId, nom, marque, imageUrl);
  }, [uid]);

  const remove = useCallback(async (itemId: string) => {
    if (!uid) return;
    await removeFromCollection(uid, itemId);
  }, [uid]);

  return { items, loading, add, remove };
}
