// src/features/scan/ScanScreen.tsx — Orchestrateur scan avec caméra réelle

import { useRef, useEffect } from 'react';
import { Alert } from 'react-native';
import { useRouter } from 'expo-router';
import { useCameraPermissions } from 'expo-camera';
import { useAuthContext } from '../../contexts/AuthContext';
import { useScanReducer } from '../../hooks/useScanReducer';
import { analyzeImage } from '../../services/openai-vision';
import { searchFragrance, fragellaToParfum, type FragranceResult } from '../../services/fragella';
import { saveScan } from '../../services/user-data';
import { batchCacheParfums } from '../../services/firestore';
import { hapticsLight, hapticsSuccess, hapticsError } from '../../services/haptics';
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
  const pendingAnalysis = useRef<{ base64?: string; scanResult?: ScanResult } | null>(null);

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
        if (p.base64) {
          const result = await analyzeImage(p.base64);
          if (!result.marque && !result.nom) {
            dispatch({ type: 'SCAN_CLARIFY', scanResult: result, reason: 'empty-response' });
            return;
          }
          await searchAndShow(result);
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

  const handleCapture = async (base64: string) => {
    pendingAnalysis.current = { base64 };
    dispatch({ type: 'START_SCAN' });
    hapticsLight();
  };

  const handleClarify = async (marque: string, nom: string, typeParfum: string | null, _vol: number | null) => {
    pendingAnalysis.current = { scanResult: { marque: marque || null, nom: nom || null, typeParfum: typeParfum || null, volumeMl: null, confidence: undefined } };
    dispatch({ type: 'START_SCAN' });
  };

  const searchAndShow = async (scanResult: ScanResult) => {
    try {
      const frag = await trySearch(scanResult.marque, scanResult.nom, scanResult.typeParfum);
      if (frag.length > 0) {
        hapticsSuccess();
        const parfums = frag.map(f => fragellaToParfum(f));
        if (user?.uid) saveScan(user.uid, { rawText: JSON.stringify({ marque: scanResult.marque, nom: scanResult.nom, typeParfum: scanResult.typeParfum }), marque: frag[0]?.marque ?? scanResult.marque ?? undefined, nom: frag[0]?.nom ?? scanResult.nom ?? undefined, typeParfum: scanResult.typeParfum ?? undefined, parfumId: frag[0]?.id }).catch(() => {});
        // Cache automatique pour les futures recherches
        try { await batchCacheParfums(parfums); } catch {}
        dispatch({ type: 'SCAN_SUCCESS', parfums });
      } else {
        dispatch({ type: 'SCAN_NO_RESULT', scanResult: scanResult.marque ? scanResult : { marque: scanResult.marque, nom: scanResult.nom ?? null, volumeMl: null, typeParfum: scanResult.typeParfum ?? null } });
      }
    } catch { dispatch({ type: 'SCAN_ERROR', message: 'Erreur recherche.' }); hapticsError(); }
  };

  const trySearch = async (m: string | null, n: string | null, t?: string | null): Promise<FragranceResult[]> => {
    if (!m && !n) return [];
    try { return await searchFragrance(m ?? '', n ?? '', t); } catch { return []; }
  };

  const reset = () => { pendingAnalysis.current = null; dispatch({ type: 'RESET' }); };

  switch (state.kind) {
    case 'idle':      return <ScanIdle onStartScan={handleOpenCamera} onOpenManual={() => dispatch({ type: 'OPEN_MANUAL' })} />;
    case 'camera':    return <ScanCamera onCapture={handleCapture} onCancel={() => dispatch({ type: 'CANCEL_CAMERA' })} />;
    case 'scanning':  return <ScanLoading step={state.step} />;
    case 'clarify':   return <ScanClarify scanResult={state.scanResult} reason={state.reason} onSearch={handleClarify} onReset={reset} />;
    case 'results':   return <ScanResults parfums={state.parfums} onOpenCatalog={() => { setPendingCatalogQuery(state.parfums[0]?.marque ?? ''); router.back(); }} />;
    case 'no-result': return <ScanNoResult marque={state.scanResult.marque} onSearchCatalog={(m) => { reset(); setPendingCatalogQuery(m); router.back(); }} onReset={reset} />;
    case 'error':     return <ScanError message={state.message} onReset={reset} />;
  }
}
