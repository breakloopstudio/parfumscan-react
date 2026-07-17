// app/index.tsx — Route racine : redirection intelligente
// Le splash natif couvre tout le chargement, on atterrit sur la destination.
// Auth optionnelle : pas de redirection forcée vers login.

import { useEffect, useState } from 'react';
import { useRouter } from 'expo-router';

export default function IndexPage() {
  const router = useRouter();
  const [ready, setReady] = useState(false);

  useEffect(() => {
    // Onboarding désactivé temporairement
    router.replace('/(tabs)');
    setReady(true);
  }, []);

  if (!ready) return null;
  return null;
}
