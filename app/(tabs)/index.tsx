// app/(tabs)/index.tsx — Pager horizontal 4 pages (Catalogue, Favoris, Historique, Parfumerie)
// Dock flottant 5 positions + FAB scan avec indicateur dore
// Barre de recherche persistante synchronisee avec le dock
// Pager custom GestureDetector + Reanimated — resolution native des conflits de swipe
// avec les ScrollView horizontaux internes (catalogue v2)

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { View, Text, Pressable, useWindowDimensions, StyleSheet, type ViewStyle } from 'react-native';
import { useRouter, useFocusEffect } from 'expo-router';
import Ionicons from '@react-native-vector-icons/ionicons/static';
import { BlurView } from 'expo-blur';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  useAnimatedReaction,
  withTiming,
  withSpring,
  runOnJS,
  Easing,
} from 'react-native-reanimated';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTheme, type Theme } from '../../src/theme/ThemeContext';
import { textOn } from '../../src/utils/contrast';
import { hapticsLight } from '../../src/services/haptics';
import { consumePendingParfum, setPendingParfum } from '../../src/services/catalog-bridge';
import { searchParfumsCached } from '../../src/services/firestore';
import { transcribeVoice } from '../../src/services/voice-search';
import { useVoiceSearch } from '../../src/hooks/useVoiceSearch';
import { useNetwork } from '../../src/hooks/useNetwork';
import { useVoicePreference } from '../../src/hooks/useVoicePreference';
import type { VoiceState, VoiceResult } from '../../src/hooks/useVoiceSearch';
import type { Parfum } from '../../src/models';
import CatalogPage from '../../src/features/catalog/CatalogPage';
import FavoritesPage from './favorites';
import HistoryPage from './history';
import CollectionPage from './collection';
import DockBar from '../../src/features/navigation/DockBar';
import VoiceOverlay from '../../src/features/search/VoiceOverlay';
import type { VoicePhase } from '../../src/features/search/VoiceOverlay';

const DOCK_DURATION = 200;
const PAGES = 4;
const SCROLL_HIDE_OFFSET = 60;
const SWIPE_THRESHOLD = 80;
const MIN_VELOCITY = 400;
const ACTIVATE_X = 30;
const FAIL_Y = 15;

export default function TabPager() {
  const { theme, resolvedMode } = useTheme();
  const { width: windowWidth } = useWindowDimensions();
  const router = useRouter();

  const pageWidth = useSharedValue(windowWidth || 400);
  const currentPage = useSharedValue(0);
  const [activePage, setActivePage] = useState(0);
  const pageAnimating = useSharedValue(false);

  const scrollY = useSharedValue(0);
  const dockTranslateY = useSharedValue(0);
  const dockSheetVisible = useSharedValue(false);
  const [sheetOpen, setSheetOpen] = useState(false);

  const { isOnline } = useNetwork();

  const translateX = useSharedValue(0);
  const startX = useSharedValue(0);

  // Désactive le pager pendant qu'une rangée horizontale interne est draguée
  // (BrandCapsules, CatalogRow, FamilyAmbianceCards, FilterBar pills)
  const [rowScrollActive, setRowScrollActive] = useState(false);

  const handleRowScrollActive = useCallback((active: boolean) => {
    setRowScrollActive(active);
  }, []);

  useAnimatedReaction(
    () => scrollY.value,
    (current, prev) => {
      if (prev === null || dockSheetVisible.value) return;
      if (current > prev! && current > SCROLL_HIDE_OFFSET) {
        dockTranslateY.value = withTiming(120, { duration: DOCK_DURATION, easing: Easing.out(Easing.cubic) });
      } else if (current < prev!) {
        dockTranslateY.value = withTiming(0, { duration: DOCK_DURATION, easing: Easing.out(Easing.cubic) });
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

  const setActivePageJS = useCallback((p: number) => {
    setActivePage(p);
  }, []);

  // Naviguer vers une page (depuis le DockBar)
  const goTo = useCallback((p: number) => {
    setRowScrollActive(false); // garde-fou : reset si une rangée démonte pendant un drag
    pageAnimating.value = true;
    currentPage.value = p;
    setActivePage(p);
    scrollY.value = 0;
    translateX.value = withTiming(-p * pageWidth.value, { duration: 300, easing: Easing.out(Easing.cubic) }, () => {
      pageAnimating.value = false;
    });
    dockTranslateY.value = withTiming(0, { duration: DOCK_DURATION, easing: Easing.out(Easing.cubic) });
  }, [pageWidth]);

  const dockActiveIndex = activePage < 2 ? activePage : activePage + 1;

  const onTabPress = useCallback((dockIndex: number) => {
    hapticsLight();
    const pagerIndex = dockIndex < 2 ? dockIndex : dockIndex - 1;
    goTo(pagerIndex);
  }, [goTo]);

  const dockFadeStyle = useAnimatedStyle(() => ({
    opacity: withTiming(dockSheetVisible.value ? 0 : 1, { duration: 150 }),
  }));

  const pagesStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: translateX.value }],
    width: pageWidth.value * PAGES,
    height: '100%',
  }));

  // ── Voice Search ──────────────────────────────────────────────

  const [voicePhase, setVoicePhase] = useState<VoicePhase>({ type: 'listening', transcript: '' });
  const [voiceTranscript, setVoiceTranscript] = useState('');
  const [voiceResults, setVoiceResults] = useState<Parfum[]>([]);
  const voiceRequestIdRef = useRef(0);

  const handleVoiceResult = useCallback(async (result: VoiceResult) => {
    const searchQuery = result.text?.trim() || '';
    setVoicePhase({ type: 'searching', query: searchQuery });
    const requestId = ++voiceRequestIdRef.current;

    try {
      if (result.text) {
        setVoiceTranscript(result.text);
        const resolvedQuery = result.text.trim();
        const results = await searchParfumsCached(resolvedQuery);
        if (requestId !== voiceRequestIdRef.current) return;
        if (results.length > 0) {
          setVoiceResults(results);
          setVoicePhase({ type: 'results', results, query: resolvedQuery });
          return;
        }
      }

      if (result.audioBase64) {
        const whisperText = await transcribeVoice(result.audioBase64, 'audio/wav');
        if (requestId !== voiceRequestIdRef.current) return;
        const resolvedQuery = whisperText.trim();
        if (resolvedQuery) {
          setVoiceTranscript(resolvedQuery);
          const results = await searchParfumsCached(resolvedQuery);
          if (requestId !== voiceRequestIdRef.current) return;
          if (results.length > 0) {
            setVoiceResults(results);
            setVoicePhase({ type: 'results', results, query: resolvedQuery });
            return;
          }
        }
      }

      if (requestId !== voiceRequestIdRef.current) return;
      setVoicePhase({ type: 'empty' });
    } catch {
      if (requestId !== voiceRequestIdRef.current) return;
      setVoicePhase({ type: 'error', message: 'La recherche a échoué. Vérifiez votre connexion.' });
    }
  }, []);

  const handleVoiceError = useCallback((msg: string) => {
    setVoicePhase({ type: 'error', message: msg || 'Erreur de reconnaissance vocale.' });
  }, []);

  const voiceSearch = useVoiceSearch(handleVoiceResult, handleVoiceError);
  const { voiceEnabled } = useVoicePreference();

  const overlayVisible = voicePhase.type !== 'listening';
  const showVoiceTranscript = voiceSearch.state === 'listening' || voiceSearch.state === 'processing';
  const showMicFab = voiceEnabled && !overlayVisible;

  useEffect(() => {
    if (voicePhase.type !== 'searching') return;
    const t = setTimeout(() => {
      setVoicePhase({ type: 'error', message: 'La recherche prend trop de temps. Veuillez réessayer.' });
    }, 20_000);
    return () => clearTimeout(t);
  }, [voicePhase.type]);

  useEffect(() => {
    if (voiceSearch.state === 'listening') {
      setVoiceTranscript(voiceSearch.transcript);
      setVoicePhase({ type: 'listening', transcript: voiceSearch.transcript });
    }
  }, [voiceSearch.transcript, voiceSearch.state]);

  const handleFabPressIn = useCallback(() => {
    if (!isOnline) {
      handleVoiceError('Recherche vocale indisponible hors-ligne.');
      return;
    }
    setVoiceResults([]);
    setVoiceTranscript('');
    setVoicePhase({ type: 'listening', transcript: '' });
    hapticsLight();
    voiceSearch.start({ continuous: true });
  }, [isOnline, voiceSearch, handleVoiceError]);

  const handleFabPressOut = useCallback(() => {
    voiceSearch.stop();
  }, [voiceSearch]);

  const handleSearchMicToggle = useCallback(() => {
    if (!isOnline) {
      handleVoiceError('Recherche vocale indisponible hors-ligne.');
      return;
    }
    if (voiceSearch.state === 'listening' || voiceSearch.state === 'processing') {
      voiceSearch.stop();
    } else {
      setVoiceResults([]);
      setVoiceTranscript('');
      setVoicePhase({ type: 'listening', transcript: '' });
      voiceSearch.start({ continuous: true });
    }
  }, [isOnline, voiceSearch, handleVoiceError]);

  const handleSearchPress = useCallback(() => {
    if (overlayVisible) return;
    router.push('/(tabs)/search');
  }, [overlayVisible, router]);

  const handleVoiceResultPress = useCallback((id: string) => {
    voiceSearch.cancel();
    setVoicePhase({ type: 'listening', transcript: '' });
    setVoiceTranscript('');
    setVoiceResults([]);
    router.push(`/catalog/${id}`);
  }, [voiceSearch, router]);

  const handleVoiceViewAll = useCallback(() => {
    voiceSearch.cancel();
    setVoicePhase({ type: 'listening', transcript: '' });
    setVoiceTranscript('');
    setVoiceResults([]);
    router.push(`/(tabs)/search?q=${encodeURIComponent(voiceTranscript)}`);
  }, [voiceSearch, voiceTranscript, router]);

  const handleVoiceCancel = useCallback(() => {
    voiceSearch.cancel();
    setVoicePhase({ type: 'listening', transcript: '' });
    setVoiceTranscript('');
    setVoiceResults([]);
  }, [voiceSearch]);

  const handleVoiceRetry = useCallback(() => {
    setVoiceResults([]);
    setVoiceTranscript('');
    setVoicePhase({ type: 'listening', transcript: '' });
    voiceSearch.start({ continuous: true });
  }, [voiceSearch]);

  // Gesture Pan pour le pager — désactivé pendant : sheets, rangées horizontales internes, overlay vocal
  const pagerPan = useMemo(() => Gesture.Pan()
    .enabled(!sheetOpen && !rowScrollActive && !overlayVisible)
    .activeOffsetX([-ACTIVATE_X, ACTIVATE_X])
    .failOffsetY([-FAIL_Y, FAIL_Y])
    .onStart(() => {
      startX.value = translateX.value;
    })
    .onUpdate((e) => {
      const target = startX.value + e.translationX;
      const minX = -(PAGES - 1) * pageWidth.value;
      translateX.value = Math.max(minX, Math.min(0, target));
    })
    .onEnd((e) => {
      const velocity = e.velocityX;
      const currentOffset = -translateX.value / pageWidth.value;
      let targetPage = Math.round(currentOffset);

      if (Math.abs(velocity) > MIN_VELOCITY) {
        targetPage = velocity > 0 ? Math.floor(currentOffset) : Math.ceil(currentOffset);
      } else {
        const diff = currentOffset - activePage;
        targetPage = activePage + (diff > 0.3 ? 1 : diff < -0.3 ? -1 : 0);
      }

      targetPage = Math.max(0, Math.min(PAGES - 1, targetPage));

      currentPage.value = targetPage;
      runOnJS(setActivePageJS)(targetPage);

      translateX.value = withSpring(-targetPage * pageWidth.value, {
        damping: 25,
        stiffness: 250,
        mass: 0.8,
        velocity: velocity,
      });
    }),
  [sheetOpen, rowScrollActive, overlayVisible, pageWidth, activePage, setActivePageJS]);

  const m = useMemo(() => getSearchStyles(theme), [theme]);

  if (windowWidth === 0) {
    return <View style={[s.root, { backgroundColor: theme.colors.background }]} />;
  }

  return (
    <SafeAreaView edges={['top']} style={[s.root, { backgroundColor: theme.colors.background }]}>
      <View style={[m.searchWrap, m.searchBarShadow]}>
        <View style={[m.searchBar, showVoiceTranscript && m.searchBarVoiceActive]}>
          <BlurView
            intensity={20}
            tint={resolvedMode === 'dark' ? 'dark' : 'light'}
            style={StyleSheet.absoluteFill}
          />
          <View style={[StyleSheet.absoluteFill, m.searchBarOverlay]} />
          <Pressable
            onPress={handleSearchPress}
            style={m.searchBarPressable}
          >
            <Ionicons name="search-outline" size={18} color={theme.colors.textMuted} />
            {showVoiceTranscript ? (
              <Text style={m.voiceTranscript} numberOfLines={1}>
                {voiceTranscript || 'Parle...'}
              </Text>
            ) : (
              <Text style={m.searchPlaceholder} numberOfLines={1}>Rechercher un parfum...</Text>
            )}
          </Pressable>
            <Pressable
              onPress={handleSearchMicToggle}
              style={m.micBtn}
              hitSlop={4}
            >
            <Ionicons
              name={showVoiceTranscript ? 'mic' : 'mic-outline'}
              size={20}
              color={showVoiceTranscript ? theme.colors.primary : theme.colors.textMuted}
            />
          </Pressable>
        </View>
      </View>

      <VoiceOverlay
        visible={overlayVisible}
        phase={voicePhase}
        onResultPress={handleVoiceResultPress}
        onViewAll={handleVoiceViewAll}
        onCancel={handleVoiceCancel}
        onRetry={handleVoiceRetry}
      />

      <GestureDetector gesture={pagerPan}>
        <Animated.View style={s.pagerClip}>
          <Animated.View style={[s.pages, pagesStyle]}>
            <View style={[s.page, { width: pageWidth.value }]}>
              <CatalogPage onScroll={handlePageScroll} onHorizontalScrollActive={handleRowScrollActive} />
            </View>
            <View style={[s.page, { width: pageWidth.value }]}>
              <FavoritesPage onScroll={handlePageScroll} />
            </View>
            <View style={[s.page, { width: pageWidth.value }]}>
              <HistoryPage onScroll={handlePageScroll} />
            </View>
            <View style={[s.page, { width: pageWidth.value }]}>
              <CollectionPage onScroll={handlePageScroll} onSheetOpen={handleSheetOpen} onHorizontalScrollActive={handleRowScrollActive} />
            </View>
          </Animated.View>
        </Animated.View>
      </GestureDetector>

      <Animated.View style={dockFadeStyle} pointerEvents={sheetOpen ? 'none' : 'box-none'}>
        <DockBar
          activeIndex={dockActiveIndex}
          pageWidth={pageWidth}
          dockTranslateY={dockTranslateY}
          onTabPress={onTabPress}
        />
      </Animated.View>

      {showMicFab && (
        <Animated.View style={[dockFadeStyle, m.micFabWrap]}>
          <Pressable
            onPressIn={handleFabPressIn}
            onPressOut={handleFabPressOut}
            style={({ pressed }) => [
              m.micFab,
              pressed && m.micFabPressed,
              showVoiceTranscript && m.micFabActive,
            ]}
          >
            <Ionicons
              name={showVoiceTranscript ? 'mic' : 'mic-outline'}
              size={22}
              color={showVoiceTranscript ? textOn(theme.colors.primary) : theme.colors.primary}
            />
          </Pressable>
        </Animated.View>
      )}
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  root: { flex: 1 },
  pagerClip: { flex: 1, overflow: 'hidden' },
  pages: { flexDirection: 'row' },
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
      paddingLeft: 14,
      paddingRight: 4,
      height: 44,
      overflow: 'hidden',
      borderWidth: StyleSheet.hairlineWidth,
      borderColor: t.colors.border,
    },
    searchBarPressed: {
      borderColor: t.colors.primary,
    } as ViewStyle,
    searchBarPressable: {
      flex: 1,
      flexDirection: 'row',
      alignItems: 'center',
      gap: 10,
      height: 44,
    },
    searchBarOverlay: {
      backgroundColor: t.colors.background + 'E0',
    },
    searchBarShadow: { ...t.shadow.card },
    searchPlaceholder: {
      fontFamily: 'Inter_400Regular',
      fontSize: 15,
      color: t.colors.textMuted,
      flex: 1,
    },
    searchBarVoiceActive: {
      borderColor: t.colors.primary,
      borderWidth: 1.5,
    } as ViewStyle,
    voiceTranscript: {
      fontFamily: 'Inter_400Regular',
      fontSize: 15,
      color: t.colors.text,
      flex: 1,
    },
    micBtn: {
      width: 44,
      height: 44,
      alignItems: 'center',
      justifyContent: 'center',
    },
    micFabWrap: {
      position: 'absolute' as const,
      bottom: 100,
      right: t.spacing.md,
      zIndex: 50,
    },
    micFab: {
      width: 48,
      height: 48,
      borderRadius: t.radius.full,
      backgroundColor: t.colors.surface,
      alignItems: 'center',
      justifyContent: 'center',
      borderWidth: 1,
      borderColor: t.colors.border,
      ...t.shadow.button,
    },
    micFabPressed: {
      opacity: 0.85,
    } as ViewStyle,
    micFabActive: {
      backgroundColor: t.colors.primary,
      borderColor: t.colors.primary,
    } as ViewStyle,
  } as const;
}
