// src/features/navigation/DockBar.tsx — Barre flottante 5 positions + FAB
// Indicateur dore, verre depoli (BlurView), pulse ring FAB, show/hide au scroll

import { useEffect, useMemo } from 'react';
import { View, Text, Pressable, StyleSheet } from 'react-native';
import { useRouter } from 'expo-router';
import { BlurView } from 'expo-blur';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  useAnimatedReaction,
  withTiming,
  withSpring,
  withRepeat,
  Easing,
  cancelAnimation,
  type SharedValue,
} from 'react-native-reanimated';
import Ionicons from '@react-native-vector-icons/ionicons/static';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme, type Theme } from '../../theme/ThemeContext';
import { hapticsLight } from '../../services/haptics';

const FAB_SPACE = 64;
const INDICATOR_W = 28;
const PULSE_MIN = 1;
const PULSE_MAX = 1.18;

interface Props {
  activeIndex: number;
  pageWidth: SharedValue<number>;
  dockTranslateY: SharedValue<number>;
  onTabPress: (index: number) => void;
}

export default function DockBar({ activeIndex, pageWidth, dockTranslateY, onTabPress }: Props) {
  const { theme, resolvedMode } = useTheme();
  const m = useMemo(() => getStyles(theme), [theme]);
  const router = useRouter();
  const insets = useSafeAreaInsets();

  const pulseScale = useSharedValue(PULSE_MIN);
  const indicatorLeft = useSharedValue(0);

  useEffect(() => {
    pulseScale.value = withRepeat(
      withTiming(PULSE_MAX, { duration: 2500, easing: Easing.out(Easing.ease) }),
      -1,
      true,
    );
    return () => cancelAnimation(pulseScale);
  }, []);

  const getBarWidth = (sw: number) => {
    'worklet';
    return Math.min(sw * 0.88, 380);
  };

  const getIndicatorLeft = (sw: number, tabIdx: number) => {
    'worklet';
    const barW = getBarWidth(sw);
    const tabArea = barW - FAB_SPACE;
    const tabW = tabArea / 4;
    const fabOffset = tabIdx >= 2 ? FAB_SPACE : 0;
    return tabW * tabIdx + tabW / 2 - INDICATOR_W / 2 + fabOffset;
  };

  useAnimatedReaction(
    () => activeIndex,
    (current, prev) => {
      const w = pageWidth.value;
      const tabIdx = current < 2 ? current : current - 1;
      const target = getIndicatorLeft(w, tabIdx);
      if (prev === null || prev === current) {
        indicatorLeft.value = target;
      } else {
        indicatorLeft.value = withSpring(target, { damping: 22, stiffness: 280, mass: 0.7 });
      }
    },
  );

  const indicatorStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: indicatorLeft.value }],
  }));

  const dockStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: dockTranslateY.value }],
  }));

  const pulseRingStyle = useAnimatedStyle(() => ({
    transform: [{ scale: pulseScale.value }],
    opacity: 2 - pulseScale.value,
  }));

  const handlePress = (index: number) => {
    if (index === 2) {
      hapticsLight();
      router.push('/(tabs)/scan');
    } else {
      onTabPress(index);
    }
  };

  const tabs = [
    { index: 0, iconActive: 'book', iconInactive: 'book-outline', label: 'Catalogue' },
    { index: 1, iconActive: 'heart', iconInactive: 'heart-outline', label: 'Favoris' },
    { index: 2, iconActive: 'camera', iconInactive: 'camera-outline', label: 'Scan', isFab: true },
    { index: 3, iconActive: 'time', iconInactive: 'time-outline', label: 'Historique' },
    { index: 4, iconActive: 'flask', iconInactive: 'flask-outline', label: 'Collection' },
  ] as const;

  return (
    <Animated.View style={[s.wrapper, { paddingBottom: 8 + insets.bottom }, dockStyle]} pointerEvents="box-none">
      <View style={[s.bar, m.border, m.barShadow]}>
        <BlurView
          intensity={24}
          tint={resolvedMode === 'dark' ? 'dark' : 'light'}
          style={s.blur}
        />
        <View style={[s.overlay, m.overlay]} />
        <Animated.View style={[s.indicator, m.indicator, { left: 0 }, indicatorStyle]} />

        {tabs.map(tab => {
          if ('isFab' in tab) {
            return (
              <View key={tab.index} style={s.fabSlot}>
                <View style={s.fabOuter}>
                  <Animated.View style={[s.pulseRing, m.pulseRing, pulseRingStyle]} />
                  <Pressable
                    style={[s.fab, m.fab, m.fabShadow]}
                    onPress={() => handlePress(tab.index)}
                  >
                    <Ionicons name="camera" size={24} color="#FFF" />
                  </Pressable>
                </View>
              </View>
            );
          }

          const isActive = activeIndex === tab.index;
          return (
            <Pressable key={tab.index} style={s.tab} onPress={() => handlePress(tab.index)} hitSlop={4}>
              <Ionicons
                name={isActive ? tab.iconActive : tab.iconInactive}
                size={22}
                color={isActive ? theme.colors.primary : theme.colors.textMuted}
              />
              <Text style={[m.label, isActive && m.labelOn]}>{tab.label}</Text>
            </Pressable>
          );
        })}
      </View>
    </Animated.View>
  );
}

const s = StyleSheet.create({
  wrapper: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    alignItems: 'center',
  },
  bar: {
    flexDirection: 'row',
    alignItems: 'center',
    height: 64,
    width: '88%',
    maxWidth: 380,
    borderRadius: 24,
    overflow: 'hidden',
  },
  blur: {
    ...StyleSheet.absoluteFill,
    borderRadius: 24,
  },
  overlay: {
    ...StyleSheet.absoluteFill,
    borderRadius: 24,
  },
  indicator: {
    position: 'absolute',
    top: 6,
    width: INDICATOR_W,
    height: 3,
    borderRadius: 2,
    zIndex: 2,
  },
  tab: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 3,
    paddingTop: 6,
    zIndex: 2,
  },
  fabSlot: {
    flex: 0,
    width: FAB_SPACE,
    alignItems: 'center',
    justifyContent: 'center',
    height: '100%',
    zIndex: 2,
  },
  fabOuter: {
    width: 56,
    height: 56,
    justifyContent: 'center',
    alignItems: 'center',
  },
  fab: {
    width: 56,
    height: 56,
    borderRadius: 28,
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 3,
  },
  pulseRing: {
    position: 'absolute',
    inset: -4,
    borderRadius: 32,
    borderWidth: 1.5,
  },
});

function getStyles(t: Theme) {
  return {
    barShadow: { ...t.shadow.elevated },
    border: {
      borderWidth: StyleSheet.hairlineWidth,
      borderColor: t.colors.border,
    },
    overlay: {
      backgroundColor: t.colors.background + 'E0',
    },
    indicator: { backgroundColor: t.colors.secondary },
    label: { fontFamily: 'Inter_500Medium', fontSize: 10, color: t.colors.textMuted },
    labelOn: { color: t.colors.primary },
    fab: { backgroundColor: t.colors.primary },
    fabShadow: { ...t.shadow.scanCircle },
    pulseRing: { borderColor: t.colors.primary + '4D' },
  } as const;
}
