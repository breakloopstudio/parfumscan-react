// src/features/scan/ScanCamera.tsx — Vue caméra plein écran

import { useRef, useState } from 'react';
import { View, Pressable, Text, StyleSheet } from 'react-native';
import { CameraView } from 'expo-camera';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Ionicons from "@react-native-vector-icons/ionicons/static";
import { theme } from '../../theme/theme';
import { hapticsLight } from '../../services/haptics';

interface Props { onCapture: (burstBase64: string[]) => void; onCancel: () => void; }

export function ScanCamera({ onCapture, onCancel }: Props) {
  const cameraRef = useRef<CameraView>(null);
  const insets = useSafeAreaInsets();
  const [capturing, setCapturing] = useState(false);

  const takeBurst = async () => {
    if (!cameraRef.current || capturing) return;
    setCapturing(true);
    try {
      const burst: string[] = [];
      const BURST_COUNT = 3;

      for (let i = 0; i < BURST_COUNT; i++) {
        hapticsLight();
        const photo = await cameraRef.current.takePictureAsync({ base64: true, quality: 0.6 });
        if (photo?.base64) {
          burst.push(`data:image/jpeg;base64,${photo.base64}`);
        }
      }

      if (burst.length > 0) onCapture(burst);
    } catch { /* silencieux */ } finally {
      setCapturing(false);
    }
  };

  return (
    <View style={s.container}>
      <CameraView ref={cameraRef} style={s.camera} facing="back" animateShutter={false}>
        <View style={s.overlay}>
          <View style={[s.topBar, { paddingTop: insets.top + 16 }]}>
            <Pressable onPress={onCancel} style={s.closeBtn} hitSlop={16}>
              <Ionicons name="close-circle-outline" size={36} color="#FFF" />
            </Pressable>
          </View>
          <View style={s.vf}>
            <View style={s.cTL} /><View style={s.cTR} />
            <View style={s.cBL} /><View style={s.cBR} />
          </View>
          <Text style={s.hint}>Cadre le flacon et appuie sur le déclencheur</Text>
          <View style={[s.bottomBar, { paddingBottom: insets.bottom + 16 }]}>
            <Pressable onPress={takeBurst} style={[s.captureBtn, capturing && s.captureBtnDisabled]} disabled={capturing}>
              <View style={[s.captureInner, capturing && s.captureInnerCapturing]} />
            </Pressable>
          </View>
        </View>
      </CameraView>
    </View>
  );
}

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#000' },
  camera: { flex: 1 },
  overlay: { flex: 1, justifyContent: 'space-between' },
  topBar: { paddingHorizontal: 20, alignItems: 'flex-end' },
  closeBtn: { width: 44, height: 44, justifyContent: 'center', alignItems: 'center' },
  vf: { width: 260, height: 260, alignSelf: 'center', position: 'relative', borderWidth: 2, borderColor: 'rgba(255,255,255,0.3)', borderRadius: 16 },
  cTL: { position: 'absolute', top: -2, left: -2, width: 30, height: 30, borderTopWidth: 4, borderLeftWidth: 4, borderColor: theme.colors.primary, borderTopLeftRadius: 8 },
  cTR: { position: 'absolute', top: -2, right: -2, width: 30, height: 30, borderTopWidth: 4, borderRightWidth: 4, borderColor: theme.colors.primary, borderTopRightRadius: 8 },
  cBL: { position: 'absolute', bottom: -2, left: -2, width: 30, height: 30, borderBottomWidth: 4, borderLeftWidth: 4, borderColor: theme.colors.primary, borderBottomLeftRadius: 8 },
  cBR: { position: 'absolute', bottom: -2, right: -2, width: 30, height: 30, borderBottomWidth: 4, borderRightWidth: 4, borderColor: theme.colors.primary, borderBottomRightRadius: 8 },
  hint: { color: '#FFF', textAlign: 'center', fontSize: 14, paddingHorizontal: 40, opacity: 0.8 },
  bottomBar: { alignItems: 'center' },
  captureBtn: { width: 72, height: 72, borderRadius: 36, borderWidth: 4, borderColor: '#FFF', justifyContent: 'center', alignItems: 'center' },
  captureBtnDisabled: { borderColor: 'rgba(255,255,255,0.4)' },
  captureInner: { width: 56, height: 56, borderRadius: 28, backgroundColor: '#FFF' },
  captureInnerCapturing: { backgroundColor: 'rgba(255,255,255,0.4)' },
});
