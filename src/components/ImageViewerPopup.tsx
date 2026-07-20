// src/components/ImageViewerPopup.tsx — Popup plein écran pour voir la photo du parfum
// Overlay centré, tap n'importe où pour fermer

import { useMemo, useEffect } from 'react';
import { View, Text, Pressable, useWindowDimensions } from 'react-native';
import { Image } from 'expo-image';
import Ionicons from '@react-native-vector-icons/ionicons/static';
import Animated, { useSharedValue, useAnimatedStyle, withTiming, cancelAnimation } from 'react-native-reanimated';
import { useTheme, type Theme } from '../theme/ThemeContext';

interface Props {
  visible: boolean;
  imageUrl: string;
  brand: string;
  onClose: () => void;
}

export default function ImageViewerPopup({ visible, imageUrl, brand, onClose }: Props) {
  const { theme } = useTheme();
  const s = useMemo(() => getStyles(theme), [theme]);
  const { width: screenWidth, height: screenHeight } = useWindowDimensions();

  const opacity = useSharedValue(0);
  const scale = useSharedValue(0.92);

  useEffect(() => {
    if (!visible) return;
    opacity.value = withTiming(1, { duration: 250 });
    scale.value = withTiming(1, { duration: 250 });
    return () => {
      cancelAnimation(opacity);
      cancelAnimation(scale);
    };
  }, [visible]);

  const animStyle = useAnimatedStyle(() => ({
    opacity: opacity.value,
    transform: [{ scale: scale.value }],
  }));

  const imageSize = Math.min(screenWidth - 48, screenHeight * 0.65);

  if (!visible) return null;

  return (
    <View style={s.backdrop}>
      <Pressable
        style={s.backdropTouch}
        onPress={onClose}
        accessibilityRole="button"
        accessibilityLabel="Fermer l'aperçu de la photo"
      />
      <Animated.View style={[s.card, animStyle]}>
        <Pressable onPress={onClose} style={s.closeBtn} hitSlop={12}>
          <Ionicons name="close" size={20} color={theme.colors.textMuted} />
        </Pressable>

        <Image
          source={{ uri: imageUrl }}
          style={{ width: imageSize, height: imageSize, borderRadius: theme.radius.card }}
          contentFit="contain"
          transition={300}
        />

        <Text style={s.brand}>{brand}</Text>
      </Animated.View>
    </View>
  );
}

function getStyles(t: Theme) {
  return {
    backdrop: {
      position: 'absolute' as const,
      inset: 0,
      zIndex: 200,
      justifyContent: 'center' as const,
      alignItems: 'center' as const,
    },
    backdropTouch: {
      ...({ position: 'absolute' as const, inset: 0, backgroundColor: 'rgba(0,0,0,0.6)' } as const),
    },
    card: {
      alignItems: 'center' as const,
    },
    closeBtn: {
      position: 'absolute' as const,
      top: -44,
      right: 0,
      width: 36,
      height: 36,
      borderRadius: 18,
      backgroundColor: t.colors.surface,
      justifyContent: 'center' as const,
      alignItems: 'center' as const,
      zIndex: 1,
    },
    brand: {
      fontFamily: 'Inter_400Regular',
      fontSize: 12,
      textTransform: 'uppercase' as const,
      letterSpacing: 1.5,
      color: t.colors.textMuted,
      marginTop: 12,
    },
  } as const;
}
