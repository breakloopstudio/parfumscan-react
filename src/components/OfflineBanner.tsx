// src/components/OfflineBanner.tsx — Bannière réseau mode hors-ligne

import { useEffect, useMemo } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import Animated, { useSharedValue, useAnimatedStyle, withTiming } from 'react-native-reanimated';
import Ionicons from '@react-native-vector-icons/ionicons/static';
import { useTheme, type Theme } from '../theme/ThemeContext';

interface Props {
  visible: boolean;
}

export default function OfflineBanner({ visible }: Props) {
  const { theme } = useTheme();
  const s = useMemo(() => getStyles(theme), [theme]);
  const translateY = useSharedValue(-50);

  useEffect(() => {
    translateY.value = withTiming(visible ? 0 : -50, { duration: 300 });
  }, [visible]);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: translateY.value }],
  }));

  return (
    <Animated.View style={[s.banner, animatedStyle]}>
      <Ionicons name="wifi-outline" size={14} color={theme.colors.fair} />
      <Text style={s.text}>Mode hors-ligne</Text>
    </Animated.View>
  );
}

function getStyles(t: Theme) {
  return {
    banner: {
      position: 'absolute',
      top: 0,
      left: 0,
      right: 0,
      zIndex: 100,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      gap: 6,
      height: 32,
      backgroundColor: t.colors.fairSoft,
      borderBottomWidth: StyleSheet.hairlineWidth,
      borderBottomColor: t.colors.fair,
    },
    text: {
      fontFamily: 'Inter_500Medium',
      fontSize: 12,
      color: t.colors.fair,
    },
  } as const;
}