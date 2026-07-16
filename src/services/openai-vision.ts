// src/services/openai-vision.ts — Cloud Function analyzePerfumeImage

import { getApp } from '@react-native-firebase/app';
import { getFunctions, httpsCallable } from '@react-native-firebase/functions';
import type { ScanResult } from '../models';

function fn() {
  return getFunctions(getApp(), 'europe-west1');
}

export async function analyzeImage(base64Image: string): Promise<ScanResult> {
  return callAnalyzeImage({ imageBase64: base64Image });
}

export async function analyzeMultipleImages(imagesBase64: string[]): Promise<ScanResult> {
  return callAnalyzeImage({ imagesBase64 });
}

async function callAnalyzeImage(payload: { imageBase64?: string; imagesBase64?: string[] }): Promise<ScanResult> {
  const funcs = fn();
  if (!funcs) throw new Error('Firebase Functions non disponible dans Expo Go.');
  const callable = httpsCallable<{ imageBase64?: string; imagesBase64?: string[] }, ScanResult>(funcs, 'analyzePerfumeImage');
  try {
    const result = await callable(payload);
    return result.data;
  } catch (err: unknown) {
    const e = err as { code?: string; message?: string };
    const code = e?.code;
    console.error('[OpenAI Vision] code:', code, 'message:', e?.message);
    // Traduire les erreurs Firebase en messages utilisateur compréhensibles
    if (code === 'not-found') throw new Error('Service d\'analyse IA indisponible. Réessayez plus tard.');
    if (code === 'internal') throw new Error('Échec de l\'analyse IA. Veuillez réessayer.');
    if (code === 'unauthenticated') throw new Error('Connexion requise pour analyser une image.');
    if (code === 'resource-exhausted') throw new Error('Service temporairement surchargé. Réessayez plus tard.');
    // Fallback : ne pas exposer le message brut Firebase à l'utilisateur
    throw new Error('Échec de l\'analyse IA. Veuillez réessayer.');
  }
}
