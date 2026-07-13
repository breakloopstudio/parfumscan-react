// app/(tabs)/index.tsx — Pager horizontal Catalog ↔ Profil
// Swipe gesture-driven avec Reanimated + animations d'interpolation

import { useCallback, useEffect, useRef, useState } from 'react';
import { View, Text, Pressable, useWindowDimensions, StyleSheet } from 'react-native';
import { useRouter, useSegments } from 'expo-router';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  runOnJS,
} from 'react-native-reanimated';
import { Ionicons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';
import { theme } from '../../src/theme/theme';
import { useAppTheme } from '../../src/hooks/useAppTheme';
import CatalogPage from './catalog';
import ProfilePage from './profile';

const SPRING = { damping: 28, stiffness: 300, mass: 0.8 };
const THRESHOLD = 60;

export default function TabPager() {
  const { width: windowWidth } = useWindowDimensions();
  const router = useRouter();
  const segments = useSegments();
  const { isDark, colors } = useAppTheme();

  // Stocker width dans une shared value pour que les worklets y aient accès
  const pageWidth = useSharedValue(windowWidth || 400);
  const translateX = useSharedValue(0);
  const [activePage, setActivePage] = useState(0);
  const pageRef = useRef(0);

  // Mettre à jour la shared value quand la largeur change
  useEffect(() => {
    if (windowWidth > 0) {
      pageWidth.value = windowWidth;
      translateX.value = -activePage * windowWidth;
    }
  }, [windowWidth]);

  // Sync from deep links / segment changes
  const segPage = segments[segments.length - 1] === 'profile' ? 1 : 0;
  useEffect(() => {
    if (activePage !== segPage) {
      setActivePage(segPage);
      pageRef.current = segPage;
      translateX.value = withSpring(-segPage * pageWidth.value, SPRING);
    }
  }, [segPage]);

  const goTo = useCallback((p: number) => {
    setActivePage(p);
    pageRef.current = p;
    translateX.value = withSpring(-p * pageWidth.value, SPRING);
  }, []);

  const gesture = Gesture.Pan()
    .activeOffsetX([-10, 10])
    .failOffsetY([-10, 10])
    .onUpdate((e) => {
      const base = -pageRef.current * pageWidth.value;
      const dest = base + e.translationX;
      if (dest > 0) translateX.value = e.translationX * 0.3;
      else if (dest < -pageWidth.value) translateX.value = -pageWidth.value + (dest + pageWidth.value) * 0.3;
      else translateX.value = dest;
    })
    .onEnd((e) => {
      const swipedRight = e.translationX > 0;
      if (Math.abs(e.translationX) > THRESHOLD || Math.abs(e.velocityX) > 500) {
        let target = pageRef.current;
        if (swipedRight && pageRef.current === 1) target = 0;
        else if (!swipedRight && pageRef.current === 0) target = 1;
        if (target !== pageRef.current) {
          runOnJS(goTo)(target);
        } else {
          translateX.value = withSpring(-pageRef.current * pageWidth.value, SPRING);
        }
      } else {
        translateX.value = withSpring(-pageRef.current * pageWidth.value, SPRING);
      }
    });

  // Animations : translate + fade sans interpolate() pour éviter NaN
  const catStyle = useAnimatedStyle(() => {
    const x = translateX.value;
    const w = pageWidth.value;
    const progress = Math.max(-1, Math.min(1, -x / (w * 0.6)));
    return {
      transform: [
        { translateX: x },
        { scale: 0.88 + progress * 0.12 },
      ],
      opacity: 0.3 + progress * 0.7,
    };
  });

  const proStyle = useAnimatedStyle(() => {
    const x = translateX.value + pageWidth.value;
    const w = pageWidth.value;
    const progress = Math.max(-1, Math.min(1, -x / (w * 0.6)));
    return {
      transform: [
        { translateX: x },
        { scale: 0.88 + progress * 0.12 },
      ],
      opacity: 0.3 + progress * 0.7,
    };
  });

  const bg = isDark ? theme.colors.dark.tabBar : theme.colors.surface;
  const bd = isDark ? theme.colors.dark.tabBarBorder : theme.colors.border;
  const cur = activePage;

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
            <ProfilePage />
          </Animated.View>
        </View>
      </GestureDetector>
      {/* Tab bar */}
      <View style={[s.bar, { backgroundColor: bg, borderColor: bd }]}>
        <Pressable style={s.tab} onPress={() => goTo(0)} hitSlop={8}>
          <Ionicons name="book-outline" size={22} color={cur === 0 ? theme.colors.primary : theme.colors.textMuted} />
          <Text style={[s.tabLbl, cur === 0 && s.tabLblOn]}>Catalogue</Text>
        </Pressable>
        <Pressable style={s.fab} onPress={() => router.push('/(tabs)/scan')}>
          <Ionicons name="camera-outline" size={26} color="#FFF" />
        </Pressable>
        <Pressable style={s.tab} onPress={() => goTo(1)} hitSlop={8}>
          <Ionicons name="person-outline" size={22} color={cur === 1 ? theme.colors.primary : theme.colors.textMuted} />
          <Text style={[s.tabLbl, cur === 1 && s.tabLblOn]}>Profil</Text>
        </Pressable>
      </View>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  root: { flex: 1 },
  pager: { flex: 1, overflow: 'hidden' },
  page: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0 },
  bar: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-around', height: 64, borderTopWidth: StyleSheet.hairlineWidth, paddingBottom: 4 },
  tab: { alignItems: 'center', justifyContent: 'center', gap: 2, flex: 1 },
  tabLbl: { fontSize: 10, fontWeight: '500', color: theme.colors.textMuted },
  tabLblOn: { color: theme.colors.primary, fontWeight: '700' },
  fab: { width: 52, height: 52, borderRadius: 26, backgroundColor: theme.colors.primary, justifyContent: 'center', alignItems: 'center', marginBottom: 8, ...theme.shadow.scanCircle },
});