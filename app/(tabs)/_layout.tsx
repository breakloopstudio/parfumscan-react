// app/(tabs)/_layout.tsx
// Layout tabs : le pager (index.tsx) + scan en overlay

import { Stack } from 'expo-router';

export default function TabsLayout() {
  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Screen name="index" />
      <Stack.Screen name="scan" options={{ animation: 'fade' }} />
    </Stack>
  );
}
