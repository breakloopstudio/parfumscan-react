import { OWNERSHIP_LABELS, ownershipLabel, wardrobeToCardItem } from '../../src/utils/ownership';
import type { WardrobeItem } from '../../src/models/wardrobe.interface';

describe('OWNERSHIP_LABELS', () => {
  it('has all 5 ownership states', () => {
    expect(OWNERSHIP_LABELS).toHaveProperty('have');
    expect(OWNERSHIP_LABELS).toHaveProperty('want');
    expect(OWNERSHIP_LABELS).toHaveProperty('had');
    expect(OWNERSHIP_LABELS).toHaveProperty('sample');
    expect(OWNERSHIP_LABELS).toHaveProperty('decant');
    expect(Object.keys(OWNERSHIP_LABELS)).toHaveLength(5);
  });

  it('has French labels', () => {
    expect(OWNERSHIP_LABELS.have).toBe('Possédé');
    expect(OWNERSHIP_LABELS.want).toBe('Souhaité');
    expect(OWNERSHIP_LABELS.had).toBe('Ancien');
    expect(OWNERSHIP_LABELS.sample).toBe('Échantillon');
    expect(OWNERSHIP_LABELS.decant).toBe('Décant');
  });
});

describe('ownershipLabel', () => {
  it('returns the correct label for each ownership state', () => {
    expect(ownershipLabel('have')).toBe('Possédé');
    expect(ownershipLabel('want')).toBe('Souhaité');
    expect(ownershipLabel('had')).toBe('Ancien');
    expect(ownershipLabel('sample')).toBe('Échantillon');
    expect(ownershipLabel('decant')).toBe('Décant');
  });
});

describe('wardrobeToCardItem', () => {
  const baseItem: WardrobeItem = {
    parfumId: 'chanel_n_5',
    nom: 'N°5',
    marque: 'Chanel',
    imageUrl: 'https://example.com/image.jpg',
    familleOlactive: 'floral',
    ownership: 'have',
    rating: 4.5,
    notes: 'Mon parfum préféré',
    shelfIds: ['shelf1'],
    sizeMl: 50,
    sotdCount: 3,
    isSignature: true,
    addedAt: new Date('2024-01-01'),
    updatedAt: new Date('2024-06-01'),
  };

  it('maps parfumId to id', () => {
    const result = wardrobeToCardItem(baseItem);
    expect(result.id).toBe('chanel_n_5');
  });

  it('uses nom when available', () => {
    const result = wardrobeToCardItem(baseItem);
    expect(result.nom).toBe('N°5');
  });

  it('falls back to parfumId when nom is null', () => {
    const item = { ...baseItem, nom: null, parfumId: 'dior_sauvage' };
    const result = wardrobeToCardItem(item);
    expect(result.nom).toBe('dior sauvage');
  });

  it('falls back to empty string when marque is null', () => {
    const item = { ...baseItem, marque: null };
    const result = wardrobeToCardItem(item);
    expect(result.marque).toBe('');
  });

  it('maps imageUrl correctly', () => {
    const result = wardrobeToCardItem(baseItem);
    expect(result.imageUrl).toBe('https://example.com/image.jpg');
  });

  it('returns undefined for null imageUrl', () => {
    const item = { ...baseItem, imageUrl: null };
    const result = wardrobeToCardItem(item);
    expect(result.imageUrl).toBeUndefined();
  });

  it('always sets source to "seed"', () => {
    const result = wardrobeToCardItem(baseItem);
    expect(result.source).toBe('seed');
  });

  it('returns empty arrays for notesTete/Coeur/Fond', () => {
    const result = wardrobeToCardItem(baseItem);
    expect(result.notesTete).toEqual([]);
    expect(result.notesCoeur).toEqual([]);
    expect(result.notesFond).toEqual([]);
  });
});
