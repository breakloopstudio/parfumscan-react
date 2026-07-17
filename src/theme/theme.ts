// src/theme/theme.ts
// Design tokens ParfumScan — Refonte « Luxe malin »
// Phase A : nouveaux tokens + rétrocompatibilité avec l'existant
// Dark mode : palette « Luxe profond »

// ── Palette light (inchangée) ──
const lightColors = {
  background: '#F8F6F2',
  surface: '#FFFFFF',
  surface2: '#F3F1ED',
  border: '#E8E4DE',
  text: '#1A1520',
  textMuted: '#8B8580',
  textInverse: '#FFFFFF',
  primary: '#6C3ED9',
  primarySoft: '#F0EBFA',
  primaryInk: '#4C2A9E',
  secondary: '#C8945A',
  secondaryInk: '#8B6934',
  secondarySoft: '#FBF5EE',
  deal: '#0D9488',
  dealSoft: '#E6F7F5',
  overpriced: '#E04444',
  overpricedSoft: '#FEF2F2',
  fair: '#D97706',
  fairSoft: '#FFF8ED',
  favorite: '#E04444',
  favoriteSoft: '#FEF2F2',
  pyramidTop: '#0D9488',
  pyramidTopSoft: '#E6F7F5',
  pyramidHeart: '#C8945A',
  pyramidHeartSoft: '#FBF5EE',
  pyramidBase: '#6C3ED9',
  pyramidBaseSoft: '#F0EBFA',
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
  rewardInk: '#8B6934',
  rewardSoft: '#FBF5EE',
  pyramidTopInk: '#0A6E66',
  pyramidHeartInk: '#B3814A',
  pyramidBaseInk: '#4C2A9E',
  scanBeam: 'rgba(108, 62, 217, 0.85)',
  glow: 'rgba(108, 62, 217, 0.35)',
} as const;

// ── Palette dark « Luxe profond » ──
const darkColors = {
  background: '#0B0712',
  surface: '#15101E',
  surface2: '#1D1728',
  border: '#2A2238',
  text: '#EDE8F5',
  textMuted: '#988EA8',
  textInverse: '#0B0712',
  primary: '#8B6CF6',
  primarySoft: '#1E1830',
  primaryInk: '#B9A0F8',
  secondary: '#D4A960',
  secondaryInk: '#E0C090',
  secondarySoft: '#241E12',
  deal: '#2DD4BF',
  dealSoft: '#0D2826',
  overpriced: '#EF4444',
  overpricedSoft: '#291010',
  fair: '#F59E0B',
  fairSoft: '#221A0C',
  favorite: '#EF4444',
  favoriteSoft: '#291010',
  pyramidTop: '#2DD4BF',
  pyramidTopSoft: '#0D2826',
  pyramidHeart: '#D4A960',
  pyramidHeartSoft: '#241E12',
  pyramidBase: '#8B6CF6',
  pyramidBaseSoft: '#1E1830',
  danger: '#EF4444',
  success: '#2DD4BF',
  warning: '#F59E0B',
  medium: '#988EA8',
  light: '#1D1728',
  primaryShade: '#B9A0F8',
  primaryTint: '#A78BFA',
  secondaryShade: '#E0BC7A',
  secondaryTint: '#DEB87A',
  tertiary: '#F59E0B',
  violetSoft: '#1E1830',
  violetInk: '#B9A0F8',
  reward: '#D4A960',
  rewardInk: '#E0C090',
  rewardSoft: '#241E12',
  pyramidTopInk: '#5EEAD4',
  pyramidHeartInk: '#E0BC7A',
  pyramidBaseInk: '#B9A0F8',
  scanBeam: 'rgba(139, 108, 246, 0.90)',
  glow: 'rgba(139, 108, 246, 0.40)',
} as const;

// ── Ombres light (inchangées) ──
const lightShadow = {
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
  scanCircle: {
    shadowColor: '#6C3ED9',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.4,
    shadowRadius: 16,
    elevation: 8,
  },
} as const;

// ── Ombres dark (bordures subtiles, pas d'ombres noires invisibles) ──
const darkShadow = {
  card: {
    shadowColor: 'transparent',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0,
    shadowRadius: 0,
    elevation: 0,
    borderWidth: 0.5,
    borderColor: 'rgba(255,255,255,0.06)',
  },
  elevated: {
    shadowColor: 'transparent',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0,
    shadowRadius: 0,
    elevation: 0,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
  },
  button: {
    shadowColor: 'transparent',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0,
    shadowRadius: 0,
    elevation: 0,
    borderWidth: 1,
    borderColor: 'rgba(139,108,246,0.25)',
  },
  scanCircle: {
    shadowColor: 'transparent',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0,
    shadowRadius: 0,
    elevation: 0,
    borderWidth: 1.5,
    borderColor: 'rgba(139,108,246,0.30)',
  },
} as const;

// ── Tokens partagés (identiques dans les deux thèmes) ──
const shared = {
  fonts: {
    display: { fontFamily: 'PlayfairDisplay_700Bold' },
    displaySemiBold: { fontFamily: 'PlayfairDisplay_600SemiBold' },
    displayItalic: { fontFamily: 'PlayfairDisplay_700Bold_Italic' },
    body: { fontFamily: 'Inter_400Regular' },
    bodyMedium: { fontFamily: 'Inter_500Medium' },
    bodySemiBold: { fontFamily: 'Inter_600SemiBold' },
    bodyBold: { fontFamily: 'Inter_700Bold' },
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
} as const;

export interface Theme {
  colors: Record<string, string>;
  fonts: typeof shared.fonts;
  radius: typeof shared.radius;
  spacing: typeof shared.spacing;
  shadow: {
    card: Record<string, unknown>;
    elevated: Record<string, unknown>;
    button: Record<string, unknown>;
    scanCircle: Record<string, unknown>;
  };
}

export const lightTheme: Theme = {
  colors: lightColors,
  ...shared,
  shadow: lightShadow,
};

export const darkTheme: Theme = {
  colors: darkColors,
  ...shared,
  shadow: darkShadow,
};

// Rétrocompatibilité — les anciens imports continuent de fonctionner
// tant que tous les composants ne sont pas migrés vers useTheme()
// À supprimer en fin de Phase 6
export const theme = lightTheme;
