import { normalize, normalizeId, buildSearchKeywords, generateTrigrams, STOP_WORDS } from '../../src/utils/normalize';

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
    // "Le Mâle" → "le" is a stop word, so only "male" from name
    // Using a name without stop words to test properly
    const kw = buildSearchKeywords('Jean Paul Gaultier', 'Sauvage');
    expect(kw).toContain('jean');
    expect(kw).toContain('paul');
    expect(kw).toContain('gaultier');
    expect(kw).toContain('sauvage');
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

// ─── buildSearchKeywords v2 (trigrams, stop words, family, full name) ───

describe('buildSearchKeywords v2', () => {
  it('filters out stop words (le, de, la, eau...)', () => {
    const kw = buildSearchKeywords('Bleu de Chanel', 'Eau de Parfum');
    expect(kw).not.toContain('de');
    expect(kw).not.toContain('eau');
    expect(kw).toContain('bleu');
    expect(kw).toContain('chanel');
    expect(kw).toContain('parfum');
  });

  it('includes trigrams prefixed with ~ for each non-stop word', () => {
    const kw = buildSearchKeywords('Dior', 'Sauvage');
    const trigrams = kw.filter(k => k.startsWith('~'));
    expect(trigrams.length).toBeGreaterThan(0);
    // 'dior' has trigrams like ~$di ~dio ~ior ~or$
    expect(trigrams.some(t => t === '~dio')).toBe(true);
    expect(trigrams.some(t => t === '~ior')).toBe(true);
    // 'sauvage' has trigrams
    expect(trigrams.some(t => t === '~sau')).toBe(true);
  });

  it('includes the full normalized name as a standalone token', () => {
    const kw = buildSearchKeywords('Chanel', 'Bleu de Chanel');
    // n = 'bleu_de_chanel' — full name
    expect(kw).toContain('bleu_de_chanel');
    // 'de' is filtered individually, but present in the combined token
    expect(kw).not.toContain('de');
  });

  it('includes familleOlactive words and trigrams when provided', () => {
    const kw = buildSearchKeywords('Dior', 'Sauvage', 'Oriental Floral');
    expect(kw).toContain('oriental');
    expect(kw).toContain('floral');
    // family words also get trigrams
    const famTrigrams = kw.filter(k => k.startsWith('~') && (k.includes('ori') || k.includes('flo')));
    expect(famTrigrams.length).toBeGreaterThan(0);
  });

  it('does not generate trigrams for stop words', () => {
    const kw = buildSearchKeywords('Bleu de Chanel', 'Le Male');
    // 'de' and 'le' are stop words — neither word nor trigrams
    expect(kw.some(k => k === 'de')).toBe(false);
    expect(kw.some(k => k === 'le')).toBe(false);
    // no trigram starting with ~$de or ~$le
    expect(kw.some(k => k === '~$de')).toBe(false);
    expect(kw.some(k => k === '~$le')).toBe(false);
    // but 'male' and its trigrams are present
    expect(kw).toContain('male');
    expect(kw.some(k => k.startsWith('~') && k.includes('mal'))).toBe(true);
  });

  it('generateTrigrams produces correct output', () => {
    const tri = generateTrigrams('abc');
    // "$abc$" → "$ab", "abc", "bc$"
    expect(tri).toEqual(['$ab', 'abc', 'bc$']);
  });

  it('generateTrigrams handles short words', () => {
    expect(generateTrigrams('ab')).toEqual(['$ab', 'ab$']);
    expect(generateTrigrams('a')).toEqual(['$a$']);
  });

  it('STOP_WORDS contains common French and English filler words', () => {
    expect(STOP_WORDS.has('de')).toBe(true);
    expect(STOP_WORDS.has('le')).toBe(true);
    expect(STOP_WORDS.has('eau')).toBe(true);
    expect(STOP_WORDS.has('the')).toBe(true);
    expect(STOP_WORDS.has('of')).toBe(true);
    // Non-stop words
    expect(STOP_WORDS.has('parfum')).toBe(false);
    expect(STOP_WORDS.has('sauvage')).toBe(false);
  });
});
