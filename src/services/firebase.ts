// src/services/firebase.ts — Init Firebase, point d'entrée unique
// La config Firebase est externalisée dans src/config/firebase.config.ts

import { firebaseConfig } from '../config/firebase.config';
import { env } from '../config/env';

let firebaseReady = false;

try {
  const { initializeApp, getApps } = require('@react-native-firebase/app');
  if (getApps().length === 0) initializeApp(firebaseConfig);
  firebaseReady = true;

  // Connecter aux émulateurs si configuré
  if (env.USE_EMULATORS) {
    try {
      const auth = require('@react-native-firebase/auth').default;
      auth().useEmulator(`http://${env.FIREBASE_AUTH_EMULATOR_HOST}`);
    } catch {}
    try {
      const firestore = require('@react-native-firebase/firestore').default;
      const [host, port] = env.FIRESTORE_EMULATOR_HOST.split(':');
      firestore().useEmulator(host, Number(port));
    } catch {}
    try {
      const functions = require('@react-native-firebase/functions').default;
      const [host, port] = env.FIREBASE_FUNCTIONS_EMULATOR_HOST.split(':');
      functions().useEmulator(host, Number(port));
    } catch {}
  }
} catch {}

export function isFirebaseReady() { return firebaseReady; }

