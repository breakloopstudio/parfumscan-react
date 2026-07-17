// src/utils/ownership.ts

import type { WardrobeItem } from '../models/wardrobe.interface';

export const OWNERSHIP_LABELS: Record<WardrobeItem['ownership'], string> = {
  have: 'Possédé',
  want: 'Souhaité',
  had: 'Ancien',
  sample: 'Échantillon',
  decant: 'Décant',
};

export function ownershipLabel(o: WardrobeItem['ownership']): string {
  return OWNERSHIP_LABELS[o];
}

export function wardrobeToCardItem(item: WardrobeItem) {
  return {
    id: item.parfumId,
    nom: item.nom ?? item.parfumId.replace(/_/g, ' '),
    marque: item.marque ?? '',
    imageUrl: item.imageUrl ?? undefined,
    familleOlactive: item.familleOlactive ?? '',
    notesTete: [] as string[],
    notesCoeur: [] as string[],
    notesFond: [] as string[],
    source: 'fragella' as const,
  };
}
