import { translateNote } from '../../src/utils/translate-note';

describe('translateNote', () => {
  it('translates a known note EN → FR', () => {
    expect(translateNote('bergamot')).toBe('Bergamote');
    expect(translateNote('lemon')).toBe('Citron');
    expect(translateNote('vanilla')).toBe('Vanille');
  });

  it('translates a known accord EN → FR', () => {
    expect(translateNote('woody')).toBe('Boisé');
    expect(translateNote('citrus')).toBe('Agrumes');
    expect(translateNote('floral')).toBe('Floral');
    expect(translateNote('fresh spicy')).toBe('Épicé frais');
  });

  it('capitalizes the first letter of the result', () => {
    expect(translateNote('rose')).toBe('Rose');
    expect(translateNote('cedar')).toBe('Cèdre');
  });

  it('falls back to the original (capitalized) if not found', () => {
    expect(translateNote('unicorn_fur')).toBe('Unicorn_fur');
    expect(translateNote('')).toBe('');
  });

  it('is case-insensitive on input', () => {
    expect(translateNote('BERGAMOT')).toBe('Bergamote');
    expect(translateNote('Vanilla')).toBe('Vanille');
    expect(translateNote('RoSe')).toBe('Rose');
  });

  it('trims whitespace on input', () => {
    expect(translateNote('  vanilla  ')).toBe('Vanille');
  });

  it('handles multi-word notes', () => {
    expect(translateNote('orange blossom')).toBe('Fleur d\'oranger');
    expect(translateNote('tonka bean')).toBe('Fève tonka');
  });

  it('handles notes with special characters in key', () => {
    expect(translateNote('ylang-ylang')).toBe('Ylang-ylang');
  });
});
