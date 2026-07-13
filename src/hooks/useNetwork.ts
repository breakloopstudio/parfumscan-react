// src/hooks/useNetwork.ts — État réseau (NetInfo)

import { useState, useEffect } from 'react';
import NetInfo from '@react-native-community/netinfo';

export function useNetwork() {
  const [isOnline, setIsOnline] = useState(true);

  useEffect(() => {
    const unsub = NetInfo.addEventListener(state => {
      setIsOnline(state.isConnected ?? true);
    });
    return unsub;
  }, []);

  return { isOnline };
}