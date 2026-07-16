// app/(tabs)/_layout.tsx
// Layout tabs : pager (index.tsx) + écrans overlay (favorites, history, collection, scan)

import { Stack } from 'expo-router';

export default function TabsLayout() {
  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Screen name="index" />
      <Stack.Screen name="favorites" options={{ animation: 'fade' }} />
      <Stack.Screen name="history" options={{ animation: 'fade' }} />
      <Stack.Screen name="collection" options={{ animation: 'fade' }} />
      <Stack.Screen name="scan" options={{ animation: 'fade' }} />
    </Stack>
  );
}
