// src/hooks/useScans.ts — Historique scans temps réel

import { useState, useEffect, useCallback } from 'react';
import { onScans, saveScan as save, removeScan as remove } from '../services/user-data';
import type { UserScan } from '../models';

export function useScans(uid: string | null) {
  const [scans, setScans] = useState<UserScan[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!uid) { setScans([]); setLoading(false); return; }
    setLoading(true);
    const unsub = onScans(uid, (data) => { setScans(data); setLoading(false); });
    return unsub;
  }, [uid]);

  const saveScan = useCallback(async (data: Omit<UserScan, 'id' | 'scannedAt'>) => {
    if (!uid) return;
    await save(uid, data);
  }, [uid]);

  const removeScan = useCallback(async (scanId: string) => {
    if (!uid) return;
    await remove(uid, scanId);
  }, [uid]);

  return { scans, loading, saveScan, removeScan };
}
