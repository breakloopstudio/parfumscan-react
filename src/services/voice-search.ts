import { getApp } from '@react-native-firebase/app';
import { getFunctions, httpsCallable } from '@react-native-firebase/functions';

function fn() {
  return getFunctions(getApp(), 'europe-west1');
}

export async function transcribeVoice(audioBase64: string, mimeType: string): Promise<string> {
  const funcs = fn();
  if (!funcs) throw new Error('Firebase Functions non disponible.');
  const callable = httpsCallable<{ audioBase64: string; mimeType: string }, { text: string }>(
    funcs,
    'transcribeVoice',
  );
  try {
    const result = await callable({ audioBase64, mimeType });
    return result.data.text;
  } catch (err: unknown) {
    const e = err as { code?: string; message?: string };
    const code = e?.code;
    console.error('[Voice Search] code:', code, 'message:', e?.message);
    if (code === 'not-found') throw new Error('Service de transcription indisponible.');
    if (code === 'internal') throw new Error('Échec de la transcription vocale.');
    if (code === 'unauthenticated') throw new Error('Connexion requise pour la transcription vocale.');
    if (code === 'resource-exhausted') throw new Error('Service temporairement surchargé.');
    throw new Error('Échec de la transcription vocale.');
  }
}
