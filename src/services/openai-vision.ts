// src/services/openai-vision.ts — Cloud Function analyzePerfumeImage

import { getApp } from '@react-native-firebase/app';
import { getFunctions, httpsCallable } from '@react-native-firebase/functions';
import type { ScanResult } from '../models';

const CALL_TIMEOUT_MS = 90_000;

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
  const callable = httpsCallable<{ imageBase64?: string; imagesBase64?: string[] }, ScanResult>(funcs, 'analyzePerfumeImage');

  try {
    const timeoutPromise = new Promise<never>((_, reject) =>
      setTimeout(() => reject(new Error('Délai d\'analyse dépassé. Vérifiez votre connexion.')), CALL_TIMEOUT_MS),
    );
    const result = await Promise.race([callable(payload), timeoutPromise]);
    return result.data;
  } catch (err: unknown) {
    const e = err as { code?: string; message?: string };
    const code = e?.code;
    console.error('[OpenAI Vision] code:', code, 'message:', e?.message);
    if (code === 'not-found') throw new Error('Service d\'analyse IA indisponible. Réessayez plus tard.');
    if (code === 'internal') throw new Error('Échec de l\'analyse IA. Veuillez réessayer.');
    if (code === 'unauthenticated') throw new Error('Connexion requise pour analyser une image.');
    if (code === 'resource-exhausted') throw new Error('Service temporairement surchargé. Réessayez plus tard.');
    if (code === 'deadline-exceeded') throw new Error("Délai d'analyse dépassé. Vérifiez votre connexion.");
    if (code === 'unavailable') throw new Error('Connexion internet perdue. Veuillez réessayer.');
    // Si c'est notre timeout personnalisé (pas un code Firebase)
    if (e?.message?.includes('Délai d\'analyse')) throw err;
    throw new Error('Échec de l\'analyse IA. Veuillez réessayer.');
  }
}
