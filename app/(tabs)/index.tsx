// app/(tabs)/index.tsx — Pager horizontal 4 pages (Catalogue, Favoris, Historique, Collection)
// Dock flottant 5 positions + FAB scan avec indicateur dore
// Barre de recherche persistante synchronisee avec le dock
// Swipe gesture-driven avec Reanimated + animations d'interpolation

import { useCallback, useEffect, useMemo, useState } from 'react';
import { View, Text, Pressable, useWindowDimensions, StyleSheet, type ViewStyle } from 'react-native';
import { useRouter, useFocusEffect } from 'expo-router';
import Ionicons from '@react-native-vector-icons/ionicons/static';
import { BlurView } from 'expo-blur';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  useAnimatedReaction,
  withSpring,
  withTiming,
  Easing,
  runOnJS,
} from 'react-native-reanimated';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTheme, type Theme } from '../../src/theme/ThemeContext';
import { hapticsLight } from '../../src/services/haptics';
import { consumePendingParfum, setPendingParfum } from '../../src/services/catalog-bridge';
import CatalogPage from '../../src/features/catalog/CatalogPage';
import FavoritesPage from './favorites';
import HistoryPage from './history';
import CollectionPage from './collection';
import DockBar from '../../src/features/navigation/DockBar';

const SPRING = { damping: 28, stiffness: 300, mass: 0.8 };
const DOCK_DURATION = 200;
const MIN_THRESHOLD = 40;
const THRESHOLD_RATIO = 0.5;
const PAGES = 4;
const SCROLL_HIDE_OFFSET = 60;

export default function TabPager() {
  const { theme, resolvedMode } = useTheme();
  const { width: windowWidth } = useWindowDimensions();
  const router = useRouter();

  const pageWidth = useSharedValue(windowWidth || 400);
  const translateX = useSharedValue(0);
  const currentPage = useSharedValue(0);
  const [activePage, setActivePage] = useState(0);

  const scrollY = useSharedValue(0);
  const dockTranslateY = useSharedValue(0);
  const searchBarTranslateY = useSharedValue(0);

  useAnimatedReaction(
    () => scrollY.value,
    (current, prev) => {
      if (prev === null) return;
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
      translateX.value = -currentPage.value * windowWidth;
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

  const goTo = useCallback((p: number) => {
    'worklet';
    currentPage.value = p;
    runOnJS(setActivePage)(p);
    translateX.value = withSpring(-p * pageWidth.value, SPRING);
    scrollY.value = 0;
    dockTranslateY.value = withTiming(0, { duration: DOCK_DURATION, easing: Easing.out(Easing.cubic) });
    searchBarTranslateY.value = withTiming(0, { duration: DOCK_DURATION, easing: Easing.out(Easing.cubic) });
  }, []);

  const dockActiveIndex = activePage < 2 ? activePage : activePage + 1;

  const onTabPress = useCallback((dockIndex: number) => {
    hapticsLight();
    const pagerIndex = dockIndex < 2 ? dockIndex : dockIndex - 1;
    goTo(pagerIndex);
  }, []);

  const gesture = useMemo(() => Gesture.Pan()
    .activeOffsetX([-15, 15])
    .failOffsetY([-15, 15])
    .onUpdate((e) => {
      const base = -currentPage.value * pageWidth.value;
      const dest = base + e.translationX;
      const leftLimit = 0;
      const rightLimit = -(PAGES - 1) * pageWidth.value;
      const DAMPING = 0.3;
      if (dest > leftLimit) {
        translateX.value = leftLimit + (dest - leftLimit) * DAMPING;
      } else if (dest < rightLimit) {
        translateX.value = rightLimit + (dest - rightLimit) * DAMPING;
      } else {
        translateX.value = dest;
      }
    })
    .onEnd((e) => {
      const swipedRight = e.translationX > 0;
      const threshold = Math.max(pageWidth.value * THRESHOLD_RATIO, MIN_THRESHOLD);
      if (Math.abs(e.translationX) > threshold || Math.abs(e.velocityX) > 500) {
        let target = currentPage.value;
        if (swipedRight && currentPage.value > 0) target = currentPage.value - 1;
        else if (!swipedRight && currentPage.value < PAGES - 1) target = currentPage.value + 1;
        if (target !== currentPage.value) {
          goTo(target);
        } else {
          translateX.value = withSpring(-currentPage.value * pageWidth.value, SPRING);
        }
      } else {
        translateX.value = withSpring(-currentPage.value * pageWidth.value, SPRING);
      }
    }), []);

  const makePageStyle = (pageIdx: number) => useAnimatedStyle(() => {
    const x = translateX.value + pageIdx * pageWidth.value;
    const w = pageWidth.value;
    const progress = Math.max(-1, Math.min(1, 1 - Math.abs(x) / w));
    return {
      transform: [{ translateX: x }, { scale: 0.94 + progress * 0.06 }],
      opacity: Math.max(0, progress),
    };
  });

  const catStyle = makePageStyle(0);
  const favStyle = makePageStyle(1);
  const histStyle = makePageStyle(2);
  const colStyle = makePageStyle(3);

  const searchBarAnimatedStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: searchBarTranslateY.value }],
  }));

  const m = useMemo(() => getSearchStyles(theme), [theme]);

  if (windowWidth === 0) {
    return <View style={[s.root, { backgroundColor: theme.colors.background }]} />;
  }

  return (
    <SafeAreaView style={[s.root, { backgroundColor: theme.colors.background }]}>
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

      <GestureDetector gesture={gesture}>
        <View style={s.pager}>
          <Animated.View style={[s.page, catStyle]}>
            <CatalogPage onScroll={handlePageScroll} />
          </Animated.View>
          <Animated.View style={[s.page, favStyle]}>
            <FavoritesPage onScroll={handlePageScroll} />
          </Animated.View>
          <Animated.View style={[s.page, histStyle]}>
            <HistoryPage onScroll={handlePageScroll} />
          </Animated.View>
          <Animated.View style={[s.page, colStyle]}>
            <CollectionPage onScroll={handlePageScroll} />
          </Animated.View>
        </View>
      </GestureDetector>

      <DockBar
        activeIndex={dockActiveIndex}
        pageWidth={pageWidth}
        dockTranslateY={dockTranslateY}
        onTabPress={onTabPress}
      />
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  root: { flex: 1 },
  pager: { flex: 1, overflow: 'hidden' },
  page: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0 },
});

function getSearchStyles(t: Theme) {
  return {
    searchWrap: {
      paddingHorizontal: t.spacing.md,
      paddingTop: 4,
      paddingBottom: 8,
      zIndex: 10,
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
