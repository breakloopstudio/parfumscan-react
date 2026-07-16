// src/features/scan/ScanScreen.tsx — Orchestrateur scan avec caméra réelle

import { useRef, useEffect } from 'react';
import { Alert } from 'react-native';
import { useRouter } from 'expo-router';
import { useCameraPermissions } from 'expo-camera';
import * as ImagePicker from 'expo-image-picker';
import { useAuthContext } from '../../contexts/AuthContext';
import { useScanReducer } from '../../hooks/useScanReducer';
import { analyzeImage, analyzeMultipleImages } from '../../services/openai-vision';
import { searchFragrance, fragellaToParfum, type FragranceResult } from '../../services/fragella';
import { saveScan } from '../../services/user-data';
import { batchCacheParfums } from '../../services/firestore';
import { hapticsSuccess, hapticsError } from '../../services/haptics';
import { setPendingCatalogQuery } from '../../services/catalog-bridge';
import { translateFirebaseError } from '../../utils/error-translator';
import type { ScanResult } from '../../models';
import { ScanIdle } from './ScanIdle';
import { ScanCamera } from './ScanCamera';
import { ScanLoading } from './ScanLoading';
import { ScanClarify } from './ScanClarify';
import { ScanResults } from './ScanResults';
import { ScanNoResult } from './ScanNoResult';
import { ScanError } from './ScanError';

export function ScanScreen() {
  const { user } = useAuthContext();
  const router = useRouter();
  const [permission, requestPermission] = useCameraPermissions();
  const { state, dispatch } = useScanReducer();
  const pendingAnalysis = useRef<{ burstBase64?: string[]; scanResult?: ScanResult } | null>(null);

  // Effet : gère les étapes d'animation quand on passe en mode scanning
  useEffect(() => {
    if (state.kind !== 'scanning') return;
    const t1 = setTimeout(() => dispatch({ type: 'STEP_1' }), 1000);
    const t2 = setTimeout(async () => {
      dispatch({ type: 'STEP_2' });
      const p = pendingAnalysis.current;
      if (!p) return;
      pendingAnalysis.current = null;
      try {
        if (p.burstBase64 && p.burstBase64.length > 0) {
          await handleBurstAnalysis(p.burstBase64);
        } else if (p.scanResult) {
          await searchAndShow(p.scanResult);
        }
      } catch (e: unknown) {
        dispatch({ type: 'SCAN_ERROR', message: translateFirebaseError(e) });
        hapticsError();
      }
    }, 2500);
    return () => { clearTimeout(t1); clearTimeout(t2); };
  }, [state.kind]);

  const handleOpenCamera = async () => {
    if (!permission?.granted) {
      const r = await requestPermission();
      if (!r.granted) { Alert.alert('Permission refusée', 'La caméra est nécessaire.'); return; }
    }
    dispatch({ type: 'OPEN_CAMERA' });
  };

  const handleGalleryImport = async () => {
    try {
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ['images'],
        base64: true,
        quality: 0.6,
      });

      if (result.canceled || !result.assets?.[0]?.base64) return;

      const base64 = `data:image/jpeg;base64,${result.assets[0].base64}`;
      pendingAnalysis.current = { burstBase64: [base64] };
      dispatch({ type: 'START_SCAN' });
    } catch {
      Alert.alert('Erreur', "Impossible d'accéder à la galerie.");
    }
  };

  const handleCapture = (burstBase64: string[]) => {
    pendingAnalysis.current = { burstBase64 };
    dispatch({ type: 'START_SCAN' });
  };

  const handleClarify = async (marque: string, nom: string, typeParfum: string | null, _vol: number | null) => {
    pendingAnalysis.current = { scanResult: { marque: marque || null, nom: nom || null, typeParfum: typeParfum || null, volumeMl: null, confidence: undefined } };
    dispatch({ type: 'START_SCAN' });
  };

  const handleBurstAnalysis = async (burstBase64: string[]) => {
    const [photo1, ...rest] = burstBase64;

    // Appel 1 : photo unique (detail:auto)
    const result1 = await analyzeImage(photo1);

    if (result1.confidence === 'high' && result1.marque) {
      // Cas favorable (~70%) : une seule photo suffit
      await searchAndShow(result1);
      return;
    }

    // S'il n'y a pas d'autres photos, fallback direct au résultat partiel
    if (rest.length === 0) {
      if (result1.marque || result1.nom) {
        await searchAndShow(result1);
      } else {
        dispatch({ type: 'SCAN_CLARIFY', scanResult: result1, reason: 'empty-response' });
      }
      return;
    }

    // Cas défavorable (~30%) : burst cross-referencing avec les photos restantes
    const result2 = await analyzeMultipleImages(rest);

    if (result2.marque || result2.nom) {
      await searchAndShow(result2);
    } else if (result1.marque || result1.nom) {
      await searchAndShow(result1);
    } else {
      dispatch({ type: 'SCAN_CLARIFY', scanResult: result1, reason: 'empty-response' });
    }
  };

  const searchAndShow = async (scanResult: ScanResult) => {
    try {
      const frag = await trySearch(scanResult.marque, scanResult.nom, scanResult.typeParfum);
      if (frag.length > 0) {
        hapticsSuccess();
        const parfums = frag.map(f => fragellaToParfum(f));
        // Sauvegarder le scan dans l'historique (non-bloquant)
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
          }).catch(() => {});
        }
        // Cache automatique pour les futures recherches
        try {
          const cached = await batchCacheParfums(parfums);
          if (__DEV__) console.log('[scan] batchCacheParfums OK, cached:', cached);
        } catch (e) {
          console.warn('[scan] batchCacheParfums FAILED:', e instanceof Error ? e.message : String(e));
        }
        dispatch({ type: 'SCAN_SUCCESS', parfums });
      } else {
        const noResult = scanResult.marque
          ? scanResult
          : { marque: scanResult.marque, nom: scanResult.nom ?? null, volumeMl: null, typeParfum: scanResult.typeParfum ?? null };
        dispatch({ type: 'SCAN_NO_RESULT', scanResult: noResult as ScanResult });
      }
    } catch { dispatch({ type: 'SCAN_ERROR', message: 'Erreur recherche.' }); hapticsError(); }
  };

  const trySearch = async (m: string | null, n: string | null, t?: string | null): Promise<FragranceResult[]> => {
    if (!m && !n) return [];
    try { return await searchFragrance(m ?? '', n ?? '', t); } catch { return []; }
  };

  const reset = () => { pendingAnalysis.current = null; dispatch({ type: 'RESET' }); };

  switch (state.kind) {
    case 'idle':      return <ScanIdle onStartScan={handleOpenCamera} onImportGallery={handleGalleryImport} onOpenManual={() => dispatch({ type: 'OPEN_MANUAL' })} />;
    case 'camera':    return <ScanCamera onCapture={handleCapture} onCancel={() => dispatch({ type: 'CANCEL_CAMERA' })} />;
    case 'scanning':  return <ScanLoading />;
    case 'clarify':   return <ScanClarify scanResult={state.scanResult} reason={state.reason} onSearch={handleClarify} onReset={reset} />;
    case 'results':   return <ScanResults parfums={state.parfums} onOpenCatalog={() => { setPendingCatalogQuery(state.parfums[0]?.marque ?? ''); router.back(); }} />;
    case 'no-result': return <ScanNoResult marque={state.scanResult.marque} onSearchCatalog={(m) => { reset(); setPendingCatalogQuery(m); router.back(); }} onReset={reset} />;
    case 'error':     return <ScanError message={state.message} onReset={reset} />;
  }
}
