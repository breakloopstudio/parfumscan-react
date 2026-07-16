// app/(tabs)/index.tsx — Pager horizontal Catalog ↔ Profil
// Swipe gesture-driven avec Reanimated + animations d'interpolation
// Tab bar moderne floating pill avec indicateur animé

import { useCallback, useEffect, useState } from 'react';
import { View, Text, Pressable, useWindowDimensions, StyleSheet } from 'react-native';
import { useRouter, useSegments, useFocusEffect } from 'expo-router';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  runOnJS,
} from 'react-native-reanimated';
import Ionicons from "@react-native-vector-icons/ionicons/static";
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { theme } from '../../src/theme/theme';
import { hapticsLight } from '../../src/services/haptics';
import { consumePendingParfum, setPendingParfum } from '../../src/services/catalog-bridge';
import CatalogPage from '../../src/features/catalog/CatalogPage';
import ProfilePage from '../../src/features/profile/ProfilePage';

const SPRING = { damping: 28, stiffness: 300, mass: 0.8 };
const MIN_THRESHOLD = 40;
const THRESHOLD_RATIO = 0.5;
const PAGES = 2;
const INDICATOR_W = 32;
const FAB_SPACE = 58; // 46 (fab width) + 12 (margins)

function getBarWidth(screenW: number) { return Math.min(screenW * 0.88, 380); }
function getIndicatorLeft(screenW: number) {
  const barW = getBarWidth(screenW);
  const tabArea = barW - FAB_SPACE;
  return (tabArea / 4) - (INDICATOR_W / 2);
}

export default function TabPager() {
  const { width: windowWidth } = useWindowDimensions();
  const router = useRouter();
  const segments = useSegments();
  const colors = theme.colors;
  const insets = useSafeAreaInsets();

  const pageWidth = useSharedValue(windowWidth || 400);
  const translateX = useSharedValue(0);
  const currentPage = useSharedValue(0); // ✅ SharedValue → accessible depuis le thread UI
  const [activePage, setActivePage] = useState(0);

  // Mettre à jour la shared value quand la largeur change
  useEffect(() => {
    if (windowWidth > 0) {
      pageWidth.value = windowWidth;
      translateX.value = -currentPage.value * windowWidth;
    }
  }, [windowWidth]);

  // Sync from deep links / segment changes
  const segPage = segments[segments.length - 1] === 'profile' ? 1 : 0;
  useEffect(() => {
    if (activePage !== segPage) {
      currentPage.value = segPage;
      setActivePage(segPage);
      translateX.value = withSpring(-segPage * pageWidth.value, SPRING);
    }
  }, [segPage]);

  // Navigation depuis le scan : ouvre la fiche détail après dismissTo
  useFocusEffect(
    useCallback(() => {
      const p = consumePendingParfum();
      if (p) {
        setPendingParfum(p); // re-stocke pour la fiche d�tail
        // Petit délai pour laisser l'animation de dismiss se terminer
        const t = setTimeout(() => router.push(`/catalog/${p.id}`), 200);
        return () => clearTimeout(t);
      }
    }, [])
  );

  const goTo = useCallback((p: number) => {
    'worklet';
    currentPage.value = p;
    runOnJS(setActivePage)(p);
    translateX.value = withSpring(-p * pageWidth.value, SPRING);
  }, []);

  const onTabPress = useCallback((p: number) => {
    hapticsLight();
    goTo(p);
  }, []);

  const gesture = Gesture.Pan()
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
    });

  // Animations : translate + fade + scale
  const catStyle = useAnimatedStyle(() => {
    const x = translateX.value;
    const w = pageWidth.value;
    const progress = Math.max(-1, Math.min(1, 1 + x / w));
    return {
      transform: [{ translateX: x }, { scale: 0.94 + progress * 0.06 }],
      opacity: Math.max(0, progress),
    };
  });

  const proStyle = useAnimatedStyle(() => {
    const x = translateX.value + pageWidth.value;
    const w = pageWidth.value;
    const progress = Math.max(-1, Math.min(1, 1 - x / w));
    return {
      transform: [{ translateX: x }, { scale: 0.94 + progress * 0.06 }],
      opacity: Math.max(0, progress),
    };
  });

  // ✅ Indicateur animé : calcul exact de la distance entre centres des tabs
  const indicatorStyle = useAnimatedStyle(() => {
    const barW = Math.min(pageWidth.value * 0.88, 380);
    const tabArea = barW - FAB_SPACE;
    const tabCenterDist = tabArea / 2 + FAB_SPACE; // distance exacte entre centres des 2 tabs
    const progress = Math.max(0, Math.min(1, -translateX.value / pageWidth.value));
    return { transform: [{ translateX: progress * tabCenterDist }] };
  });

  const barBg = theme.colors.surface;
  const barBorder = 'rgba(0,0,0,0.06)';

  // Ne rien afficher tant que la largeur n'est pas connue
  if (windowWidth === 0) {
    return <View style={[s.root, { backgroundColor: colors.background }]} />;
  }

  return (
    <SafeAreaView style={[s.root, { backgroundColor: colors.background }]}>
      <GestureDetector gesture={gesture}>
        <View style={s.pager}>
          <Animated.View style={[s.page, catStyle]}>
            <CatalogPage />
          </Animated.View>
          <Animated.View style={[s.page, proStyle]}>
            <ProfilePage onGoToCatalog={() => goTo(0)} />
          </Animated.View>
        </View>
      </GestureDetector>

      {/* ✅ Tab bar moderne floating pill */}
      <View style={[s.barWrapper, { paddingBottom: 8 + insets.bottom }]} pointerEvents="box-none">
        <View style={[s.bar, { backgroundColor: barBg, borderColor: barBorder }]}>
          {/* Indicateur animé — left calculé selon largeur réelle de la barre */}
          <Animated.View style={[s.indicator, { left: getIndicatorLeft(windowWidth) }, indicatorStyle]} />

          <Pressable style={s.tab} onPress={() => onTabPress(0)} hitSlop={4}>
            <Ionicons
              name={activePage === 0 ? 'book' : 'book-outline'}
              size={22}
              color={activePage === 0 ? theme.colors.primary : theme.colors.textMuted}
            />
            <Text style={[s.tabLbl, activePage === 0 && s.tabLblOn]}>Catalogue</Text>
          </Pressable>

          <Pressable
            style={s.fab}
            onPress={() => { hapticsLight(); router.push('/(tabs)/scan'); }}
          >
            <Ionicons name="camera" size={22} color="#FFF" />
          </Pressable>

          <Pressable style={s.tab} onPress={() => onTabPress(1)} hitSlop={4}>
            <Ionicons
              name={activePage === 1 ? 'person' : 'person-outline'}
              size={22}
              color={activePage === 1 ? theme.colors.primary : theme.colors.textMuted}
            />
            <Text style={[s.tabLbl, activePage === 1 && s.tabLblOn]}>Profil</Text>
          </Pressable>
        </View>
      </View>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  root: { flex: 1 },
  pager: { flex: 1, overflow: 'hidden' },
  page: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0 },
  barWrapper: {
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
    ...theme.shadow.card,
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
    backgroundColor: theme.colors.primary,
  },
  tab: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 3,
    paddingTop: 6,
  },
  tabLbl: {
    fontSize: 11,
    fontFamily: 'Inter_500Medium',
    color: theme.colors.textMuted,
  },
  tabLblOn: {
    color: theme.colors.primary,
    fontFamily: 'Inter_700Bold',
  },
  fab: {
    width: 46,
    height: 46,
    borderRadius: 23,
    backgroundColor: theme.colors.primary,
    justifyContent: 'center',
    alignItems: 'center',
    marginHorizontal: 6,
    ...theme.shadow.scanCircle,
    elevation: 8,
  },
});