// src/hooks/useCatalog.ts — Recherche catalogue avec debounce + cleanup

import { useState, useCallback, useRef, useEffect } from 'react';
import { searchFragranceByQuery, fragellaToParfum, type FragranceResult, type ParfumSearchResult } from '../services/fragella';

export function useCatalog() {
  const [results, setResults] = useState<FragranceResult[]>([]);
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
    if (q.length < 3) { setResults([]); setParfums([]); return; }
    setSearching(true);
    timerRef.current = setTimeout(async () => {
      const r = await searchFragranceByQuery(q);
      if (mountedRef.current) {
        setResults(r);
        setParfums(r.map(f => fragellaToParfum(f)));
        setSearching(false);
      }
    }, 800);
  }, []);

  const clear = useCallback(() => {
    if (timerRef.current) clearTimeout(timerRef.current);
    setResults([]);
    setParfums([]);
    setSearching(false);
  }, []);

  return { results, parfums, searching, search, clear };
}
