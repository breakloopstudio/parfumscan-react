// app/index.tsx — Route racine : redirection intelligente
// Le splash natif couvre tout le chargement, on atterrit sur la destination.
// Auth optionnelle : pas de redirection forcée vers login.

import { useEffect, useState } from 'react';
import { useRouter } from 'expo-router';

export default function IndexPage() {
  const router = useRouter();
  const [ready, setReady] = useState(false);

  useEffect(() => {
    let cancelled = false;
    try {
      // eslint-disable-next-line @typescript-eslint/no-var-requires
      const AsyncStorage = require('@react-native-async-storage/async-storage').default;
      AsyncStorage.getItem('@parfumscan_onboarding_done').then((val: string | null) => {
        if (cancelled) return;
        if (val === 'true') router.replace('/(tabs)');
        else router.replace('/onboarding');
      }).catch(() => {
        if (!cancelled) router.replace('/onboarding');
      });
    } catch {
      if (!cancelled) router.replace('/onboarding');
    }
    setReady(true);
    return () => { cancelled = true; };
  }, []);

  if (!ready) return null;
  return null;
}
