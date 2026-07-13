// app/index.tsx — Route racine : splash screen + redirection intelligente
// Résout le bug "Unmatched Route — parfumscan:///" en fournissant
// une route pour le chemin racine "/".

import { useEffect } from 'react';
import { View, Text, ActivityIndicator, StyleSheet } from 'react-native';
import { useRouter } from 'expo-router';
import { useAuthContext } from '../src/contexts/AuthContext';
import { isFirebaseReady } from '../src/services/firebase';
import { theme } from '../src/theme/theme';

export default function IndexPage() {
  const { authReady, isAuthenticated } = useAuthContext();
  const router = useRouter();

  useEffect(() => {
    // Attendre que l'auth soit initialisée
    if (!authReady) return;

    // Firebase pas dispo (Expo Go ou build sans google-services.json)
    // → on laisse passer vers le catalogue
    if (!isFirebaseReady()) {
      router.replace('/(tabs)');
      return;
    }

    // Redirection selon état auth
    if (isAuthenticated) {
      router.replace('/(tabs)');
    } else {
      router.replace('/auth/login');
    }
  }, [authReady, isAuthenticated, router]);

  // Splash screen pendant l'initialisation
  return (
    <View style={s.container}>
      <Text style={s.logo}>✨</Text>
      <Text style={s.title}>ParfumScan</Text>
      <Text style={s.subtitle}>Découvrez l'univers des parfums</Text>
      <ActivityIndicator
        size="large"
        color={theme.colors.primary}
        style={s.spinner}
      />
    </View>
  );
}

const s = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: theme.colors.background,
  },
  logo: { fontSize: 64, marginBottom: 12 },
  title: {
    fontFamily: 'PlayfairDisplay_700Bold',
    fontSize: 32,
    color: theme.colors.text,
    letterSpacing: -0.5,
  },
  subtitle: {
    color: theme.colors.medium,
    fontSize: 15,
    marginTop: 4,
  },
  spinner: { marginTop: 32 },
});
