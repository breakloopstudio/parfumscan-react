// src/hooks/useFavoris.ts — Favoris temps réel

import { useState, useEffect, useCallback } from 'react';
import { onFavoris, addFavori as add, removeFavori as remove } from '../services/user-data';
import type { UserFavori } from '../models';

export function useFavoris(uid: string | null) {
  const [favoris, setFavoris] = useState<UserFavori[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!uid) { setFavoris([]); setLoading(false); return; }
    setLoading(true);
    const unsub = onFavoris(uid, (data) => { setFavoris(data); setLoading(false); });
    return unsub;
  }, [uid]);

  const addFavori = useCallback(async (parfumId: string, nom?: string, marque?: string) => {
    if (!uid) return;
    await add(uid, parfumId, nom, marque);
  }, [uid]);

  const removeFavori = useCallback(async (favoriId: string) => {
    if (!uid) return;
    await remove(uid, favoriId);
  }, [uid]);

  return { favoris, loading, addFavori, removeFavori };
}
