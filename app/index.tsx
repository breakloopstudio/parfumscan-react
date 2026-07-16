// app/index.tsx — Route racine : redirection intelligente
// Le splash natif (expo-splash-screen) couvre tout le chargement,
// on atterrit directement sur la destination.

import { useEffect } from 'react';
import { useRouter } from 'expo-router';
import { useAuthContext } from '../src/contexts/AuthContext';
import { isFirebaseReady } from '../src/services/firebase';

export default function IndexPage() {
  const { authReady, isAuthenticated } = useAuthContext();
  const router = useRouter();

  useEffect(() => {
    if (!authReady) return;

    if (!isFirebaseReady()) {
      router.replace('/(tabs)');
      return;
    }

    if (isAuthenticated) {
      router.replace('/(tabs)');
    } else {
      router.replace('/auth/login');
    }
  }, [authReady, isAuthenticated, router]);

  return null;
}
