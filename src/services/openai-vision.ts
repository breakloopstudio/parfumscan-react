// src/services/openai-vision.ts — Cloud Function analyzePerfumeImage
// Compatible Expo Go

import type { ScanResult } from '../models';

let _functions: any = null;
try { _functions = require('@react-native-firebase/functions').default; } catch {}

export async function analyzeImage(base64Image: string): Promise<ScanResult> {
  if (!_functions) throw new Error('Firebase Functions non disponible dans Expo Go.');
  const callable = _functions().httpsCallable<{ imageBase64: string }, ScanResult>('analyzePerfumeImage');
  const result = await callable({ imageBase64 });
  return result.data;
}