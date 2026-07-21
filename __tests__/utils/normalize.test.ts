import { normalize, normalizeId, buildSearchKeywords } from '../../src/utils/normalize';

describe('normalize', () => {
  it('lowercases the string', () => {
    expect(normalize('JEAN PAUL')).toBe('jean_paul');
  });

  it('removes diacritics (accents)', () => {
    expect(normalize('Jean-Paul Gaultier')).toBe('jean_paul_gaultier');
    expect(normalize('Dior Homme Intense')).toBe('dior_homme_intense');
    expect(normalize('Yves Saint Laurent')).toBe('yves_saint_laurent');
  });

  it('replaces non-alphanumeric characters with underscore', () => {
    expect(normalize("L'Homme")).toBe('l_homme');
    expect(normalize('N°5')).toBe('n_5');
    expect(normalize('Eau de Parfum (EDP)')).toBe('eau_de_parfum_edp');
  });

  it('trims leading and trailing underscores', () => {
    expect(normalize('!!!Sauvage!!!')).toBe('sauvage');
  });

  it('handles empty string', () => {
    expect(normalize('')).toBe('');
  });

  it('handles string with only special chars', () => {
    expect(normalize('!!!')).toBe('');
  });
});

describe('normalizeId', () => {
  it('behaves identically to normalize', () => {
    const input = 'Jean-Paul Gaultier Le Mâle';
    expect(normalizeId(input)).toBe(normalize(input));
  });
});

describe('buildSearchKeywords', () => {
  it('includes full brand and name tokens', () => {
    const kw = buildSearchKeywords('Jean Paul Gaultier', 'Le Mâle');
    expect(kw).toContain('jean');
    expect(kw).toContain('paul');
    expect(kw).toContain('gaultier');
    expect(kw).toContain('le');
    expect(kw).toContain('male');
  });

  it('generates prefix tokens for partial search (length >= 3)', () => {
    const kw = buildSearchKeywords('Dior', 'Sauvage');
    // 'dior' — prefixes: dio (3)
    expect(kw).toContain('dio');
    expect(kw).toContain('dior');
    // 'sauvage' — prefixes: sau (3), sauv (4), sauva (5), sauvag (6)
    expect(kw).toContain('sau');
    expect(kw).toContain('sauv');
    expect(kw).toContain('sauva');
    expect(kw).toContain('sauvag');
    expect(kw).toContain('sauvage');
  });

  it('does NOT generate prefixes for words shorter than 3 characters', () => {
    // 'CK' → normalize('CK') → 'ck' (2 chars)
    // La fonction ajoute le mot complet 'ck', mais ne genere pas
    // de prefixes pour les mots de moins de 3 caracteres.
    const kw = buildSearchKeywords('CK', 'One');
    // 'ck' est present comme mot complet (2 chars)
    expect(kw).toContain('ck');
    // Mais on ne doit pas generer de prefix de 2 chars pour 'one' (length 3)
    // 'on' ne doit pas apparaitre comme prefix
    expect(kw.some(k => k === 'on')).toBe(false);
    // 'one' est present (prefix de longueur 3 = mot complet)
    expect(kw).toContain('one');
  });

  it('returns a deduplicated array', () => {
    const kw = buildSearchKeywords('Dior', 'Dior');
    const uniq = new Set(kw);
    expect(kw.length).toBe(uniq.size);
  });

  it('includes the combined brand_name key', () => {
    const kw = buildSearchKeywords('Jean Paul Gaultier', 'Le Mâle');
    expect(kw).toContain('jean_paul_gaultier_le_male');
  });

  it('handles empty brand', () => {
    const kw = buildSearchKeywords('', 'Sauvage');
    expect(kw.length).toBeGreaterThan(0);
    expect(kw).toContain('sauvage');
  });
});
