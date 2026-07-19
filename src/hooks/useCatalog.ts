// src/hooks/useCatalog.ts — Recherche catalogue Firestore (100% cache local)

import { useState, useCallback, useRef, useEffect } from 'react';
import type { Parfum } from '../models';
import { searchParfumsCached } from '../services/firestore';

export function useCatalog() {
  const [parfums, setParfums] = useState<Parfum[]>([]);
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
      const results = await searchParfumsCached(q);
      if (mountedRef.current) {
        setParfums(results);
        setSearching(false);
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
