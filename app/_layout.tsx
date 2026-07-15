// app/_layout.tsx — Root layout (GestureHandler + Auth + Fonts + Stack + Edge-to-edge)

import { useEffect, useState } from 'react';
import { Platform, View, ActivityIndicator } from 'react-native';
import { Stack, useRouter, useSegments } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { AuthProvider, useAuthContext } from '../src/contexts/AuthContext';
import { ErrorBoundary } from '../src/components/ErrorBoundary';
import { theme } from '../src/theme/theme';
import { isFirebaseReady } from '../src/services/firebase';
import '../src/services/firebase';

try {
  const { GoogleSignin } = require('@react-native-google-signin/google-signin');
  GoogleSignin.configure({ webClientId: '831514606817-xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx.apps.googleusercontent.com' });
} catch {}

function AuthGuard({ children }: { children: React.ReactNode }) {
  const { authReady, isAuthenticated } = useAuthContext();
  const segments = useSegments();
  const router = useRouter();
  const colors = theme.colors;
  useEffect(() => {
    if (!authReady) return;
    // Expo Go : pas de Firebase → on skip l'auth
    if (!isFirebaseReady()) return;
    // Route racine (index) : laisser app/index.tsx gérer la redirection
    if (!segments[0]) return;
    const inAuth = segments[0] === 'auth';
    if (!isAuthenticated && !inAuth) router.replace('/auth/login');
    else if (isAuthenticated && inAuth) router.replace('/(tabs)');
  }, [authReady, isAuthenticated, segments]);
  if (!authReady) return <View style={{ flex: 1, justifyContent: 'center' as const, alignItems: 'center' as const, backgroundColor: colors.background }}><ActivityIndicator size="large" color="#7C3AED" /></View>;
  return <>{children}</>;
}

export default function RootLayout() {
  const [ready, setReady] = useState(false);
  const colors = theme.colors;
  useEffect(() => { const t = setTimeout(() => setReady(true), 400); return () => clearTimeout(t); }, []);
  if (!ready) return <View style={{ flex: 1, justifyContent: 'center' as const, alignItems: 'center' as const, backgroundColor: colors.background }}><ActivityIndicator size="large" color="#7C3AED" /></View>;
  return (
    <GestureHandlerRootView style={{ flex: 1, backgroundColor: colors.background }}>
      <AuthProvider>
        <StatusBar
          style="dark"
          translucent={Platform.OS === 'android'}
          backgroundColor={Platform.OS === 'android' ? 'transparent' : undefined}
        />
        <AuthGuard>
          <ErrorBoundary>
          <Stack screenOptions={{ headerShown: false }}>
            <Stack.Screen name="(tabs)" />
            <Stack.Screen name="auth/login" options={{ animation: 'fade' }} />
            <Stack.Screen name="auth/register" options={{ animation: 'fade' }} />
            <Stack.Screen name="catalog/[id]" options={{ animation: 'slide_from_right' }} />
            <Stack.Screen name="admin" options={{ animation: 'slide_from_bottom' }} />
          </Stack>
          </ErrorBoundary>
        </AuthGuard>
      </AuthProvider>
    </GestureHandlerRootView>
  );
}
