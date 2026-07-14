// src/services/openai-vision.ts — Cloud Function analyzePerfumeImage

import firebase from '@react-native-firebase/app';
import functions from '@react-native-firebase/functions';
import type { ScanResult } from '../models';

function fn() {
  return firebase.app().functions('europe-west1');
}

export async function analyzeImage(base64Image: string): Promise<ScanResult> {
  const funcs = fn();
  if (!funcs) throw new Error('Firebase Functions non disponible dans Expo Go.');
  const callable = funcs.httpsCallable<{ imageBase64: string }, ScanResult>('analyzePerfumeImage');
  try {
    const result = await callable({ imageBase64: base64Image });
    return result.data;
  } catch (err: any) {
    const code = err?.code;
    console.error('[OpenAI Vision] code:', code, 'message:', err?.message);
    // Traduire les erreurs Firebase en messages utilisateur compréhensibles
    if (code === 'not-found') throw new Error('Service d\'analyse IA indisponible. Réessayez plus tard.');
    if (code === 'internal') throw new Error('Échec de l\'analyse IA. Veuillez réessayer.');
    if (code === 'unauthenticated') throw new Error('Connexion requise pour analyser une image.');
    if (code === 'resource-exhausted') throw new Error('Service temporairement surchargé. Réessayez plus tard.');
    // Fallback : ne pas exposer le message brut Firebase à l'utilisateur
    throw new Error('Échec de l\'analyse IA. Veuillez réessayer.');
  }
}