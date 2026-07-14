// app/_layout.tsx — Root layout (GestureHandler + Auth + Fonts + Stack)

import { useEffect, useState } from 'react';
import { Stack, useRouter, useSegments } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { View, ActivityIndicator } from 'react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { AuthProvider, useAuthContext } from '../src/contexts/AuthContext';
import { ErrorBoundary } from '../src/components/ErrorBoundary';
import { useAppTheme } from '../src/hooks/useAppTheme';
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
  if (!authReady) return <View style={S.loading}><ActivityIndicator size="large" color="#7C3AED" /></View>;
  return <>{children}</>;
}

export default function RootLayout() {
  const [ready, setReady] = useState(false);
  const { isDark } = useAppTheme();
  useEffect(() => { const t = setTimeout(() => setReady(true), 400); return () => clearTimeout(t); }, []);
  if (!ready) return <View style={S.loading}><ActivityIndicator size="large" color="#7C3AED" /></View>;
  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <AuthProvider>
        <StatusBar style={isDark ? 'light' : 'dark'} />
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

const S = { loading: { flex: 1 as const, justifyContent: 'center' as const, alignItems: 'center' as const, backgroundColor: '#FAF8F5' } };
