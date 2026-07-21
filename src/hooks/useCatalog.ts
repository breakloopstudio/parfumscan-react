// src/hooks/useCatalog.ts — Recherche catalogue Firestore (100% cache local)
// Rate limit : 30 recherches/min max (protection anti-abus)

import { useState, useCallback, useRef, useEffect } from 'react';
import type { Parfum } from '../models';
import { searchParfumsCached } from '../services/firestore';

const MAX_SEARCHES_PER_MINUTE = 30;
const RATE_WINDOW_MS = 60_000;

export function useCatalog() {
  const [parfums, setParfums] = useState<Parfum[]>([]);
  const [searching, setSearching] = useState(false);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const requestIdRef = useRef(0);
  const mountedRef = useRef(true);
  const searchTimestampsRef = useRef<number[]>([]);

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
        // Rate limit : sliding window, max N appels Firestore par minute
        const now = Date.now();
        const windowStart = now - RATE_WINDOW_MS;
        const timestamps = searchTimestampsRef.current;
        while (timestamps.length > 0 && timestamps[0] < windowStart) {
          timestamps.shift();
        }
        if (timestamps.length >= MAX_SEARCHES_PER_MINUTE) {
          if (mountedRef.current && requestIdRef.current === id) {
            setSearching(false);
          }
          return;
        }
        timestamps.push(now);

        const results = await searchParfumsCached(q);
        if (mountedRef.current && requestIdRef.current === id) {
          setParfums(results);
          setSearching(false);
        }
      } catch (err) {
        console.warn('[useCatalog] search failed:', (err as Error)?.message ?? String(err));
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
