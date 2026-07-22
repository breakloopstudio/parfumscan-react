// src/features/scan/ScanScreen.tsx — Orchestrateur scan avec caméra réelle

import { useRef, useEffect, useCallback } from 'react';
import { Alert, Linking } from 'react-native';
import { useRouter } from 'expo-router';
import { useCameraPermissions } from 'expo-camera';
import * as ImagePicker from 'expo-image-picker';
import { manipulateAsync, SaveFormat } from 'expo-image-manipulator';
import { useAuthContext } from '../../contexts/AuthContext';
import { useScanReducer } from '../../hooks/useScanReducer';
import { analyzeImage, analyzeMultipleImages } from '../../services/openai-vision';
import { searchParfumFromScan } from '../../services/firestore';
import { saveScan } from '../../services/user-data';
import { hapticsSuccess, hapticsError } from '../../services/haptics';
import { setPendingCatalogQuery } from '../../services/catalog-bridge';
import { translateFirebaseError } from '../../utils/error-translator';
import type { ScanResult, Parfum } from '../../models';
import { ScanIdle } from './ScanIdle';
import { ScanCamera } from './ScanCamera';
import { ScanLoading } from './ScanLoading';
import { ScanClarify } from './ScanClarify';
import { ScanResults } from './ScanResults';
import { ScanNoResult } from './ScanNoResult';
import { ScanError } from './ScanError';

// Resize max pour limiter les payloads (ex-capteur 12MP → ~100-300KB base64)
const MAX_IMAGE_WIDTH = 1024;
const IMAGE_QUALITY = 0.6;

async function resizeToBase64(uri: string): Promise<string | null> {
  const result = await manipulateAsync(
    uri,
    [{ resize: { width: MAX_IMAGE_WIDTH } }],
    { compress: IMAGE_QUALITY, base64: true, format: SaveFormat.JPEG },
  );
  return result.base64 ?? null;
}

export function ScanScreen() {
  const { user } = useAuthContext();
  const router = useRouter();
  const [permission, requestPermission] = useCameraPermissions();
  const { state, dispatch } = useScanReducer();

  // Ref garde-fous
  const mountedRef = useRef(true);
  const analysisDispatchedRef = useRef(false);
  const lastBurstRef = useRef<string[] | null>(null);

  useEffect(() => {
    mountedRef.current = true;
    return () => { mountedRef.current = false; };
  }, []);

  // ─── Handlers ────────────────────────────────────────

  const trySearch = useCallback(async (m: string | null, n: string | null): Promise<Parfum[]> => {
    if (!m && !n) return [];
    return await searchParfumFromScan(m, n);
  }, []);

  const reset = useCallback(() => {
    analysisDispatchedRef.current = false;
    lastBurstRef.current = null;
    dispatch({ type: 'RESET' });
  }, [dispatch]);

  const handleCancelScan = useCallback(() => {
    analysisDispatchedRef.current = false;
    dispatch({ type: 'RESET' });
  }, [dispatch]);

  const handleOpenCamera = useCallback(async () => {
    if (!permission?.granted) {
      const r = await requestPermission();
      if (!r.granted) {
        if (!r.canAskAgain) {
          Alert.alert('Permission refusée', 'Activez la caméra dans les réglages de l\'appareil.', [
            { text: 'Annuler', style: 'cancel' },
            { text: 'Réglages', onPress: () => Linking.openSettings() },
          ]);
        } else {
          Alert.alert('Permission refusée', 'La caméra est nécessaire pour scanner un flacon.');
        }
        return;
      }
    }
    dispatch({ type: 'OPEN_CAMERA' });
  }, [permission, requestPermission, dispatch]);

  const handleGalleryImport = useCallback(async () => {
    try {
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ['images'],
        quality: IMAGE_QUALITY,
      });

      if (result.canceled || !result.assets?.[0]?.uri) return;

      const base64 = await resizeToBase64(result.assets[0].uri);
      if (!base64) {
        Alert.alert('Erreur', 'Impossible de traiter cette image.');
        return;
      }

      const images = [`data:image/jpeg;base64,${base64}`];
      lastBurstRef.current = images;
      dispatch({ type: 'START_SCAN', images });
    } catch {
      Alert.alert('Erreur', "Impossible d'accéder à la galerie.");
    }
  }, [dispatch]);

  const handleCapture = useCallback((burstBase64: string[]) => {
    lastBurstRef.current = burstBase64;
    dispatch({ type: 'START_SCAN', images: burstBase64 });
  }, [dispatch]);

  const handleClarify = useCallback(async (marque: string, nom: string, typeParfum: string | null, volumeMl: number | null) => {
    dispatch({
      type: 'START_SCAN',
      scanResult: {
        marque: marque || null,
        nom: nom || null,
        typeParfum: typeParfum || null,
        volumeMl,
      },
    });
  }, [dispatch]);

  // ─── Pipeline analyse → recherche → résultats ─────────

  const searchAndShow = useCallback(async (scanResult: ScanResult) => {
    try {
      const parfums = await trySearch(scanResult.marque, scanResult.nom);
      if (!mountedRef.current) return;

      if (parfums.length > 0) {
        hapticsSuccess();
        if (user?.uid) {
          const top = parfums[0];
          saveScan(user.uid, {
            rawText: JSON.stringify({ marque: scanResult.marque, nom: scanResult.nom, typeParfum: scanResult.typeParfum }),
            marque: top?.marque ?? scanResult.marque ?? undefined,
            nom: top?.nom ?? scanResult.nom ?? undefined,
            typeParfum: scanResult.typeParfum ?? undefined,
            parfumId: top?.id,
            imageUrl: top?.imageUrl,
            familleOlactive: top?.familleOlactive,
            annee: top?.annee,
            bestPrice: top?.bestPrice,
            status: 'success',
          }).catch(() => {});
        }
        if (mountedRef.current) {
          dispatch({ type: 'SCAN_SUCCESS', parfums });
        }
      } else {
        if (user?.uid) {
          saveScan(user.uid, {
            rawText: JSON.stringify({ marque: scanResult.marque, nom: scanResult.nom, typeParfum: scanResult.typeParfum }),
            marque: scanResult.marque ?? undefined,
            nom: scanResult.nom ?? undefined,
            typeParfum: scanResult.typeParfum ?? undefined,
            status: 'no-result',
          }).catch(() => {});
        }
        if (mountedRef.current) {
          dispatch({ type: 'SCAN_NO_RESULT', scanResult });
        }
      }
    } catch {
      if (user?.uid) {
        saveScan(user.uid, {
          rawText: JSON.stringify(scanResult),
          marque: scanResult.marque ?? undefined,
          nom: scanResult.nom ?? undefined,
          status: 'error',
        }).catch(() => {});
      }
      if (mountedRef.current) {
        dispatch({ type: 'SCAN_ERROR', message: 'Connexion impossible. Vérifiez votre réseau.' });
        hapticsError();
      }
    }
  }, [trySearch, dispatch, user?.uid]);

  const clarifyOrSearch = useCallback(async (result: ScanResult) => {
    if (!result.marque && !result.nom) {
      if (mountedRef.current) {
        dispatch({ type: 'SCAN_CLARIFY', scanResult: result, reason: 'empty-response' });
      }
      return;
    }
    if (result.confidence === 'low') {
      if (mountedRef.current) {
        dispatch({ type: 'SCAN_CLARIFY', scanResult: result, reason: 'low-confidence' });
      }
      return;
    }
    await searchAndShow(result);
  }, [searchAndShow, dispatch]);

  const handleBurstAnalysis = useCallback(async (burstBase64: string[]) => {
    if (burstBase64.length >= 2) {
      const result = await analyzeMultipleImages(burstBase64);
      await clarifyOrSearch(result);
      return;
    }
    const result = await analyzeImage(burstBase64[0]);
    await clarifyOrSearch(result);
  }, [clarifyOrSearch]);

  // ─── Effet : déclenchement immédiat + temps d'animation minimum ──

  const scanningImages = state.kind === 'scanning' ? state.images : undefined;
  const scanningResult = state.kind === 'scanning' ? state.scanResult : undefined;

  useEffect(() => {
    if (state.kind !== 'scanning') {
      analysisDispatchedRef.current = false;
      return;
    }

    if (analysisDispatchedRef.current) return;
    analysisDispatchedRef.current = true;

    const MIN_ANIMATION_MS = 1200;
    const started = Date.now();

    (async () => {
      try {
        if (scanningImages && scanningImages.length > 0) {
          await handleBurstAnalysis(scanningImages);
        } else if (scanningResult) {
          await searchAndShow(scanningResult);
        } else {
          if (mountedRef.current) {
            dispatch({ type: 'SCAN_ERROR', message: 'Une erreur inattendue est survenue. Veuillez réessayer.' });
            hapticsError();
          }
          return;
        }
      } catch (e: unknown) {
        if (mountedRef.current) {
          dispatch({ type: 'SCAN_ERROR', message: translateFirebaseError(e) });
          hapticsError();
        }
        return;
      }

      const elapsed = Date.now() - started;
      if (elapsed < MIN_ANIMATION_MS) {
        await new Promise(r => setTimeout(r, MIN_ANIMATION_MS - elapsed));
      }
    })();
  }, [state.kind, handleBurstAnalysis, searchAndShow, dispatch, scanningImages, scanningResult]);

  // ─── Actions depuis les écrans de résultat ─────────────

  const handleRetryAnalysis = useCallback(() => {
    const burst = lastBurstRef.current;
    if (burst && burst.length > 0) {
      dispatch({ type: 'START_SCAN', images: burst });
    } else {
      reset();
    }
  }, [reset, dispatch]);

  const handleOpenCatalog = useCallback(() => {
    setPendingCatalogQuery(state.kind === 'results' ? (state.parfums[0]?.marque ?? '') : '');
    router.back();
  }, [router, state]);

  const handleSearchCatalog = useCallback((m: string) => {
    reset();
    setPendingCatalogQuery(m);
    router.back();
  }, [reset, router]);

  // ─── Rendu par état ────────────────────────────────────

  switch (state.kind) {
    case 'idle':
      return <ScanIdle onStartScan={handleOpenCamera} onImportGallery={handleGalleryImport} onOpenManual={() => dispatch({ type: 'OPEN_MANUAL' })} />;
    case 'camera':
      return <ScanCamera onCapture={handleCapture} onCancel={() => dispatch({ type: 'CANCEL_CAMERA' })} />;
    case 'scanning':
      return <ScanLoading onCancel={handleCancelScan} />;
    case 'clarify':
      return <ScanClarify scanResult={state.scanResult} reason={state.reason} onSearch={handleClarify} onReset={reset} />;
    case 'results':
      return <ScanResults parfums={state.parfums} onOpenCatalog={handleOpenCatalog} />;
    case 'no-result':
      return <ScanNoResult marque={state.scanResult.marque} onSearchCatalog={handleSearchCatalog} onReset={reset} />;
    case 'error':
      return <ScanError message={state.message} onReset={reset} onRetryAnalysis={lastBurstRef.current ? handleRetryAnalysis : undefined} />;
  }
}
