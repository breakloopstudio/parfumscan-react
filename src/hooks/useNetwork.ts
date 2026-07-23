// src/hooks/useNetwork.ts — État réseau (NetInfo) avec hystérésis anti-flap

import { useState, useEffect, useRef } from 'react';
import { AppState } from 'react-native';
import NetInfo from '@react-native-community/netinfo';

const OFFLINE_DELAY_MS = 800;
const ONLINE_DELAY_MS = 1500;

export function useNetwork() {
  const [isOnline, setIsOnline] = useState(true);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    const applyDebounced = (offline: boolean) => {
      if (timerRef.current) clearTimeout(timerRef.current);
      timerRef.current = setTimeout(
        () => setIsOnline(!offline),
        offline ? OFFLINE_DELAY_MS : ONLINE_DELAY_MS,
      );
    };

    const unsub = NetInfo.addEventListener(state => {
      const isOffline = state.isConnected === false || state.isInternetReachable === false;
      const isOnline = state.isConnected === true && state.isInternetReachable !== false;
      if (isOffline) {
        applyDebounced(true);
      } else if (isOnline) {
        applyDebounced(false);
      }
    });

    const appSub = AppState.addEventListener('change', s => {
      if (s === 'active') NetInfo.refresh().catch(() => {});
    });

    return () => {
      unsub();
      appSub.remove();
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, []);

  return { isOnline };
}
