// src/hooks/useCatalog.ts — Recherche catalogue Firestore (100% cache local)

import { useState, useCallback, useRef, useEffect } from 'react';
import type { Parfum } from '../models';
import { searchParfumsCached } from '../services/firestore';

export function useCatalog() {
  const [parfums, setParfums] = useState<Parfum[]>([]);
  const [searching, setSearching] = useState(false);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const requestIdRef = useRef(0);
  const mountedRef = useRef(true);

  useEffect(() => {
    return () => { mountedRef.current = false; if (timerRef.current) clearTimeout(timerRef.current); };
  }, []);

  const search = useCallback((query: string) => {
    if (timerRef.current) clearTimeout(timerRef.current);
    const q = query.trim();
    if (q.length < 3) { setParfums([]); setSearching(false); return; }
    setSearching(true);
    const id = ++requestIdRef.current;
    timerRef.current = setTimeout(async () => {
      try {
        const results = await searchParfumsCached(q);
        if (mountedRef.current && requestIdRef.current === id) {
          setParfums(results);
          setSearching(false);
        }
      } catch {
        if (mountedRef.current && requestIdRef.current === id) {
          setSearching(false);
        }
      }
    }, 150);
  }, []);

  const clear = useCallback(() => {
    if (timerRef.current) clearTimeout(timerRef.current);
    requestIdRef.current++;
    setParfums([]);
    setSearching(false);
  }, []);

  return { parfums, searching, search, clear };
}
