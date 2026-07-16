// src/features/scan/ScanIdle.tsx — État idle : viseur animé + halo respirant

import { useEffect } from 'react';
import { View, Text, Pressable, StyleSheet } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withRepeat,
  withTiming,
  Easing,
  cancelAnimation,
} from 'react-native-reanimated';
import Ionicons from '@react-native-vector-icons/ionicons/static';
import { theme } from '../../theme/theme';

interface Props {
  onStartScan: () => void;
  onImportGallery: () => void;
  onOpenManual: () => void;
}

export function ScanIdle({ onStartScan, onImportGallery, onOpenManual }: Props) {
  const insets = useSafeAreaInsets();
  const haloOpacity = useSharedValue(0.3);
  const haloScale = useSharedValue(1);

  useEffect(() => {
    haloOpacity.value = withRepeat(
      withTiming(0.55, { duration: 2000, easing: Easing.inOut(Easing.ease) }),
      -1,
      true,
    );
    haloScale.value = withRepeat(
      withTiming(1.08, { duration: 2000, easing: Easing.inOut(Easing.ease) }),
      -1,
      true,
    );
    return () => {
      cancelAnimation(haloOpacity);
      cancelAnimation(haloScale);
    };
  }, []);

  const haloStyle = useAnimatedStyle(() => ({
    opacity: haloOpacity.value,
    transform: [{ scale: haloScale.value }],
  }));

  return (
    <View style={[s.container, { paddingTop: insets.top + 16 }]}>
      <View style={s.viewfinder}>
        <Animated.View style={[s.halo, haloStyle]} />
        <View style={[s.corner, s.tl]} />
        <View style={[s.corner, s.tr]} />
        <View style={[s.corner, s.bl]} />
        <View style={[s.corner, s.br]} />
        <Ionicons name="scan-outline" size={48} color={theme.colors.primary} style={{ opacity: 0.5 }} />
      </View>

      <Text style={s.title}>Cadre le flacon</Text>
      <Text style={s.desc}>
        L'IA reconnaît le parfum et trouve{'\n'}le meilleur prix pour toi.
      </Text>

      <View style={s.actions}>
        <Pressable onPress={onStartScan} style={s.cta}>
          <Ionicons name="camera-outline" size={20} color="#FFF" style={{ marginRight: 8 }} />
          <Text style={s.ctaText}>Scanner un flacon</Text>
        </Pressable>

        <Pressable onPress={onImportGallery} style={s.outline}>
          <Ionicons name="images-outline" size={20} color={theme.colors.primary} style={{ marginRight: 8 }} />
          <Text style={s.outlineText}>Importer de la galerie</Text>
        </Pressable>

        <Pressable onPress={onOpenManual} style={s.link}>
          <Ionicons name="search-outline" size={16} color={theme.colors.textMuted} style={{ marginRight: 6 }} />
          <Text style={s.linkText}>Rechercher sans scanner</Text>
        </Pressable>
      </View>

      <Text style={[s.tip, { bottom: 24 + insets.bottom }]}>
        Astuce : cadre la marque et le nom pour un résultat optimal
      </Text>
    </View>
  );
}

const VF = 220;
const CORNER = 28;

const s = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.background,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 32,
  },
  viewfinder: {
    width: VF,
    height: VF,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 32,
  },
  halo: {
    position: 'absolute',
    width: VF - 20,
    height: VF - 20,
    borderRadius: (VF - 20) / 2,
    borderWidth: 3,
    borderColor: theme.colors.primary,
  },
  corner: {
    position: 'absolute',
    width: CORNER,
    height: CORNER,
    borderColor: theme.colors.primary,
  },
  tl: { top: 0, left: 0, borderTopWidth: 3, borderLeftWidth: 3, borderTopLeftRadius: 8 },
  tr: { top: 0, right: 0, borderTopWidth: 3, borderRightWidth: 3, borderTopRightRadius: 8 },
  bl: { bottom: 0, left: 0, borderBottomWidth: 3, borderLeftWidth: 3, borderBottomLeftRadius: 8 },
  br: { bottom: 0, right: 0, borderBottomWidth: 3, borderRightWidth: 3, borderBottomRightRadius: 8 },
  title: {
    fontFamily: 'PlayfairDisplay_700Bold',
    fontSize: 28,
    color: theme.colors.text,
    marginBottom: 8,
  },
  desc: {
    fontFamily: 'Inter_400Regular',
    fontSize: 15,
    color: theme.colors.textMuted,
    textAlign: 'center',
    lineHeight: 22,
    marginBottom: 36,
  },
  actions: {
    width: '100%',
    maxWidth: 320,
  },
  cta: {
    flexDirection: 'row',
    backgroundColor: theme.colors.primary,
    borderRadius: theme.radius.base,
    height: 54,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 12,
    ...theme.shadow.button,
  },
  ctaText: {
    color: '#FFFFFF',
    fontFamily: 'Inter_600SemiBold',
    fontSize: 17,
  },
  outline: {
    flexDirection: 'row',
    borderRadius: theme.radius.base,
    height: 48,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 14,
    borderWidth: 1.5,
    borderColor: theme.colors.primary,
  },
  outlineText: {
    color: theme.colors.primary,
    fontFamily: 'Inter_600SemiBold',
    fontSize: 15,
  },
  link: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 24,
  },
  linkText: {
    fontFamily: 'Inter_500Medium',
    fontSize: 14,
    color: theme.colors.textMuted,
  },
  tip: {
    position: 'absolute',
    bottom: 24,
    fontFamily: 'Inter_400Regular',
    fontSize: 12,
    color: theme.colors.textMuted,
    textAlign: 'center',
    paddingHorizontal: 32,
  },
});
