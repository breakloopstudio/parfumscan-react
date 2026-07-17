// src/hooks/useShelves.ts

import { useState, useEffect } from 'react';
import { onShelves, createShelf, updateShelf, deleteShelf } from '../services/wardrobe';
import type { Shelf } from '../models/wardrobe.interface';

export function useShelves(uid: string | null) {
  const [shelves, setShelves] = useState<Shelf[]>([]);

  useEffect(() => {
    if (!uid) { setShelves([]); return; }
    const unsub = onShelves(uid, (data) => { setShelves(data); });
    return () => unsub();
  }, [uid]);

  const create = async (name: string, icon?: string, color?: string) => {
    if (!uid) return;
    await createShelf(uid, name, icon, color);
  };

  const update = async (shelfId: string, data: Parameters<typeof updateShelf>[2]) => {
    if (!uid) return;
    await updateShelf(uid, shelfId, data);
  };

  const remove = async (shelfId: string) => {
    if (!uid) return;
    await deleteShelf(uid, shelfId);
  };

  return { shelves, create, update, remove };
}
