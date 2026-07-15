// src/theme/theme.ts
// Design tokens ParfumScan — portage des variables CSS --ps-* vers un objet JS

export const theme = {
  colors: {
    // Ionic palette
    primary: '#7C3AED',
    primaryShade: '#6D28D9',
    primaryTint: '#8B5CF6',
    secondary: '#D4A574',
    secondaryShade: '#C4955D',
    secondaryTint: '#E0B989',
    tertiary: '#F59E0B',
    success: '#10B981',
    warning: '#F59E0B',
    danger: '#EF4444',
    medium: '#9CA3AF',
    light: '#F3F4F6',

    // Tokens sémantiques ParfumScan
    surface: '#FFFFFF',
    surface2: '#F3F4F6',
    border: '#E5E7EB',
    text: '#1F1A2E',
    textMuted: '#6B7280',
    reward: '#D4A574',
    rewardSoft: '#FDF6EE',
    deal: '#10B981',
    dealSoft: '#ECFDF5',
    violetSoft: '#EDE9FE',
    violetInk: '#5B21B6',
    // Pyramide olfactive — 3 couches sémantiques
    pyramidTop: '#059669',
    pyramidTopSoft: '#ECFDF5',
    pyramidTopInk: '#065F46',
    pyramidHeart: '#D97706',
    pyramidHeartSoft: '#FFFBEB',
    pyramidHeartInk: '#92400E',
    pyramidBase: '#7C3AED',
    pyramidBaseSoft: '#F5F3FF',
    pyramidBaseInk: '#5B21B6',
    background: '#FAF8F5',

    scanBeam: 'rgba(124, 58, 237, 0.85)',
    glow: 'rgba(124, 58, 237, 0.35)',

    // Dark mode
    dark: {
      background: '#0F0A1A',
      toolbar: '#1A1333',
      tabBar: '#1A1333',
      tabBarBorder: '#2D1F4E',
      surface: '#1A1333',
      surface2: '#241A45',
      border: '#2D1F4E',
      text: '#F3F4F6',
      textMuted: '#A79FC0',
      light: '#1F1A2E',
      rewardSoft: '#2A2136',
      dealSoft: '#10261F',
      violetSoft: '#241A45',
      violetInk: '#C4B5FD',
      // Pyramide olfactive dark
      pyramidTop: '#34D399',
      pyramidTopSoft: '#064E3B',
      pyramidTopInk: '#A7F3D0',
      pyramidHeart: '#FBBF24',
      pyramidHeartSoft: '#78350F',
      pyramidHeartInk: '#FDE68A',
      pyramidBase: '#A78BFA',
      pyramidBaseSoft: '#2E1065',
      pyramidBaseInk: '#DDD6FE',
    },
  },

  fonts: {
    heading: { fontFamily: 'PlayfairDisplay_700Bold', fontWeight: '700' as const },
    headingSemiBold: { fontFamily: 'PlayfairDisplay_600SemiBold', fontWeight: '600' as const },
    headingMedium: { fontFamily: 'PlayfairDisplay_500Medium', fontWeight: '500' as const },
    body: { fontFamily: 'Inter_400Regular', fontWeight: '400' as const },
    bodyMedium: { fontFamily: 'Inter_500Medium', fontWeight: '500' as const },
    bodySemiBold: { fontFamily: 'Inter_600SemiBold', fontWeight: '600' as const },
    bodyBold: { fontFamily: 'Inter_700Bold', fontWeight: '700' as const },
    size: {
      xs: 10,
      sm: 12,
      base: 14,
      md: 16,
      lg: 18,
      xl: 22,
      '2xl': 26,
      '3xl': 32,
    },
  },

  radius: {
    sm: 8,
    base: 12,
    card: 16,
    lg: 20,
    full: 9999,
  },

  shadow: {
    card: {
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.06,
      shadowRadius: 12,
      elevation: 3,
    },
    button: {
      shadowColor: '#7C3AED',
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.35,
      shadowRadius: 14,
      elevation: 6,
    },
    scanCircle: {
      shadowColor: '#7C3AED',
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.4,
      shadowRadius: 16,
      elevation: 8,
    },
  },
} as const;

export type Theme = typeof theme;
