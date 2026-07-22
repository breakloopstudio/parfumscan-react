// app/_layout.tsx — Root layout (GestureHandler + Auth + SplashScreen + Edge-to-edge)

import { useEffect, useRef } from 'react';
import { Stack, useRouter, useSegments } from 'expo-router';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { GoogleSignin } from '@react-native-google-signin/google-signin';
import * as SplashScreen from 'expo-splash-screen';
import { AuthProvider, useAuthContext } from '../src/contexts/AuthContext';
import { ThemeProvider, useTheme } from '../src/theme/ThemeContext';
import { ErrorBoundary } from '../src/components/ErrorBoundary';
import { isFirebaseReady } from '../src/services/firebase';
import { createNotificationChannels, startFcmRegistration } from '../src/services/fcm';
import '../src/services/firebase';

try {
  GoogleSignin.configure({
    webClientId: '831514606817-xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx.apps.googleusercontent.com',
    iosClientId: process.env.EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID,
  });
} catch (e: unknown) { console.warn('[app] GoogleSignin.configure failed:', (e as Error)?.message ?? String(e)); }

SplashScreen.preventAutoHideAsync().catch(() => {});

function AuthGuard({ children }: { children: React.ReactNode }) {
  const { authReady, isAuthenticated, user } = useAuthContext();
  const segments = useSegments();
  const router = useRouter();
  const fcmCleanupRef = useRef<(() => void) | null>(null);

  useEffect(() => {
    createNotificationChannels();
  }, []);

  useEffect(() => {
    if (fcmCleanupRef.current) { fcmCleanupRef.current(); fcmCleanupRef.current = null; }
    if (authReady && isAuthenticated && user) {
      fcmCleanupRef.current = startFcmRegistration(user.uid);
    }
    return () => { if (fcmCleanupRef.current) fcmCleanupRef.current(); };
  }, [authReady, isAuthenticated, user]);

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
    if (isAuthenticated && inAuth) router.replace('/(tabs)');
  }, [authReady, isAuthenticated, segments]);

  if (!authReady) return null;
  return <>{children}</>;
}

function RootLayoutInner() {
  const { theme } = useTheme();
  return (
    <GestureHandlerRootView style={{ flex: 1, backgroundColor: theme.colors.background }}>
      <AuthProvider>
        <AuthGuard>
          <ErrorBoundary>
          <Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: theme.colors.background } }}>
            <Stack.Screen name="(tabs)" />
            <Stack.Screen name="auth/login" options={{ animation: 'fade' }} />
            <Stack.Screen name="auth/register" options={{ animation: 'fade' }} />
            <Stack.Screen name="catalog/[id]" options={{ animation: 'slide_from_right', gestureEnabled: true, fullScreenGestureEnabled: true }} />
            <Stack.Screen name="wardrobe/[parfumId]" options={{ animation: 'slide_from_right', headerShown: false }} />
            <Stack.Screen name="settings" options={{ animation: 'slide_from_right' }} />
            <Stack.Screen name="onboarding" options={{ animation: 'fade' }} />
            <Stack.Screen name="admin" options={{ animation: 'slide_from_bottom' }} />
          </Stack>
          </ErrorBoundary>
        </AuthGuard>
      </AuthProvider>
    </GestureHandlerRootView>
  );
}

export default function RootLayout() {
  return (
    <ThemeProvider>
      <RootLayoutInner />
    </ThemeProvider>
  );
}
