// src/features/scan/ScanCamera.tsx — Vue caméra avec viseur animé et flash de capture

import { useRef, useState, useMemo } from 'react';
import { View, Pressable, Text, StyleSheet } from 'react-native';
import { CameraView } from 'expo-camera';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  withSequence,
  runOnJS,
} from 'react-native-reanimated';
import Ionicons from '@react-native-vector-icons/ionicons/static';
import { useTheme, type Theme } from '../../theme/ThemeContext';
import { hapticsLight } from '../../services/haptics';

interface Props {
  onCapture: (burstBase64: string[]) => void;
  onCancel: () => void;
}

export function ScanCamera({ onCapture, onCancel }: Props) {
  const { theme } = useTheme();
  const s = useMemo(() => getStyles(theme), [theme]);
  const cameraRef = useRef<CameraView>(null);
  const insets = useSafeAreaInsets();
  const [capturing, setCapturing] = useState(false);

  const flashOpacity = useSharedValue(0);

  const flashStyle = useAnimatedStyle(() => ({
    opacity: flashOpacity.value,
  }));

  const triggerFlash = () => {
    'worklet';
    flashOpacity.value = withSequence(
      withTiming(1, { duration: 80 }),
      withTiming(0, { duration: 400 }),
    );
  };

  const takeBurst = async () => {
    if (!cameraRef.current || capturing) return;
    setCapturing(true);
    try {
      const burst: string[] = [];
      const BURST_COUNT = 3;

      for (let i = 0; i < BURST_COUNT; i++) {
        hapticsLight();
        const photo = await cameraRef.current.takePictureAsync({
          base64: true,
          quality: 0.6,
        });
        if (photo?.base64) {
          burst.push(`data:image/jpeg;base64,${photo.base64}`);
        }
      }

      if (burst.length > 0) {
        triggerFlash();
        runOnJS(onCapture)(burst);
      } else {
        setCapturing(false);
      }
    } catch {
      setCapturing(false);
    }
  };

  return (
    <View style={s.container}>
      <CameraView
        ref={cameraRef}
        style={s.camera}
        facing="back"
        animateShutter={false}
      >
        <View style={s.overlay}>
          <View style={[s.topBar, { paddingTop: insets.top + 16 }]}>
            <Pressable onPress={onCancel} style={s.closeBtn} hitSlop={16}>
              <Ionicons name="close-circle-outline" size={36} color="#FFF" />
            </Pressable>
          </View>

          <View style={s.vf}>
            <View style={[s.cTL, s.cActive]} />
            <View style={[s.cTR, s.cActive]} />
            <View style={[s.cBL, s.cActive]} />
            <View style={[s.cBR, s.cActive]} />
          </View>

          <Text style={s.hint}>
            Cadre le flacon et appuie sur le déclencheur
          </Text>

          <View style={[s.bottomBar, { paddingBottom: insets.bottom + 16 }]}>
            <Pressable
              onPress={takeBurst}
              style={[s.captureBtn, capturing && s.captureDisabled]}
              disabled={capturing}
            >
              <View style={[s.captureInner, capturing && s.captureInnerDisabled]} />
            </Pressable>
          </View>
        </View>
      </CameraView>

      <Animated.View style={[s.flashOverlay, flashStyle]} pointerEvents="none" />
    </View>
  );
}

function getStyles(t: Theme) {
  return {
    container: { flex: 1, backgroundColor: '#000' },
    camera: { flex: 1 },
    overlay: { flex: 1, justifyContent: 'space-between' },
    topBar: { paddingHorizontal: 20, alignItems: 'flex-end' },
    closeBtn: { width: 44, height: 44, justifyContent: 'center', alignItems: 'center' },
    vf: {
      width: 260,
      height: 260,
      alignSelf: 'center',
      borderWidth: 2,
      borderColor: 'rgba(255,255,255,0.25)',
      borderRadius: 16,
    },
    cTL: { position: 'absolute', top: -2, left: -2, width: 30, height: 30, borderTopWidth: 4, borderLeftWidth: 4, borderColor: t.colors.primary, borderTopLeftRadius: 8 },
    cTR: { position: 'absolute', top: -2, right: -2, width: 30, height: 30, borderTopWidth: 4, borderRightWidth: 4, borderColor: t.colors.primary, borderTopRightRadius: 8 },
    cBL: { position: 'absolute', bottom: -2, left: -2, width: 30, height: 30, borderBottomWidth: 4, borderLeftWidth: 4, borderColor: t.colors.primary, borderBottomLeftRadius: 8 },
    cBR: { position: 'absolute', bottom: -2, right: -2, width: 30, height: 30, borderBottomWidth: 4, borderRightWidth: 4, borderColor: t.colors.primary, borderBottomRightRadius: 8 },
    cActive: { borderColor: t.colors.primary },
    hint: { color: '#FFF', textAlign: 'center', fontFamily: 'Inter_400Regular', fontSize: 14, paddingHorizontal: 40, opacity: 0.8 },
    bottomBar: { alignItems: 'center' },
    captureBtn: {
      width: 72,
      height: 72,
      borderRadius: 36,
      borderWidth: 4,
      borderColor: '#FFF',
      justifyContent: 'center',
      alignItems: 'center',
    },
    captureDisabled: { borderColor: 'rgba(255,255,255,0.4)' },
    captureInner: { width: 56, height: 56, borderRadius: 28, backgroundColor: '#FFF' },
    captureInnerDisabled: { backgroundColor: 'rgba(255,255,255,0.4)' },
    flashOverlay: {
      ...StyleSheet.absoluteFill,
      backgroundColor: '#FFFFFF',
    },
  } as const;
}