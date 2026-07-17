// src/features/navigation/DockBar.tsx — Barre flottante 5 positions + FAB
// Indicateur doré, glass morphism, adapté du pager actuel

import { useMemo } from 'react';
import { View, Text, Pressable, StyleSheet } from 'react-native';
import { useRouter } from 'expo-router';
import Animated, { useAnimatedStyle, type SharedValue } from 'react-native-reanimated';
import Ionicons from '@react-native-vector-icons/ionicons/static';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme, type Theme } from '../../theme/ThemeContext';
import { hapticsLight } from '../../services/haptics';

const FAB_SPACE = 58;
const INDICATOR_W = 28;
const POSITIONS = 4; // 4 tabs visibles (Catalogue, Favoris, Historique, Collection)

interface Props {
  activeIndex: number; // 0=Catalogue, 1=Favoris, 3=Historique, 4=Collection (2=FAB/Scan)
  pageWidth: SharedValue<number>;
  onTabPress: (index: number) => void;
}

export default function DockBar({ activeIndex, pageWidth, onTabPress }: Props) {
  const { theme } = useTheme();
  const m = useMemo(() => getStyles(theme), [theme]);
  const router = useRouter();
  const insets = useSafeAreaInsets();

  const getBarWidth = (sw: number) => {
    'worklet';
    return Math.min(sw * 0.88, 380);
  };

  const getIndicatorLeft = (sw: number, tabIdx: number) => {
    'worklet';
    const barW = getBarWidth(sw);
    const tabArea = barW - FAB_SPACE;
    const tabW = tabArea / 4;
    return tabW * tabIdx + tabW / 2 - INDICATOR_W / 2;
  };

  const indicatorStyle = useAnimatedStyle(() => {
    const w = pageWidth.value;
    const tabIdx = activeIndex < 2 ? activeIndex : activeIndex - 1;
    return { transform: [{ translateX: getIndicatorLeft(w, tabIdx) }] };
  });

  const handlePress = (index: number) => {
    hapticsLight();
    if (index === 2) {
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
    <View style={[s.wrapper, { paddingBottom: 8 + insets.bottom }]} pointerEvents="box-none">
      <View style={[s.bar, m.bar, theme.shadow.card]}>
        <Animated.View style={[s.indicator, m.indicator, { left: 0 }, indicatorStyle]} />

        {tabs.map(tab => {
          if ('isFab' in tab) {
            return (
              <View key={tab.index} style={s.fabSlot}>
                <Pressable style={[s.fab, m.fab, theme.shadow.scanCircle]} onPress={() => handlePress(tab.index)}>
                  <Ionicons name="camera" size={22} color="#FFF" />
                </Pressable>
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
    </View>
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
    height: 60,
    width: '88%',
    maxWidth: 380,
    borderRadius: 22,
    borderWidth: StyleSheet.hairlineWidth,
    elevation: 8,
    shadowOpacity: 0.12,
    shadowRadius: 16,
  },
  indicator: {
    position: 'absolute',
    top: 6,
    width: INDICATOR_W,
    height: 3,
    borderRadius: 2,
  },
  tab: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 3,
    paddingTop: 6,
  },
  fabSlot: {
    flex: 0,
    width: FAB_SPACE,
    alignItems: 'center',
    justifyContent: 'center',
    height: '100%',
  },
  fab: {
    width: 46,
    height: 46,
    borderRadius: 23,
    justifyContent: 'center',
    alignItems: 'center',
    elevation: 8,
  },
});

function getStyles(t: Theme) {
  return {
    bar: { backgroundColor: t.colors.surface, borderColor: 'rgba(0,0,0,0.06)' },
    indicator: { backgroundColor: t.colors.secondary }, // doré
    label: { fontFamily: 'Inter_500Medium', fontSize: 10, color: t.colors.textMuted },
    labelOn: { color: t.colors.primary },
    fab: { backgroundColor: t.colors.primary },
  } as const;
}
