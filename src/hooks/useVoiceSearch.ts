import { useCallback, useEffect, useRef, useState } from 'react';
import { ExpoSpeechRecognitionModule, useSpeechRecognitionEvent } from 'expo-speech-recognition';
import { useAudioRecorder, RecordingPresets } from 'expo-audio';
import * as FileSystem from 'expo-file-system';

const TOP_BRANDS = [
  'Dior', 'Chanel', 'Guerlain', 'Yves Saint Laurent', 'Lancome',
  'Hermes', 'Jean Paul Gaultier', 'Paco Rabanne', 'Givenchy',
  'Versace', 'Giorgio Armani', 'Tom Ford', 'Calvin Klein',
  'Hugo Boss', 'Burberry', 'Carolina Herrera', 'Dolce Gabbana',
  'Bvlgari', 'Acqua di Parma', 'Maison Francis Kurkdjian',
  'Creed', 'Xerjoff', 'Parfums de Marly', 'Amouage', 'By Kilian',
  'Initio', 'Nishane', 'Mancera', 'Montale', 'Roja',
  'Le Labo', 'Byredo', 'Diptyque', 'Jo Malone', 'Maison Margiela',
  'Valentino', 'Prada', 'Azzaro', 'Davidoff', 'Issey Miyake',
  'Kenzo', 'Nina Ricci', 'Thierry Mugler', 'Cacharel',
  'Lolita Lempicka', 'Boucheron', 'Cartier', 'Lalique',
  'Serge Lutens', 'Frederic Malle', 'Memo Paris', 'Ex Nihilo',
  'BDK Parfums', 'Etat Libre d Orange', 'Juliette Has A Gun',
  'Penhaligons', 'Floris', 'Narciso Rodriguez', 'L Artisan Parfumeur',
  'Chloe', 'Marc Jacobs', 'Michael Kors', 'Coach', 'Jimmy Choo',
];

export type VoiceState = 'idle' | 'listening' | 'processing' | 'error';

export function useVoiceSearch(
  onResult: (text: string) => void,
  onError?: (msg: string) => void,
) {
  const [state, setState] = useState<VoiceState>('idle');
  const [transcript, setTranscript] = useState('');
  const audioRecorder = useAudioRecorder(RecordingPresets.HIGH_QUALITY);
  const audioUriRef = useRef<string | null>(null);
  const finalTranscriptRef = useRef('');
  const recordingStartedRef = useRef(false);
  const sessionIdRef = useRef(0);
  const finalizingRef = useRef(false);

  const finalize = useCallback(async () => {
    if (finalizingRef.current) return;
    finalizingRef.current = true;

    if (recordingStartedRef.current) {
      try {
        await audioRecorder.stop();
        audioUriRef.current = audioRecorder.uri ?? null;
        recordingStartedRef.current = false;
      } catch (err: unknown) {
        console.warn('[useVoiceSearch] audioRecorder.stop() failed:', (err as Error)?.message ?? String(err));
      }
    }

    await new Promise<void>(resolve => setTimeout(resolve, 200));

    const finalText = finalTranscriptRef.current.trim();
    finalizingRef.current = false;
    sessionIdRef.current = 0;
    setState('idle');

    if (finalText) {
      try {
        onResult(finalText);
      } catch (err: unknown) {
        console.warn('[useVoiceSearch] onResult() threw:', (err as Error)?.message ?? String(err));
      }
    }
  }, [audioRecorder, onResult]);

  useSpeechRecognitionEvent('start', () => {
    if (sessionIdRef.current === 0) return;
    setState('listening');
  });

  useSpeechRecognitionEvent('end', () => {
    if (sessionIdRef.current === 0) return;
    setState('processing');
    finalize();
  });

  useSpeechRecognitionEvent('result', (event) => {
    if (sessionIdRef.current === 0) return;
    const text = event.results[0]?.transcript || '';
    if (event.isFinal) {
      finalTranscriptRef.current = (finalTranscriptRef.current + ' ' + text).trim();
      setTranscript(finalTranscriptRef.current);
    } else {
      setTranscript((finalTranscriptRef.current + ' ' + text).trim());
    }
  });

  useSpeechRecognitionEvent('error', (event) => {
    if (sessionIdRef.current === 0) return;
    finalizingRef.current = false;
    sessionIdRef.current = 0;
    const msg = event.message || 'Erreur de reconnaissance vocale.';
    console.warn('[useVoiceSearch] STT error:', msg);
    setState('error');
    onError?.(msg);
  });

  useSpeechRecognitionEvent('nomatch', () => {
    if (sessionIdRef.current === 0) return;
  });

  useEffect(() => {
    return () => {
      sessionIdRef.current = 0;
      finalizingRef.current = false;
      try { ExpoSpeechRecognitionModule.stop(); } catch { /* cleanup only */ }
      audioRecorder.stop().catch(() => {});
      if (audioUriRef.current) {
        FileSystem.deleteAsync(audioUriRef.current, { idempotent: true }).catch(() => {});
      }
    };
  }, [audioRecorder]);

  const start = useCallback(async (opts?: { continuous?: boolean }) => {
    try {
      audioUriRef.current = null;
      recordingStartedRef.current = false;
      finalizingRef.current = false;

      const perm = await ExpoSpeechRecognitionModule.requestPermissionsAsync();
      if (!perm.granted) {
        setState('error');
        onError?.('Accès au micro refusé. Vérifiez les paramètres de confidentialité.');
        return;
      }

      finalTranscriptRef.current = '';
      setTranscript('');

      sessionIdRef.current = Date.now();

      ExpoSpeechRecognitionModule.start({
        interimResults: true,
        continuous: opts?.continuous ?? false,
        contextualStrings: TOP_BRANDS,
      });

      await audioRecorder.prepareToRecordAsync();
      audioRecorder.record();
      recordingStartedRef.current = true;
    } catch (err: unknown) {
      sessionIdRef.current = 0;
      try { ExpoSpeechRecognitionModule.stop(); } catch { /* cleanup only */ }
      const msg = err instanceof Error ? err.message : 'Erreur inconnue.';
      console.warn('[useVoiceSearch] start() failed:', msg);
      setState('error');
      onError?.(msg);
    }
  }, [audioRecorder, onError]);

  const stop = useCallback(() => {
    ExpoSpeechRecognitionModule.stop();
  }, []);

  const cancel = useCallback(() => {
    sessionIdRef.current = 0;
    finalizingRef.current = false;
    try { ExpoSpeechRecognitionModule.stop(); } catch { /* cleanup only */ }
    audioRecorder.stop().catch(() => {});
    recordingStartedRef.current = false;
    setState('idle');
    setTranscript('');
    finalTranscriptRef.current = '';
    audioUriRef.current = null;
  }, [audioRecorder]);

  const getAudioForFallback = useCallback(async (): Promise<string | null> => {
    const uri = audioUriRef.current;
    if (!uri) return null;
    try {
      const base64 = await FileSystem.readAsStringAsync(uri, {
        encoding: FileSystem.EncodingType.Base64,
      });
      return base64;
    } catch (err: unknown) {
      console.warn('[useVoiceSearch] getAudioForFallback failed:', (err as Error)?.message ?? String(err));
      return null;
    }
  }, []);

  return { state, transcript, start, stop, cancel, getAudioForFallback };
}
