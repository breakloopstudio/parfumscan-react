// src/services/firebase.ts — Init Firebase, point d'entrée unique
// La config Firebase est externalisée dans src/config/firebase.config.ts

import { initializeApp, getApps, getApp } from '@react-native-firebase/app';
import { getAuth, connectAuthEmulator } from '@react-native-firebase/auth';
import { getFirestore, connectFirestoreEmulator } from '@react-native-firebase/firestore';
import { getFunctions, connectFunctionsEmulator } from '@react-native-firebase/functions';
import { firebaseConfig } from '../config/firebase.config';
import { env } from '../config/env';

let firebaseReady = false;

try {
  if (getApps().length === 0) initializeApp(firebaseConfig);
  const app = getApp();
  firebaseReady = true;

  // Connecter aux émulateurs si configuré
  if (env.USE_EMULATORS) {
    try { connectAuthEmulator(getAuth(app), `http://${env.FIREBASE_AUTH_EMULATOR_HOST}`); } catch {}
    try {
      const [host, port] = env.FIRESTORE_EMULATOR_HOST.split(':');
      connectFirestoreEmulator(getFirestore(app), host, Number(port));
    } catch {}
    try {
      const [fHost, fPort] = env.FIREBASE_FUNCTIONS_EMULATOR_HOST.split(':');
      connectFunctionsEmulator(getFunctions(app), fHost, Number(fPort));
    } catch {}
  }
} catch (e) {
  console.warn('[Firebase] Init failed:', (e as Error)?.message);
}

export function isFirebaseReady() { return firebaseReady; }
