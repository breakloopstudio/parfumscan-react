// src/features/scan/ScanCamera.tsx — Vue caméra plein écran

import { useRef } from 'react';
import { View, Pressable, Text, StyleSheet } from 'react-native';
import { CameraView } from 'expo-camera';
import Ionicons from "@react-native-vector-icons/ionicons/static";
import { theme } from '../../theme/theme';

interface Props { onCapture: (base64: string) => void; onCancel: () => void; }

export function ScanCamera({ onCapture, onCancel }: Props) {
  const cameraRef = useRef<CameraView>(null);

  const takePhoto = async () => {
    if (!cameraRef.current) return;
    try {
      const photo = await cameraRef.current.takePictureAsync({ base64: true, quality: 0.8 });
      if (photo?.base64) onCapture(`data:image/jpeg;base64,${photo.base64}`);
    } catch { /* silencieux */ }
  };

  return (
    <View style={s.container}>
      <CameraView ref={cameraRef} style={s.camera} facing="back">
        <View style={s.overlay}>
          <View style={s.topBar}>
            <Pressable onPress={onCancel} style={s.closeBtn} hitSlop={16}>
              <Ionicons name="close-circle-outline" size={36} color="#FFF" />
            </Pressable>
          </View>
          <View style={s.vf}>
            <View style={s.cTL} /><View style={s.cTR} />
            <View style={s.cBL} /><View style={s.cBR} />
          </View>
          <Text style={s.hint}>Cadre le flacon et appuie sur le déclencheur</Text>
          <View style={s.bottomBar}>
            <Pressable onPress={takePhoto} style={s.captureBtn}>
              <View style={s.captureInner} />
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
  topBar: { paddingTop: 60, paddingHorizontal: 20, alignItems: 'flex-end' },
  closeBtn: { width: 44, height: 44, justifyContent: 'center', alignItems: 'center' },
  vf: { width: 260, height: 260, alignSelf: 'center', position: 'relative', borderWidth: 2, borderColor: 'rgba(255,255,255,0.3)', borderRadius: 16 },
  cTL: { position: 'absolute', top: -2, left: -2, width: 30, height: 30, borderTopWidth: 4, borderLeftWidth: 4, borderColor: theme.colors.primary, borderTopLeftRadius: 8 },
  cTR: { position: 'absolute', top: -2, right: -2, width: 30, height: 30, borderTopWidth: 4, borderRightWidth: 4, borderColor: theme.colors.primary, borderTopRightRadius: 8 },
  cBL: { position: 'absolute', bottom: -2, left: -2, width: 30, height: 30, borderBottomWidth: 4, borderLeftWidth: 4, borderColor: theme.colors.primary, borderBottomLeftRadius: 8 },
  cBR: { position: 'absolute', bottom: -2, right: -2, width: 30, height: 30, borderBottomWidth: 4, borderRightWidth: 4, borderColor: theme.colors.primary, borderBottomRightRadius: 8 },
  hint: { color: '#FFF', textAlign: 'center', fontSize: 14, paddingHorizontal: 40, opacity: 0.8 },
  bottomBar: { alignItems: 'center', paddingBottom: 60 },
  captureBtn: { width: 72, height: 72, borderRadius: 36, borderWidth: 4, borderColor: '#FFF', justifyContent: 'center', alignItems: 'center' },
  captureInner: { width: 56, height: 56, borderRadius: 28, backgroundColor: '#FFF' },
});
