// app/_layout.tsx — Root layout (GestureHandler + Auth + SplashScreen + Edge-to-edge)

import { useEffect } from 'react';
import { Stack, useRouter, useSegments } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { GoogleSignin } from '@react-native-google-signin/google-signin';
import * as SplashScreen from 'expo-splash-screen';
import { AuthProvider, useAuthContext } from '../src/contexts/AuthContext';
import { ErrorBoundary } from '../src/components/ErrorBoundary';
import { theme } from '../src/theme/theme';
import { isFirebaseReady } from '../src/services/firebase';
import '../src/services/firebase';

try {
  GoogleSignin.configure({ webClientId: '831514606817-xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx.apps.googleusercontent.com' });
} catch {}

SplashScreen.preventAutoHideAsync().catch(() => {});

function AuthGuard({ children }: { children: React.ReactNode }) {
  const { authReady, isAuthenticated } = useAuthContext();
  const segments = useSegments();
  const router = useRouter();

  useEffect(() => {
    if (authReady) {
      SplashScreen.hideAsync().catch(() => {});
    }
  }, [authReady]);

  useEffect(() => {
    if (!authReady) return;
    if (!isFirebaseReady()) return;
    if (!segments[0]) return;
    const inAuth = segments[0] === 'auth';
    if (!isAuthenticated && !inAuth) router.replace('/auth/login');
    else if (isAuthenticated && inAuth) router.replace('/(tabs)');
  }, [authReady, isAuthenticated, segments]);

  if (!authReady) return null;
  return <>{children}</>;
}

export default function RootLayout() {
  const colors = theme.colors;
  return (
    <GestureHandlerRootView style={{ flex: 1, backgroundColor: colors.background }}>
      <AuthProvider>
        <StatusBar style="dark" />
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
