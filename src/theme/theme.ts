// src/theme/theme.ts
// Design tokens ParfumScan — Refonte « Luxe malin »
// Phase A : nouveaux tokens + rétrocompatibilité avec l'existant

export const theme = {
  colors: {
    // ── Fondations ──
    background: '#F8F6F2',
    surface: '#FFFFFF',
    surface2: '#F3F1ED',
    border: '#E8E4DE',

    // ── Texte ──
    text: '#1A1520',
    textMuted: '#8B8580',
    textInverse: '#FFFFFF',

    // ── Accents ──
    primary: '#6C3ED9',
    primarySoft: '#F0EBFA',
    primaryInk: '#4C2A9E',
    secondary: '#C8945A',
    secondarySoft: '#FBF5EE',

    // ── Sémantique prix ──
    deal: '#0D9488',
    dealSoft: '#E6F7F5',
    overpriced: '#E04444',
    overpricedSoft: '#FEF2F2',
    fair: '#D97706',
    fairSoft: '#FFF8ED',

    // ── Favoris ──
    favorite: '#E04444',
    favoriteSoft: '#FEF2F2',

    // ── Pyramide olfactive ──
    pyramidTop: '#0D9488',
    pyramidTopSoft: '#E6F7F5',
    pyramidHeart: '#C8945A',
    pyramidHeartSoft: '#FBF5EE',
    pyramidBase: '#6C3ED9',
    pyramidBaseSoft: '#F0EBFA',

    // ── Rétrocompatibilité (sera nettoyé progressive phase B/C/D) ──
    // Anciens noms → nouvelles valeurs
    danger: '#E04444',
    success: '#0D9488',
    warning: '#D97706',
    medium: '#8B8580',
    light: '#F3F1ED',
    primaryShade: '#4C2A9E',
    primaryTint: '#8B5CF6',
    secondaryShade: '#B3814A',
    secondaryTint: '#D4A574',
    tertiary: '#D97706',
    violetSoft: '#F0EBFA',
    violetInk: '#4C2A9E',
    reward: '#C8945A',
    rewardSoft: '#FBF5EE',
    pyramidTopInk: '#0A6E66',
    pyramidHeartInk: '#B3814A',
    pyramidBaseInk: '#4C2A9E',
    scanBeam: 'rgba(108, 62, 217, 0.85)',
    glow: 'rgba(108, 62, 217, 0.35)',
  },

  fonts: {
    // ── Nouveaux noms ──
    display: { fontFamily: 'PlayfairDisplay_700Bold' },
    displaySemiBold: { fontFamily: 'PlayfairDisplay_600SemiBold' },
    displayItalic: { fontFamily: 'PlayfairDisplay_700Bold_Italic' },
    body: { fontFamily: 'Inter_400Regular' },
    bodyMedium: { fontFamily: 'Inter_500Medium' },
    bodySemiBold: { fontFamily: 'Inter_600SemiBold' },
    bodyBold: { fontFamily: 'Inter_700Bold' },

    // ── Rétrocompatibilité ──
    heading: { fontFamily: 'PlayfairDisplay_700Bold' },
    headingSemiBold: { fontFamily: 'PlayfairDisplay_600SemiBold' },
    headingMedium: { fontFamily: 'PlayfairDisplay_500Medium' },

    size: {
      xs: 10,
      sm: 12,
      base: 14,
      md: 16,
      lg: 18,
      xl: 22,
      '2xl': 28,
      '3xl': 34,
      '4xl': 42,
    },
  },

  radius: {
    sm: 8,
    base: 12,
    card: 16,
    lg: 20,
    xl: 24,
    full: 9999,
  },

  spacing: {
    xs: 4,
    sm: 8,
    base: 12,
    md: 16,
    lg: 20,
    xl: 24,
    '2xl': 32,
    '3xl': 48,
  },

  shadow: {
    card: {
      shadowColor: '#1A1520',
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.06,
      shadowRadius: 12,
      elevation: 3,
    },
    elevated: {
      shadowColor: '#1A1520',
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.08,
      shadowRadius: 16,
      elevation: 6,
    },
    button: {
      shadowColor: '#6C3ED9',
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.3,
      shadowRadius: 12,
      elevation: 6,
    },
    // ── Rétrocompatibilité ──
    scanCircle: {
      shadowColor: '#6C3ED9',
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.4,
      shadowRadius: 16,
      elevation: 8,
    },
  },
} as const;

export type Theme = typeof theme;
