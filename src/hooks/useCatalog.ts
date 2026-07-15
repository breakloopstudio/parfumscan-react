// src/hooks/useCatalog.ts — Recherche catalogue avec cache-first Firestore + debounce

import { useState, useCallback, useRef, useEffect } from 'react';
import { searchFragranceByQuery, fragellaToParfum, type ParfumSearchResult } from '../services/fragella';
import { searchParfumsCached, batchCacheParfums } from '../services/firestore';

export function useCatalog() {
  const [parfums, setParfums] = useState<ParfumSearchResult[]>([]);
  const [searching, setSearching] = useState(false);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const mountedRef = useRef(true);

  useEffect(() => {
    return () => { mountedRef.current = false; if (timerRef.current) clearTimeout(timerRef.current); };
  }, []);

  const search = useCallback((query: string) => {
    if (timerRef.current) clearTimeout(timerRef.current);
    const q = query.trim();
    if (q.length < 3) { setParfums([]); return; }
    setSearching(true);
    timerRef.current = setTimeout(async () => {
      // Étape 1 : Chercher dans le cache Firestore (gratuit)
      const cached = await searchParfumsCached(q);
      if (mountedRef.current && cached.length >= 5) {
        setParfums(cached);
        setSearching(false);
        return;
      }

      // Étape 2 : Fallback API Fragella (payant)
      const r = await searchFragranceByQuery(q);
      if (mountedRef.current) {
        const mapped = r.map(f => fragellaToParfum(f));
        setParfums(mapped);
        setSearching(false);

        // Étape 3 : Cacher automatiquement pour les prochaines recherches
        if (mapped.length > 0) {
          batchCacheParfums(mapped).catch(() => {});
        }
      }
    }, 800);
  }, []);

  const clear = useCallback(() => {
    if (timerRef.current) clearTimeout(timerRef.current);
    setParfums([]);
    setSearching(false);
  }, []);

  return { parfums, searching, search, clear };
}
