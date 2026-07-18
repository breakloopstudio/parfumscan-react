// app/(tabs)/_layout.tsx
// Layout tabs : pager (index.tsx) + écrans overlay (favorites, history, collection/parfumerie, scan)

import { useMemo } from 'react';
import { Stack } from 'expo-router';
import { useTheme } from '../../src/theme/ThemeContext';

export default function TabsLayout() {
  const { theme } = useTheme();
  const screenOptions = useMemo(() => ({
    headerShown: false,
    contentStyle: { backgroundColor: theme.colors.background },
  }), [theme.colors.background]);

  return (
    <Stack screenOptions={screenOptions}>
      <Stack.Screen name="index" />
      <Stack.Screen name="favorites" options={{ animation: 'fade' }} />
      <Stack.Screen name="history" options={{ animation: 'fade' }} />
      <Stack.Screen name="collection" options={{ animation: 'fade' }} />
      <Stack.Screen name="scan" options={{ animation: 'fade' }} />
      <Stack.Screen name="search" options={{ animation: 'fade' }} />
    </Stack>
  );
}
