// src/hooks/useAppTheme.ts — Hook dark mode dynamique

import { useColorScheme } from 'react-native';
import { theme } from '../theme/theme';

export function useAppTheme() {
  const colorScheme = useColorScheme();
  const isDark = colorScheme === 'dark';

  return {
    isDark,
    colors: isDark ? { ...theme.colors, ...theme.colors.dark } : theme.colors,
    fonts: theme.fonts,
    radius: theme.radius,
    shadow: theme.shadow,
  };
}
