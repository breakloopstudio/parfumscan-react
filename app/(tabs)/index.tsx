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
  interpolate,
  Extrapolation,
  runOnJS,
} from 'react-native-reanimated';
import { Ionicons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';
import { theme } from '../../src/theme/theme';
import { useAppTheme } from '../../src/hooks/useAppTheme';
import CatalogPage from './catalog';
import ProfilePage from './profile';

const SPRING = { damping: 28, stiffness: 300, mass: 0.8 };
const THRESHOLD = 80;

export default function TabPager() {
  const { width } = useWindowDimensions();
  const router = useRouter();
  const segments = useSegments();
  const { isDark, colors } = useAppTheme();
  const translateX = useSharedValue(0);
  const [activePage, setActivePage] = useState(0);
  const pageRef = useRef(0); // pour le thread UI (gesture)

  // Sync from deep links / segment changes
  const segPage = segments[segments.length - 1] === 'profile' ? 1 : 0;
  useEffect(() => {
    if (activePage !== segPage) {
      setActivePage(segPage);
      pageRef.current = segPage;
      translateX.value = withSpring(-segPage * width, SPRING);
    }
  }, [segPage, width]);

  const goTo = useCallback((p: number) => {
    setActivePage(p);
    pageRef.current = p;
    translateX.value = withSpring(-p * width, SPRING);
  }, [width]);

  const gesture = Gesture.Pan()
    .activeOffsetX([-15, 15])
    .failOffsetY([-8, 8])
    .onUpdate((e) => {
      const dest = -pageRef.current * width + e.translationX;
      if (dest > 0) translateX.value = e.translationX * 0.25;
      else if (dest < -width) translateX.value = -width + (e.translationX + pageRef.current * width + width) * 0.25;
      else translateX.value = dest;
    })
    .onEnd((e) => {
      const dir = e.translationX > 0 ? -1 : 1;
      if (Math.abs(e.translationX) > THRESHOLD || Math.abs(e.velocityX) > 400) {
        runOnJS(goTo)(Math.max(0, Math.min(1, pageRef.current + dir)));
      } else {
        translateX.value = withSpring(-pageRef.current * width, SPRING);
      }
    });

  // ── Interpolations par page ──
  // Chaque page a son opacity (0→1→0) et scale (0.88→1→0.88)
  const catStyle = useAnimatedStyle(() => {
    const o = translateX.value; // 0 = centrée
    return {
      opacity: interpolate(o, [-width, 0, width * 0.5], [0, 1, 0], Extrapolation.CLAMP),
      transform: [{ scale: interpolate(o, [-width, 0, width * 0.5], [0.88, 1, 0.88], Extrapolation.CLAMP) }],
    };
  });
  const proStyle = useAnimatedStyle(() => {
    const o = translateX.value + width; // 0 = centrée
    return {
      opacity: interpolate(o, [-width * 0.5, 0, width], [0, 1, 0], Extrapolation.CLAMP),
      transform: [{ scale: interpolate(o, [-width * 0.5, 0, width], [0.88, 1, 0.88], Extrapolation.CLAMP) }],
    };
  });

  const bg = isDark ? theme.colors.dark.tabBar : theme.colors.surface;
  const bd = isDark ? theme.colors.dark.tabBarBorder : theme.colors.border;
  // cur = state réactif → les icônes de la barre se mettent à jour
  const cur = activePage;

  return (
    <SafeAreaView style={[s.root, { backgroundColor: colors.background }]}>
      <GestureDetector gesture={gesture}>
        <View style={s.pager}>
          <Animated.View style={[s.page, catStyle]}>
            <CatalogPage />
          </Animated.View>
          <Animated.View style={[s.page, { left: width }, proStyle]}>
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
  page: { position: 'absolute', top: 0, bottom: 0, width: '100%' },
  bar: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-around', height: 64, borderTopWidth: StyleSheet.hairlineWidth, paddingBottom: 4 },
  tab: { alignItems: 'center', justifyContent: 'center', gap: 2, flex: 1 },
  tabLbl: { fontSize: 10, fontWeight: '500', color: theme.colors.textMuted },
  tabLblOn: { color: theme.colors.primary, fontWeight: '700' },
  fab: { width: 52, height: 52, borderRadius: 26, backgroundColor: theme.colors.primary, justifyContent: 'center', alignItems: 'center', marginBottom: 8, ...theme.shadow.scanCircle },
});