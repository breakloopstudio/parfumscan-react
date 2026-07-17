// app/(tabs)/index.tsx — Pager horizontal 4 pages (Catalogue, Favoris, Historique, Collection)
// Dock flottant 5 positions + FAB scan avec indicateur doré
// Barre de recherche persistante synchronisée avec le dock
// Utilise react-native-pager-view pour la gestion native des conflits de swipe
// (les ScrollView horizontaux dans les pages n'entrent plus en conflit avec le swipe du pager)

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { View, Text, Pressable, useWindowDimensions, StyleSheet, type ViewStyle } from 'react-native';
import { useRouter, useFocusEffect } from 'expo-router';
import Ionicons from '@react-native-vector-icons/ionicons/static';
import { BlurView } from 'expo-blur';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  useAnimatedReaction,
  withTiming,
  Easing,
} from 'react-native-reanimated';
import { SafeAreaView } from 'react-native-safe-area-context';
import PagerView from 'react-native-pager-view';
import { useTheme, type Theme } from '../../src/theme/ThemeContext';
import { hapticsLight } from '../../src/services/haptics';
import { consumePendingParfum, setPendingParfum } from '../../src/services/catalog-bridge';
import CatalogPage from '../../src/features/catalog/CatalogPage';
import FavoritesPage from './favorites';
import HistoryPage from './history';
import CollectionPage from './collection';
import DockBar from '../../src/features/navigation/DockBar';

const DOCK_DURATION = 200;
const PAGES = 4;
const SCROLL_HIDE_OFFSET = 60;

export default function TabPager() {
  const { theme, resolvedMode } = useTheme();
  const { width: windowWidth } = useWindowDimensions();
  const router = useRouter();
  const pagerRef = useRef<PagerView>(null);

  const pageWidth = useSharedValue(windowWidth || 400);
  const currentPage = useSharedValue(0);
  const [activePage, setActivePage] = useState(0);

  const scrollY = useSharedValue(0);
  const dockTranslateY = useSharedValue(0);
  const searchBarTranslateY = useSharedValue(0);
  const dockSheetVisible = useSharedValue(false);
  const [sheetOpen, setSheetOpen] = useState(false);

  useAnimatedReaction(
    () => scrollY.value,
    (current, prev) => {
      if (prev === null || dockSheetVisible.value) return;
      if (current > prev! && current > SCROLL_HIDE_OFFSET) {
        dockTranslateY.value = withTiming(120, { duration: DOCK_DURATION, easing: Easing.out(Easing.cubic) });
        searchBarTranslateY.value = withTiming(-70, { duration: DOCK_DURATION, easing: Easing.out(Easing.cubic) });
      } else if (current < prev!) {
        dockTranslateY.value = withTiming(0, { duration: DOCK_DURATION, easing: Easing.out(Easing.cubic) });
        searchBarTranslateY.value = withTiming(0, { duration: DOCK_DURATION, easing: Easing.out(Easing.cubic) });
      }
    },
  );

  useEffect(() => {
    if (windowWidth > 0) {
      pageWidth.value = windowWidth;
    }
  }, [windowWidth]);

  useFocusEffect(
    useCallback(() => {
      const p = consumePendingParfum();
      if (p) {
        setPendingParfum(p);
        const t = setTimeout(() => router.push(`/catalog/${p.id}`), 200);
        return () => clearTimeout(t);
      }
    }, [])
  );

  const handlePageScroll = useCallback((y: number) => {
    'worklet';
    scrollY.value = y;
  }, []);

  const handleSheetOpen = useCallback((visible: boolean) => {
    dockSheetVisible.value = visible;
    setSheetOpen(visible);
  }, []);

  const handlePageSelected = useCallback((e: { nativeEvent: { position: number } }) => {
    const p = e.nativeEvent.position;
    currentPage.value = p;
    setActivePage(p);
  }, []);

  const goTo = useCallback((p: number) => {
    pagerRef.current?.setPage(p);
    currentPage.value = p;
    setActivePage(p);
    scrollY.value = 0;
    dockTranslateY.value = withTiming(0, { duration: DOCK_DURATION, easing: Easing.out(Easing.cubic) });
    searchBarTranslateY.value = withTiming(0, { duration: DOCK_DURATION, easing: Easing.out(Easing.cubic) });
  }, []);

  const dockActiveIndex = activePage < 2 ? activePage : activePage + 1;

  const onTabPress = useCallback((dockIndex: number) => {
    hapticsLight();
    const pagerIndex = dockIndex < 2 ? dockIndex : dockIndex - 1;
    goTo(pagerIndex);
  }, [goTo]);

  const searchBarAnimatedStyle = useAnimatedStyle(() => {
    const t = searchBarTranslateY.value;
    const progress = Math.min(1, Math.abs(t) / 60);
    return {
      transform: [{ translateY: t }],
      opacity: 1 - progress,
    };
  });

  const dockFadeStyle = useAnimatedStyle(() => ({
    opacity: withTiming(dockSheetVisible.value ? 0 : 1, { duration: 150 }),
  }));

  const m = useMemo(() => getSearchStyles(theme), [theme]);

  if (windowWidth === 0) {
    return <View style={[s.root, { backgroundColor: theme.colors.background }]} />;
  }

  return (
    <SafeAreaView edges={['top']} style={[s.root, { backgroundColor: theme.colors.background }]}>
      <Animated.View style={[m.searchWrap, m.searchBarShadow, searchBarAnimatedStyle]}>
        <Pressable
          style={({ pressed }) => [m.searchBar, pressed && m.searchBarPressed]}
          onPress={() => router.push('/(tabs)/search')}
        >
          <BlurView
            intensity={20}
            tint={resolvedMode === 'dark' ? 'dark' : 'light'}
            style={StyleSheet.absoluteFill}
          />
          <View style={[StyleSheet.absoluteFill, m.searchBarOverlay]} />
          <Ionicons name="search-outline" size={18} color={theme.colors.textMuted} />
          <Text style={m.searchPlaceholder}>Rechercher un parfum...</Text>
        </Pressable>
      </Animated.View>

      <PagerView
        ref={pagerRef}
        style={s.pager}
        initialPage={0}
        scrollEnabled={!sheetOpen}
        offscreenPageLimit={PAGES - 1}
        onPageSelected={handlePageSelected}
      >
        <View key="0" style={s.page}>
          <CatalogPage onScroll={handlePageScroll} />
        </View>
        <View key="1" style={s.page}>
          <FavoritesPage onScroll={handlePageScroll} />
        </View>
        <View key="2" style={s.page}>
          <HistoryPage onScroll={handlePageScroll} />
        </View>
        <View key="3" style={s.page}>
          <CollectionPage onScroll={handlePageScroll} onSheetOpen={handleSheetOpen} />
        </View>
      </PagerView>

      <Animated.View style={dockFadeStyle} pointerEvents={sheetOpen ? 'none' : 'box-none'}>
        <DockBar
          activeIndex={dockActiveIndex}
          pageWidth={pageWidth}
          dockTranslateY={dockTranslateY}
          onTabPress={onTabPress}
        />
      </Animated.View>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  root: { flex: 1 },
  pager: { flex: 1 },
  page: { flex: 1 },
});

function getSearchStyles(t: Theme) {
  return {
    searchWrap: {
      paddingHorizontal: t.spacing.md,
      paddingTop: 12,
      paddingBottom: 6,
    },
    searchBar: {
      flexDirection: 'row',
      alignItems: 'center',
      borderRadius: 20,
      paddingHorizontal: 14,
      height: 44,
      gap: 10,
      overflow: 'hidden',
      borderWidth: StyleSheet.hairlineWidth,
      borderColor: t.colors.border,
    },
    searchBarPressed: {
      borderColor: t.colors.primary,
    } as ViewStyle,
    searchBarOverlay: {
      backgroundColor: t.colors.background + 'E0',
    },
    searchBarShadow: { ...t.shadow.card },
    searchPlaceholder: {
      fontFamily: 'Inter_400Regular',
      fontSize: 15,
      color: t.colors.textMuted,
    },
  } as const;
}
