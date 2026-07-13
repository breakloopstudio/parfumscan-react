// src/services/openai-vision.ts — Cloud Function analyzePerfumeImage
// Compatible Expo Go

import type { ScanResult } from '../models';

let _functions: any = null;
try { _functions = require('@react-native-firebase/functions').default; } catch {}

function fn() {
  // Forcer la région europe-west1 (les Cloud Functions y sont déployées)
  return _functions ? _functions('europe-west1') : null;
}

export async function analyzeImage(base64Image: string): Promise<ScanResult> {
  const funcs = fn();
  if (!funcs) throw new Error('Firebase Functions non disponible dans Expo Go.');
  const callable = funcs.httpsCallable<{ imageBase64: string }, ScanResult>('analyzePerfumeImage');
  const result = await callable({ imageBase64: base64Image });
  return result.data;
}