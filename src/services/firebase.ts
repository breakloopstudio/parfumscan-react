// src/services/firebase.ts — Init Firebase, point d'entrée unique
// La config Firebase est externalisée dans src/config/firebase.config.ts

import { initializeApp, getApps } from '@react-native-firebase/app';
import auth from '@react-native-firebase/auth';
import firestore from '@react-native-firebase/firestore';
import functions from '@react-native-firebase/functions';
import { firebaseConfig } from '../config/firebase.config';
import { env } from '../config/env';

let firebaseReady = false;

try {
  if (getApps().length === 0) initializeApp(firebaseConfig);
  firebaseReady = true;

  // Connecter aux émulateurs si configuré
  if (env.USE_EMULATORS) {
    try { auth().useEmulator(`http://${env.FIREBASE_AUTH_EMULATOR_HOST}`); } catch {}
    try {
      const [host, port] = env.FIRESTORE_EMULATOR_HOST.split(':');
      firestore().useEmulator(host, Number(port));
    } catch {}
    try {
      const [fHost, fPort] = env.FIREBASE_FUNCTIONS_EMULATOR_HOST.split(':');
      functions().useEmulator(fHost, Number(fPort));
    } catch {}
  }
} catch (e) {
  console.warn('[Firebase] Init failed:', (e as Error)?.message);
}

export function isFirebaseReady() { return firebaseReady; }

