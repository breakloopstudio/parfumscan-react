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
import { hapticsLight } from '../../src/services/haptics';
import { consumePendingParfum, setPendingParfum } from '../../src/services/catalog-bridge';
import { searchParfumsCached } from '../../src/services/firestore';
import { transcribeVoice } from '../../src/services/voice-search';
import { useVoiceSearch } from '../../src/hooks/useVoiceSearch';
import type { VoiceState } from '../../src/hooks/useVoiceSearch';
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

  const translateX = useSharedValue(0);
  const startX = useSharedValue(0);

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

  // Gesture Pan pour le pager
  const pagerPan = useMemo(() => Gesture.Pan()
    .enabled(!sheetOpen)
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
  [sheetOpen, pageWidth, activePage, setActivePageJS]);

  // ── Voice Search ──────────────────────────────────────────────

  const [voicePhase, setVoicePhase] = useState<VoicePhase>({ type: 'listening', transcript: '' });
  const [voiceTranscript, setVoiceTranscript] = useState('');
  const [voiceResults, setVoiceResults] = useState<Parfum[]>([]);
  const [voiceAudioPending, setVoiceAudioPending] = useState<string | null>(null);
  const [voiceSearching, setVoiceSearching] = useState(false);
  const voiceRequestIdRef = useRef(0);

  const handleVoiceResult = useCallback(async (text: string) => {
    if (!text.trim()) {
      setVoicePhase({ type: 'empty' });
      return;
    }
    setVoiceTranscript(text);
    setVoiceSearching(true);
    setVoicePhase({ type: 'searching' });

    const requestId = ++voiceRequestIdRef.current;

    try {
      const results = await searchParfumsCached(text.trim());
      if (requestId !== voiceRequestIdRef.current) return;
      if (results.length > 0) {
        setVoiceResults(results);
        setVoicePhase({ type: 'results', results });
      } else {
        setVoicePhase({ type: 'empty' });
      }
    } catch {
      if (requestId !== voiceRequestIdRef.current) return;
      setVoicePhase({ type: 'empty' });
    } finally {
      if (requestId === voiceRequestIdRef.current) {
        setVoiceSearching(false);
      }
    }
  }, []);

  // Fallback Whisper si searchParfumsCached ne trouve rien
  useEffect(() => {
    if (!voiceAudioPending) return;
    if (voiceSearching) return;
    if (voicePhase.type !== 'empty') {
      setVoiceAudioPending(null);
      return;
    }

    const audio = voiceAudioPending;
    setVoiceAudioPending(null);

    transcribeVoice(audio, 'audio/mp4').then(whisperText => {
      if (!whisperText.trim()) return;
      setVoiceTranscript(whisperText);
      searchParfumsCached(whisperText.trim()).then(results => {
        if (results.length > 0) {
          setVoiceResults(results);
          setVoicePhase({ type: 'results', results });
        } else {
          setVoicePhase({ type: 'empty' });
        }
      }).catch(() => {
        setVoicePhase({ type: 'empty' });
      });
    }).catch(() => {
      setVoicePhase({ type: 'empty' });
    });
  }, [voiceAudioPending, voiceSearching, voicePhase.type]);

  const handleVoiceError = useCallback((msg: string) => {
    setVoicePhase({ type: 'error', message: msg || 'Erreur de reconnaissance vocale.' });
  }, []);

  const voiceSearch = useVoiceSearch(handleVoiceResult, handleVoiceError);

  // Capture audio quand la voix s'arrête, pour le fallback Whisper
  const prevVoiceStateRef = useRef<VoiceState>('idle');
  useEffect(() => {
    const prev = prevVoiceStateRef.current;
    prevVoiceStateRef.current = voiceSearch.state;
    if (prev !== 'listening' || voiceSearch.state !== 'idle') return;
    voiceSearch.getAudioForFallback().then(audio => {
      if (audio) setVoiceAudioPending(audio);
    }).catch(() => {});
  }, [voiceSearch.state, voiceSearch]);

  const voiceIsActive = voiceSearch.state !== 'idle' || voicePhase.type === 'searching';

  // Synchroniser l'affichage avec le transcript du hook
  useEffect(() => {
    if (voiceSearch.state === 'listening') {
      setVoiceTranscript(voiceSearch.transcript);
      setVoicePhase({ type: 'listening', transcript: voiceSearch.transcript });
    }
  }, [voiceSearch.transcript, voiceSearch.state]);

  const handleVoiceLongPress = useCallback(() => {
    setVoiceResults([]);
    setVoiceAudioPending(null);
    setVoiceSearching(false);
    setVoiceTranscript('');
    hapticsLight();
    voiceSearch.start({ continuous: true });
  }, [voiceSearch]);

  const voicePollRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    return () => {
      if (voicePollRef.current) clearTimeout(voicePollRef.current);
    };
  }, []);

  const handlePressOut = useCallback(() => {
    if (voicePollRef.current) clearTimeout(voicePollRef.current);
    const attemptStop = (attempts: number) => {
      if (voiceSearch.state === 'listening') {
        voiceSearch.stop();
        return;
      }
      if (attempts < 6 && voiceSearch.state === 'idle') {
        voicePollRef.current = setTimeout(() => attemptStop(attempts + 1), 150);
      }
    };
    attemptStop(0);
  }, [voiceSearch]);

  const handleSearchPress = useCallback(() => {
    if (voiceIsActive) return;
    router.push('/(tabs)/search');
  }, [voiceIsActive, router]);

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
    setVoiceAudioPending(null);
  }, [voiceSearch]);

  const handleVoiceRetry = useCallback(() => {
    setVoiceResults([]);
    setVoiceAudioPending(null);
    setVoiceTranscript('');
    setVoicePhase({ type: 'listening', transcript: '' });
    voiceSearch.start({ continuous: true });
  }, [voiceSearch]);

  const m = useMemo(() => getSearchStyles(theme), [theme]);

  if (windowWidth === 0) {
    return <View style={[s.root, { backgroundColor: theme.colors.background }]} />;
  }

  return (
    <SafeAreaView edges={['top']} style={[s.root, { backgroundColor: theme.colors.background }]}>
      <View style={[m.searchWrap, m.searchBarShadow]}>
        <Pressable
          style={({ pressed }) => [
            m.searchBar,
            pressed && !voiceIsActive && m.searchBarPressed,
            voiceIsActive && m.searchBarVoiceActive,
          ]}
          onPress={handleSearchPress}
          onLongPress={handleVoiceLongPress}
          onPressOut={handlePressOut}
          delayLongPress={400}
        >
          <BlurView
            intensity={20}
            tint={resolvedMode === 'dark' ? 'dark' : 'light'}
            style={StyleSheet.absoluteFill}
          />
          <View style={[StyleSheet.absoluteFill, m.searchBarOverlay]} />
          {voiceIsActive ? (
            <>
              <Ionicons name="mic" size={18} color={theme.colors.primary} />
              <Text style={m.voiceTranscript} numberOfLines={1}>
                {voiceTranscript || 'Parle...'}
              </Text>
            </>
          ) : (
            <>
              <Ionicons name="search-outline" size={18} color={theme.colors.textMuted} />
              <Text style={m.searchPlaceholder}>Rechercher un parfum...</Text>
            </>
          )}
        </Pressable>
      </View>

      <VoiceOverlay
        visible={voiceIsActive || voicePhase.type === 'results' || voicePhase.type === 'empty' || voicePhase.type === 'error'}
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
              <CatalogPage onScroll={handlePageScroll} />
            </View>
            <View style={[s.page, { width: pageWidth.value }]}>
              <FavoritesPage onScroll={handlePageScroll} />
            </View>
            <View style={[s.page, { width: pageWidth.value }]}>
              <HistoryPage onScroll={handlePageScroll} />
            </View>
            <View style={[s.page, { width: pageWidth.value }]}>
              <CollectionPage onScroll={handlePageScroll} onSheetOpen={handleSheetOpen} />
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
  } as const;
}
