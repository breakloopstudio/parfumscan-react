// app/catalog/[id].tsx — Fiche détail parfum (refonte Luxe malin)

import { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import { View, Text, ScrollView, Pressable, ActivityIndicator, Linking, StyleSheet, useWindowDimensions, Platform } from 'react-native';
import type { NativeSyntheticEvent, NativeScrollEvent, LayoutChangeEvent } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import Animated, { useSharedValue, useAnimatedStyle, withSpring, runOnJS } from 'react-native-reanimated';
import Ionicons from '@react-native-vector-icons/ionicons/static';
import { useAuthContext } from '../../src/contexts/AuthContext';
import { getParfumById, updateParfum, getSimilarParfums } from '../../src/services/firestore';
import { isParfumFavori, addFavori, removeFavori } from '../../src/services/user-data';
import { consumePendingParfum, setPendingParfum } from '../../src/services/catalog-bridge';
import { isInWardrobe, addToWardrobe } from '../../src/services/wardrobe';
import { useTheme, type Theme } from '../../src/theme/ThemeContext';
import type { Parfum } from '../../src/models';
import { translateNote } from '../../src/utils/translate-note';
import OlfactoryPyramid from '../../src/features/catalog/OlfactoryPyramid';
import PriceDisplay from '../../src/components/PriceDisplay';
import Button from '../../src/components/Button';
import AlertPriceToggle from '../../src/components/AlertPriceToggle';
import WardrobeAddSheet from '../../src/features/wardrobe/WardrobeAddSheet';
import NoteDetailPopup from '../../src/components/NoteDetailPopup';
import ImageViewerPopup from '../../src/components/ImageViewerPopup';
import ParfumCard from '../../src/components/ParfumCard';
import HeroPriceOverlay from '../../src/features/catalog/HeroPriceOverlay';
import CollapsingHeader from '../../src/features/catalog/CollapsingHeader';
import StickyBottomBar from '../../src/features/catalog/StickyBottomBar';

// ─── Mappings FR ─────────────────────────────────────────────

const SEASON_META: Record<string, { label: string; color: string; bg: string; emoji: string }> = {
  spring: { label: 'Printemps', color: '#059669', bg: '#ECFDF5', emoji: '🌸' },
  summer: { label: 'Été', color: '#D97706', bg: '#FFFBEB', emoji: '☀️' },
  fall:   { label: 'Automne', color: '#DC2626', bg: '#FEF2F2', emoji: '🍂' },
  autumn: { label: 'Automne', color: '#DC2626', bg: '#FEF2F2', emoji: '🍂' },
  winter: { label: 'Hiver', color: '#2563EB', bg: '#EFF6FF', emoji: '❄️' },
};

const OCCASION_META: Record<string, { label: string; emoji: string }> = {
  casual:    { label: 'Jour', emoji: '☀️' },
  day:       { label: 'Jour', emoji: '☀️' },
  evening:   { label: 'Soirée', emoji: '🌙' },
  night:     { label: 'Soirée', emoji: '🌙' },
  party:     { label: 'Fête', emoji: '🎉' },
  club:      { label: 'Fête', emoji: '🎉' },
  work:      { label: 'Bureau', emoji: '💼' },
  office:    { label: 'Bureau', emoji: '💼' },
  date:      { label: 'Rendez-vous', emoji: '💑' },
  romantic:  { label: 'Rendez-vous', emoji: '💑' },
  formal:    { label: 'Formel', emoji: '👔' },
  sport:     { label: 'Sport', emoji: '🏃' },
  professional: { label: 'Bureau', emoji: '💼' },
  'night out':  { label: 'Soirée', emoji: '🌙' },
  night_out:  { label: 'Soirée', emoji: '🌙' },
  business:  { label: 'Bureau', emoji: '💼' },
  leisure:   { label: 'Loisir', emoji: '🎯' },
  daily:     { label: 'Jour', emoji: '☀️' },
};

function longevityMeta(v: string): { label: string; pct: number } {
  const key = v.toLowerCase().trim();
  if (key.includes('eternal') || key.includes('very long')) return { label: 'Très longue', pct: 90 };
  if (key.includes('long')) return { label: 'Longue', pct: 70 };
  if (key.includes('moderate') || key.includes('modéré')) return { label: 'Modérée', pct: 45 };
  if (key.includes('weak') || key.includes('court')) return { label: 'Courte', pct: 25 };
  return { label: v, pct: 40 };
}

function sillageMeta(v: string): { label: string; pct: number } {
  const key = v.toLowerCase().trim();
  if (key.includes('enormous') || key.includes('strong') || key.includes('fort') || key.includes('lourd')) return { label: 'Puissant', pct: 90 };
  if (key.includes('heavy')) return { label: 'Lourd', pct: 80 };
  if (key.includes('moderate') || key.includes('modéré')) return { label: 'Modéré', pct: 50 };
  if (key.includes('intimate') || key.includes('soft') || key.includes('léger') || key.includes('faible')) return { label: 'Intime', pct: 25 };
  return { label: v, pct: 40 };
}


function accordScore(pctStr: string): number {
  const n = parseInt(pctStr.replace('%', ''), 10);
  if (!isNaN(n)) return n;
  const labels: Record<string, number> = { dominant: 95, prominent: 75, moderate: 50, soft: 30, subtle: 15, faint: 5 };
  return labels[pctStr.toLowerCase().trim()] ?? 40;
}



function popLabel(score: number): { label: string; color: string } {
  if (score >= 80) return { label: 'Très populaire', color: '#F59E0B' };
  if (score >= 60) return { label: 'Populaire', color: '#D97706' };
  if (score >= 40) return { label: 'Connu', color: '#B45309' };
  if (score >= 20) return { label: 'De niche', color: '#92400E' };
  return { label: 'Confidentiel', color: '#78350F' };
}

function scoreLabel(score: number, maxScore: number, highLabel: string, midLabel: string): { label: string; pct: number } {
  const ratio = maxScore > 0 ? score / maxScore : 0;
  const pct = Math.round(Math.max(0, Math.min(100, ratio * 100)));
  if (ratio >= 0.8) return { label: highLabel, pct };
  if (ratio >= 0.6) return { label: midLabel, pct };
  if (ratio >= 0.4) return { label: 'Modéré', pct };
  if (ratio >= 0.2) return { label: 'Peu adapté', pct };
  return { label: 'Déconseillé', pct };
}

function typeParfumLabel(v: string): string {
  const k = v.toLowerCase().replace(/[^a-z]/g, '');
  if (k.includes('extrait') || k.includes('pure')) return 'Extrait';
  if (k.includes('edp') || k.includes('eaudeparfum')) return 'Eau de Parfum';
  if (k.includes('edt') || k.includes('eaudetoilette')) return 'Eau de Toilette';
  if (k.includes('edc') || k.includes('eaudecologne')) return 'Eau de Cologne';
  return v;
}


function StatBar({ label, score, maxScore, icon, barColor, barBg, s, t }: { label: string; score: number; maxScore?: number; icon: string; barColor: string; barBg: string; s: ReturnType<typeof getStyles>; t: Theme }) {
  const m = maxScore ?? 100;
  const pct = Math.round(Math.max(0, Math.min(100, (score / m) * 100)));
  return (
    <View style={s.statBar}>
      <Text style={s.statIcon}>{icon}</Text>
      <Text style={s.statLabel}>{label}</Text>
      <View style={[s.statTrack, { backgroundColor: barBg }]}>
        <View style={[s.statFill, { width: `${pct}%`, backgroundColor: barColor }]} />
      </View>
      <Text style={[s.statPct, { color: barColor }]}>{pct}%</Text>
    </View>
  );
}

function AccordBar({ name, pct, index, total, s, t }: { name: string; pct: number; index: number; total: number; s: ReturnType<typeof getStyles>; t: Theme }) {
  const colors = [t.colors.primary, t.colors.primaryTint, t.colors.violetInk, t.colors.primary, t.colors.primarySoft];
  const color = colors[index % colors.length];
  return (
    <View style={s.statBar}>
      <View style={[s.accordDot, { backgroundColor: color }]} />
      <Text style={s.statLabel}>{name}</Text>
      <View style={[s.statTrack, { backgroundColor: t.colors.violetSoft }]}>
        <View style={[s.statFill, { width: `${pct}%`, backgroundColor: color }]} />
      </View>
      <Text style={[s.statPct, { color: t.colors.violetInk }]}>{pct}%</Text>
    </View>
  );
}

function SectionTitle({ icon, title, s }: { icon: string; title: string; s: ReturnType<typeof getStyles> }) {
  return (
    <View style={s.sectionTitle}>
      <Text style={s.sectionIcon}>{icon}</Text>
      <Text style={s.sectionTitleText}>{title}</Text>
    </View>
  );
}

export default function CatalogDetailPage() {
  const rawId = useLocalSearchParams<{ id: string }>().id;
  // Normalisation : useLocalSearchParams peut retourner string | string[]
  const id: string | undefined = Array.isArray(rawId) ? rawId[0] : rawId;
  const router = useRouter();
  const { width: windowWidth } = useWindowDimensions();
  const { theme: t } = useTheme();
  const s = useMemo(() => getStyles(t), [t]);

  const translateX = useSharedValue(0);

  const SWIPE_SPRING = { damping: 28, stiffness: 300, mass: 0.8 };
  const MIN_SWIPE_THRESHOLD = 50;
  const SWIPE_THRESHOLD_RATIO = 0.5;

  const edgePanGesture = Gesture.Pan()
    .activeOffsetX([20, Infinity])
    .failOffsetY([-15, 15])
    .onUpdate((e) => {
      translateX.value = Math.max(0, e.translationX * 0.85);
    })
    .onEnd((e) => {
      const threshold = Math.max((windowWidth || 400) * SWIPE_THRESHOLD_RATIO, MIN_SWIPE_THRESHOLD);
      if (e.translationX > threshold || e.velocityX > 500) {
        runOnJS(router.back)();
      } else {
        translateX.value = withSpring(0, SWIPE_SPRING);
      }
    });

  const swipeStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: translateX.value }],
  }));

  const { user, isAuthenticated } = useAuthContext();
  const [parfum, setParfum] = useState<Parfum | null>(null);
  const [loading, setLoading] = useState(true);
  const [isFav, setIsFav] = useState(false);
  const [favoriId, setFavoriId] = useState<string | null>(null);
  const [wardrobeItem, setWardrobeItem] = useState<import('../../src/models/wardrobe.interface').WardrobeItem | null>(null);
  const [showWardrobeSheet, setShowWardrobeSheet] = useState(false);
  const [showImageViewer, setShowImageViewer] = useState(false);
  const [selectedNote, setSelectedNote] = useState<string | null>(null);
  const [pending] = useState<Parfum | null>(() => consumePendingParfum());
  const [imgFailed, setImgFailed] = useState(false);
  const [similars, setSimilars] = useState<Parfum[]>([]);
  const [similarsLoading, setSimilarsLoading] = useState(false);
  const loadingRef = useRef(false);
  const scrollY = useSharedValue(0);
  const priceSectionY = useSharedValue(9999);
  const priceSectionRef = useRef<View>(null);
  const insets = useSafeAreaInsets();

  // Chargement auto-suffisant : bridge (preview) -> Firestore
  useEffect(() => {
    if (!id) return;
    if (loadingRef.current) return;
    loadingRef.current = true;
    setLoading(true);

    const load = async () => {
      try {
        // Step 1: Bridge data — affichage instantané si disponible
        if (pending && pending.id === id) {
          setParfum(pending);
        }

        // Step 2: Toujours tenter Firestore (données plus complètes)
        try {
          const cached = await getParfumById(id);
          if (cached) {
            setParfum(cached);
            return;
          }
        } catch (e) {
          console.warn('[detail] Firestore fetch failed:', (e as Error)?.message);
        }

        // Step 3: Si on a déjà le bridge, on s'arrête là
        if (pending && pending.id === id) {
          return;
        }

        // Pas de fallback API — le catalogue est 100% Firestore
        if (!parfum) setParfum(null);
      } catch (fatalErr) {
        console.error('[detail] FATAL load error:', fatalErr);
        if (!parfum) setParfum(null);
      } finally {
        setLoading(false);
      }
    };

    load();

    return () => { loadingRef.current = false; };
  }, [id]);
  // Statut favori + wardrobe
  useEffect(() => {
    if (user?.uid && id) {
      isParfumFavori(user.uid, id).then(r => { setIsFav(r.isFavori); setFavoriId(r.favoriId); }).catch(() => {});
      isInWardrobe(user.uid, id).then(item => { setWardrobeItem(item); }).catch(() => {});
    }
  }, [user?.uid, id]);


  // Parfums similaires — recherche Firestore par accords partagés
  const simMainAccords = parfum?.mainAccords;
  const simSimilarIds = parfum?.similarIds;
  const simCachedAt = parfum?.similarIdsCachedAt;

  useEffect(() => {
    if (!simMainAccords || simMainAccords.length === 0 || !parfum?.id) return;

    const loadSimilars = async () => {
      setSimilarsLoading(true);

      // Step 1: check Firestore cache via similarIds (TTL 24h)
      if (simSimilarIds && simSimilarIds.length > 0 && simCachedAt) {
        const age = Date.now() - simCachedAt.getTime();
        if (age < 86400000) {
          const cached = (await Promise.all(
            simSimilarIds.map((id: string) => getParfumById(id).catch(() => undefined))
          )).filter(Boolean) as Parfum[];

          if (cached.length >= 3) {
            setSimilars(cached);
            setSimilarsLoading(false);
            return;
          }
        }
      }

      // Step 2: recherche Firestore par accords partagés
      try {
        const results = await getSimilarParfums(simMainAccords, parfum.id!, 6);

        if (results.length > 0) {
          setSimilars(results);

          // Persist similarIds + timestamp pour les prochains visiteurs
          const ids = results.map((p: Parfum) => p.id);
          updateParfum(parfum.id!, { similarIds: ids, similarIdsCachedAt: new Date() }).catch(() => {});
        }
      } catch {
        // silent fail
      } finally {
        setSimilarsLoading(false);
      }
    };

    loadSimilars();
  }, [parfum?.id, simMainAccords, simSimilarIds, simCachedAt]);

  const toggleFav = useCallback(async () => {
    if (!isAuthenticated) { router.push('/auth/login'); return; }
    if (!user?.uid || !id || !parfum) {
      console.warn('[fav] Missing data:', { uid: !!user?.uid, id: !!id, parfum: !!parfum });
      return;
    }
    if (isFav && favoriId) {
      const fid = favoriId;
      setIsFav(false); setFavoriId(null);
      try { await removeFavori(user.uid, fid); } catch { setIsFav(true); setFavoriId(fid); }
    } else {
      setIsFav(true);
      try {
        const fid = await addFavori(user.uid, id, parfum.nom, parfum.marque, parfum.imageUrl, parfum.familleOlactive, parfum.bestPrice, parfum.referencePrice, parfum.annee);
        setFavoriId(fid);
      } catch (e) {
        console.warn('[fav] Failed:', (e as Error)?.message);
        setIsFav(false);
      }
    }
  }, [isAuthenticated, user?.uid, id, parfum, isFav, favoriId, router]);

  const handleWardrobeAdd = useCallback(async (ownership: import('../../src/models/wardrobe.interface').WardrobeItem['ownership'], sizeMl?: number | null): Promise<void> => {
    if (!isAuthenticated) { router.push('/auth/login'); throw new Error('Non authentifié'); }
    if (!user?.uid || !id || !parfum) throw new Error('Données manquantes');
    await addToWardrobe(user.uid, id, ownership, parfum.nom, parfum.marque, parfum.imageUrl, parfum.familleOlactive, sizeMl ?? null);
    setWardrobeItem({
      parfumId: id, ownership, nom: parfum.nom, marque: parfum.marque,
      imageUrl: parfum.imageUrl ?? null, familleOlactive: parfum.familleOlactive ?? null,
      rating: null, notes: null, shelfIds: [], sizeMl: sizeMl ?? null, sotdCount: 0,
      isSignature: false,
      addedAt: new Date(), updatedAt: new Date(),
    });
  }, [isAuthenticated, user?.uid, id, parfum, router]);

  const handleWardrobePress = useCallback(() => {
    if (!isAuthenticated) { router.push('/auth/login'); return; }
    if (wardrobeItem) { router.push(`/wardrobe/${id}`); return; }
    setShowWardrobeSheet(true);
  }, [isAuthenticated, wardrobeItem, id, router]);

  const handleScroll = useCallback((e: NativeSyntheticEvent<NativeScrollEvent>) => {
    scrollY.value = e.nativeEvent.contentOffset.y;
  }, []);

  const handleImageError = useCallback(() => setImgFailed(true), []);
  const handleImagePress = useCallback(() => setShowImageViewer(true), []);
  const handlePurchasePress = useCallback(() => {
    if (parfum?.purchaseUrl) Linking.openURL(parfum.purchaseUrl);
  }, [parfum?.purchaseUrl]);

  const seasonData = parfum && parfum.seasonRanking ? [...parfum.seasonRanking].sort(function(a,b){return b.score-a.score}) : null;
  const seasonMax = seasonData && seasonData.length > 0 ? Math.max.apply(null, seasonData.map(function(s){return s.score})) : 0;
  const occasionData = parfum && parfum.occasionRanking ? [...parfum.occasionRanking].sort(function(a,b){return b.score-a.score}) : null;
  const occasionMax = occasionData && occasionData.length > 0 ? Math.max.apply(null, occasionData.map(function(o){return o.score})) : 0;
  const heroUrl = parfum?.imageUrl ?? null;
  const topSeasons = seasonData?.slice(0, 2) ?? [];
  const topOccasions = occasionData?.slice(0, 2) ?? [];
  const hasBestPrice = typeof parfum?.bestPrice === 'number' && parfum.bestPrice > 0;
  const ratingDisplay: number | undefined = (() => {
    const p = parfum;
    if (!p) return undefined;
    if (typeof p.ratingScore === 'number') return Number.isNaN(p.ratingScore) ? undefined : p.ratingScore;
    if (typeof p.rating === 'string') { const v = parseFloat(p.rating); return Number.isNaN(v) ? undefined : v; }
    return undefined;
  })();

  const SEASON_ICON: Record<string, string> = {
    spring: 'leaf', summer: 'sunny', fall: 'leaf', autumn: 'leaf', winter: 'snow',
  };
  const OCCASION_ICON: Record<string, string> = {
    casual: 'sunny', day: 'sunny', evening: 'musical-notes', night: 'moon',
    party: 'musical-notes', club: 'musical-notes', work: 'briefcase', office: 'briefcase',
    date: 'heart', romantic: 'heart', formal: 'shirt', sport: 'fitness',
    professional: 'briefcase', 'night out': 'moon', night_out: 'moon',
    business: 'briefcase', leisure: 'game-controller', daily: 'sunny',
  };

  const content = (
    <>
      {loading ? (
      <View style={s.center}><ActivityIndicator size="large" color={t.colors.primary} /></View>
    ) : !parfum ? (
      <View style={s.center}><Text style={{fontFamily:'Inter_400Regular',color:t.colors.textMuted}}>Parfum introuvable.</Text></View>
    ) : (
      <View style={{flex:1,backgroundColor:t.colors.background}}>
        <CollapsingHeader scrollY={scrollY} brand={parfum.marque} name={parfum.nom} />
        <ScrollView
          style={{flex:1}}
          contentContainerStyle={{paddingTop:insets.top+70}}
          onScroll={handleScroll}
          scrollEventThrottle={16}
          showsVerticalScrollIndicator={false}
        >
          <HeroPriceOverlay
            imageUrl={heroUrl}
            brand={parfum.marque}
            bestPrice={hasBestPrice ? parfum.bestPrice : undefined}
            referencePrice={parfum.referencePrice}
            purchaseUrl={parfum.purchaseUrl}
            imgFailed={imgFailed}
            onImageError={handleImageError}
            onImagePress={handleImagePress}
            onPurchasePress={handlePurchasePress}
          />

          <View style={s.contentWrap}>
            <View style={s.badgeRow}>
              {parfum.typeParfum && (
                <View style={s.badgeCompact}><Text style={s.badgeCompactText}>{typeParfumLabel(parfum.typeParfum)}</Text></View>
              )}
              <View style={[s.badgeCompact,{backgroundColor:t.colors.primarySoft}]}>
                <Text style={[s.badgeCompactText,{color:t.colors.primaryInk}]}>{translateNote(parfum.familleOlactive)}</Text>
              </View>
              {parfum.annee && (
                <View style={[s.badgeCompact,{backgroundColor:t.colors.secondarySoft}]}>
                  <Text style={[s.badgeCompactText,{color:t.colors.secondary}]}>{parfum.annee}</Text>
                </View>
              )}
              {__DEV__ && (
                <View style={{width:6,height:6,borderRadius:3,backgroundColor:parfum.source==='seed'||parfum.source==='manual'?t.colors.primary:t.colors.overpriced,alignSelf:'center'}} />
              )}
            </View>

            <View style={[s.badgeRow,{marginBottom:4}]}>
              {topSeasons.length > 0 && (
                <View style={s.badgeCompactMuted}>
                  <Ionicons name={SEASON_ICON[topSeasons[0].name.toLowerCase()] as never ?? 'leaf'} size={12} color={t.colors.textMuted} />
                  <Text style={s.badgeCompactMutedText}>
                    {topSeasons.map(s => SEASON_META[s.name.toLowerCase()]?.label ?? s.name).join(' / ')}
                  </Text>
                </View>
              )}
              {topOccasions.length > 0 && (
                <View style={s.badgeCompactMuted}>
                  <Ionicons name={OCCASION_ICON[topOccasions[0].name.toLowerCase()] as never ?? 'musical-notes'} size={12} color={t.colors.textMuted} />
                  <Text style={s.badgeCompactMutedText}>
                    {topOccasions.map(o => OCCASION_META[o.name.toLowerCase()]?.label ?? o.name).join(' / ')}
                  </Text>
                </View>
              )}
              {ratingDisplay !== undefined && (
                <View style={s.badgeCompactMuted}>
                  <Ionicons name="star" size={12} color={t.colors.fair} />
                  <Text style={[s.badgeCompactMutedText,{color:t.colors.fair}]}>{ratingDisplay}</Text>
                </View>
              )}
            </View>

            <View ref={priceSectionRef} onLayout={(e: LayoutChangeEvent) => { priceSectionY.value = e.nativeEvent.layout.y + 20; }}>
              {/* ─── Prix (PriceDisplay) ─── */}
              {parfum.bestPrice ? (
                <View style={s.dealSection}>
                  <PriceDisplay
                    bestPrice={parfum.bestPrice}
                    referencePrice={parfum.referencePrice}
                    priceValue={parfum.priceValue as 'deal' | 'fair' | 'overpriced' | undefined}
                    large
                  />
                  {parfum.purchaseUrl && (
                    <Button variant="primary" onPress={() => Linking.openURL(parfum.purchaseUrl!)} icon="cart-outline" style={s.buyBtn}>
                      Voir l'offre
                    </Button>
                  )}

                  {/* ─── Indicateur de tendance ─── */}
                  {parfum.referencePrice ? (
                    <View style={s.trendRow}>
                      <Ionicons
                        name={parfum.bestPrice < parfum.referencePrice * 0.9 ? 'trending-down' : parfum.bestPrice > parfum.referencePrice * 1.05 ? 'trending-up' : 'remove'}
                        size={16}
                        color={parfum.bestPrice < parfum.referencePrice * 0.9 ? t.colors.deal : parfum.bestPrice > parfum.referencePrice * 1.05 ? t.colors.overpriced : t.colors.textMuted}
                      />
                      <Text style={[s.trendText, {
                        color: parfum.bestPrice < parfum.referencePrice * 0.9 ? t.colors.deal : parfum.bestPrice > parfum.referencePrice * 1.05 ? t.colors.overpriced : t.colors.textMuted
                      }]}>
                        {parfum.bestPrice < parfum.referencePrice * 0.9
                          ? `-${Math.round((1 - parfum.bestPrice / parfum.referencePrice) * 100)}% vs prix de référence`
                          : parfum.bestPrice > parfum.referencePrice * 1.05
                          ? `+${Math.round((parfum.bestPrice / parfum.referencePrice - 1) * 100)}% vs prix de référence`
                          : 'Prix stable'}
                      </Text>
                    </View>
              ) : null}
                </View>
              ) : null}

              {/* ─── Alerte prix ─── */}
              {isAuthenticated && user?.uid && id && (
                <AlertPriceToggle parfumId={id} uid={user.uid} currentPrice={parfum.bestPrice} />
              )}

              {/* ─── Toutes les offres (multi-marchands) ─── */}
              {parfum.offers && parfum.offers.length > 1 ? (
                <View style={s.infoZone}>
                  <SectionTitle icon="🛍️" title="Toutes les offres" s={s} />
                  {parfum.offers.map((offer, i) => (
                    <Pressable
                      key={`${offer.marchand}-${i}`}
                      style={s.offerRow}
                      onPress={() => offer.url && Linking.openURL(offer.url)}
                    >
                      <View style={s.offerLeft}>
                        <Text style={s.offerMerchant}>{offer.marchand}</Text>
                        {offer.volumeMl && <Text style={s.offerVolume}>{offer.volumeMl} ml</Text>}
                      </View>
                      <View style={s.offerRight}>
                        <Text style={s.offerPrice}>{offer.prix.toFixed(0)} €</Text>
                        {parfum.bestPrice && offer.prix > parfum.bestPrice && (
                          <Text style={s.offerDiff}>+{(offer.prix - parfum.bestPrice).toFixed(0)} €</Text>
                        )}
                      </View>
                    </Pressable>
                  ))}
                </View>
              ) : null}
            </View>

          <OlfactoryPyramid
            topNotes={parfum.notesTete}
            heartNotes={parfum.notesCoeur}
            baseNotes={parfum.notesFond}
            onNotePress={setSelectedNote}
          />
          {/* ─── Accords principaux ─── */}
          {parfum.mainAccords && parfum.mainAccords.length > 0 ? (
            <View style={s.infoZone}>
              <SectionTitle icon="🎯" title="Accords principaux" s={s} />
              {parfum.mainAccordsPercentage
                ? Object.entries(parfum.mainAccordsPercentage)
                    .sort(([, a], [, b]) => accordScore(b) - accordScore(a))
                    .map(([name, pctStr], i, arr) => (
                      <AccordBar key={name} name={translateNote(name)} pct={accordScore(pctStr)} index={i} total={arr.length} s={s} t={t} />
                    ))
                : parfum.mainAccords.map((name, i, arr) => (
                    <AccordBar key={name} name={translateNote(name)} pct={100 - i * 12} index={i} total={arr.length} s={s} t={t} />
                  ))
              }
            </View>
          ) : null}
          {/* ─── Longévité & Sillage ─── */}
          {parfum.longevity || parfum.sillage || typeof parfum.popularityScore === 'number' ? (
            <View style={s.infoZone}>
              <SectionTitle icon="⚡" title="En résumé" s={s} />
              {parfum.longevity ? (() => { const m = longevityMeta(parfum.longevity!); return <View style={s.gaugeRow}><View style={[s.gaugeIcon, { backgroundColor: t.colors.violetSoft }]}><Ionicons name="time-outline" size={14} color={t.colors.violetInk} /></View><View style={s.gaugeBody}><Text style={s.gaugeLabel}>Longévité</Text><View style={s.gaugeTrack}><View style={[s.gaugeFill, { width: `${m.pct}%`, backgroundColor: t.colors.primary }]} /></View></View><Text style={[s.gaugeVal, { color: t.colors.violetInk }]}>{m.label}</Text></View>; })() : null}
              {parfum.sillage ? (() => { const m = sillageMeta(parfum.sillage!); return <View style={s.gaugeRow}><View style={[s.gaugeIcon, { backgroundColor: t.colors.rewardSoft }]}><Ionicons name="pulse-outline" size={14} color={t.colors.reward} /></View><View style={s.gaugeBody}><Text style={s.gaugeLabel}>Sillage</Text><View style={s.gaugeTrack}><View style={[s.gaugeFill, { width: `${m.pct}%`, backgroundColor: t.colors.reward }]} /></View></View><Text style={[s.gaugeVal, { color: t.colors.reward }]}>{m.label}</Text></View>; })() : null}
              {typeof parfum.popularityScore === 'number' ? (() => { const pop = popLabel(parfum.popularityScore!); return <View style={s.gaugeRow}><View style={[s.gaugeIcon, { backgroundColor: t.colors.fairSoft }]}><Ionicons name="flame-outline" size={14} color={pop.color} /></View><View style={s.gaugeBody}><Text style={s.gaugeLabel}>Popularité</Text><View style={s.gaugeTrack}><View style={[s.gaugeFill, { width: `${parfum.popularityScore}%`, backgroundColor: pop.color }]} /></View></View><Text style={[s.gaugeVal, { color: pop.color }]}>{pop.label}</Text></View>; })() : null}
            </View>
          ) : null}
          {/* ─── Saisonnalité ─── */}
            {seasonData && seasonMax > 0 ? (
              <View style={s.infoZone}>
                <SectionTitle icon="🌸" title="Saisonnalité" s={s} />
                {seasonData.map(function(item) {
                  var meta = SEASON_META[item.name.toLowerCase()] ?? { label: item.name, color: t.colors.primary, bg: t.colors.violetSoft, emoji: '📅' };
                  var m = scoreLabel(item.score, seasonMax, 'Très adapté', 'Adapté'); return <View key={item.name} style={s.gaugeRow}><View style={[s.gaugeIcon, { backgroundColor: meta.bg }]}><Text style={{fontFamily:'Inter_400Regular',fontSize:15}}>{meta.emoji}</Text></View><View style={s.gaugeBody}><Text style={s.gaugeLabel}>{meta.label}</Text><View style={s.gaugeTrack}><View style={[s.gaugeFill, { width: `${m.pct}%`, backgroundColor: meta.color }]} /></View></View><Text style={[s.gaugeVal, { color: meta.color }]}>{m.label}</Text></View>;
                })}
              </View>
            ) : null}
          {/* ─── Occasions ─── */}
            {occasionData && occasionMax > 0 ? (
              <View style={s.infoZone}>
                <SectionTitle icon="🎭" title="Occasions" s={s} />
                {occasionData.map(function(item) {
                  var meta = OCCASION_META[item.name.toLowerCase()] ?? { label: item.name, emoji: '📍' };
                  var m = scoreLabel(item.score, occasionMax, 'Idéal', 'Recommandé'); return <View key={item.name} style={s.gaugeRow}><View style={[s.gaugeIcon, { backgroundColor: t.colors.violetSoft }]}><Text style={{fontFamily:'Inter_400Regular',fontSize:15}}>{meta.emoji}</Text></View><View style={s.gaugeBody}><Text style={s.gaugeLabel}>{meta.label}</Text><View style={s.gaugeTrack}><View style={[s.gaugeFill, { width: `${m.pct}%`, backgroundColor: t.colors.primary }]} /></View></View><Text style={[s.gaugeVal, { color: t.colors.violetInk }]}>{m.label}</Text></View>;
                })}
              </View>
            ) : null}
          {/* ─── Parfums similaires ─── */}
          {similars.length > 0 && (
            <View style={s.infoZone}>
              <SectionTitle icon="🔄" title="Parfums similaires" s={s} />
              <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={s.similarRow}>
                {similars.map(sim => (
                  <View key={sim.id} style={s.similarCardWrap}>
                    <ParfumCard
                      parfum={sim}
                      mode="compact"
                      onPressOverride={() => {
                        setPendingParfum(sim);
                        router.push(`/catalog/${sim.id}`);
                      }}
                    />
                  </View>
                ))}
              </ScrollView>
            </View>
          )}
        {similarsLoading && <ActivityIndicator style={{ marginTop: 12 }} color={t.colors.primary} />}
        </View>
        <View style={{height:100}} />
        </ScrollView>

        <StickyBottomBar
          scrollY={scrollY}
          priceSectionY={priceSectionY}
          bestPrice={hasBestPrice ? parfum.bestPrice : undefined}
          referencePrice={parfum.referencePrice}
          isFav={isFav}
          wardrobeItem={wardrobeItem}
          purchaseUrl={parfum.purchaseUrl}
          onToggleFav={toggleFav}
          onWardrobePress={handleWardrobePress}
          onPurchasePress={() => {
            if (parfum.purchaseUrl) Linking.openURL(parfum.purchaseUrl);
          }}
        />
      </View>
      )}
      <WardrobeAddSheet
        visible={showWardrobeSheet}
        parfumName={parfum?.nom}
        parfumBrand={parfum?.marque}
        parfumImageUrl={heroUrl}
        onClose={() => setShowWardrobeSheet(false)}
        onSelect={handleWardrobeAdd}
      />
      <NoteDetailPopup
        visible={selectedNote !== null}
        noteName={selectedNote ?? ''}
        onClose={() => setSelectedNote(null)}
      />
      <ImageViewerPopup
        visible={showImageViewer}
        imageUrl={heroUrl ?? ''}
        brand={parfum?.marque ?? ''}
        onClose={() => setShowImageViewer(false)}
      />
    </>
  );

  if (Platform.OS === 'android') {
    return (
      <View style={{ flex: 1, backgroundColor: t.colors.background }}>
        <Animated.View style={[{ flex: 1 }, swipeStyle]}>
          {content}
        </Animated.View>
        <GestureDetector gesture={edgePanGesture}>
          <Animated.View
            style={{
              position: 'absolute',
              left: 0,
              top: insets.top + 60,
              bottom: 0,
              width: 40,
              zIndex: 10,
            }}
          />
        </GestureDetector>
      </View>
    );
  }

  return (
    <View style={{ flex: 1, backgroundColor: t.colors.background }}>
      {content}
    </View>
  );
}

function getStyles(t: Theme) {
  return {
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  contentWrap: { paddingHorizontal: t.spacing.md, paddingTop: 14, paddingBottom: t.spacing.base, backgroundColor: t.colors.surface, borderRadius: t.radius.card, ...t.shadow.card },
  // ─── Badges 2 lignes ───
  badgeRow: { flexDirection: 'row', gap: 6, flexWrap: 'wrap', alignItems: 'center', marginBottom: 8 },
  badgeCompact: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 20, backgroundColor: t.colors.fairSoft },
  badgeCompactText: { fontSize: 11, fontFamily: 'Inter_500Medium', color: t.colors.fair },
  badgeCompactMuted: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 10, paddingVertical: 4, borderRadius: 20, backgroundColor: t.colors.surface2 },
  badgeCompactMutedText: { fontSize: 11, fontFamily: 'Inter_500Medium', color: t.colors.textMuted },
  // ─── Prix & Deal ───
  dealSection: { marginBottom: 20, gap: 10 },
  buyBtn: { marginTop: 4 },
  trendRow: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingVertical: 4 },
  trendText: { fontFamily: 'Inter_500Medium', fontSize: 13 },
  // ─── Sections ───
  infoZone: { marginTop: 20, marginBottom: 20, gap: 8 },
  sectionTitle: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 4 },
  sectionIcon: { fontSize: 15 },
  sectionTitleText: { fontFamily: 'PlayfairDisplay_600SemiBold', fontSize: 15, color: t.colors.text },
  gaugeRow: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 4 },
  gaugeIcon: { width: 28, height: 28, borderRadius: 14, justifyContent: 'center', alignItems: 'center' },
  gaugeBody: { flex: 1 },
  gaugeLabel: { fontSize: 12, fontFamily: 'Inter_500Medium', color: t.colors.textMuted, marginBottom: 3 },
  gaugeTrack: { height: 6, borderRadius: 3, backgroundColor: t.colors.border, overflow: 'hidden' },
  gaugeFill: { height: '100%', borderRadius: 3 },
  gaugeVal: { fontSize: 12, fontFamily: 'Inter_600SemiBold', marginLeft: 8, minWidth: 70, textAlign: 'right' },
  statBar: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingVertical: 2 },
  statIcon: { fontSize: 13, width: 24, textAlign: 'center' },
  statLabel: { fontSize: 13, fontFamily: 'Inter_500Medium', color: t.colors.text, width: 80 },
  statTrack: { flex: 1, height: 6, borderRadius: 3, overflow: 'hidden' },
  statFill: { height: '100%', borderRadius: 3 },
  statPct: { fontSize: 12, fontFamily: 'Inter_700Bold', width: 36, textAlign: 'right' },
  accordDot: { width: 8, height: 8, borderRadius: 4 },
  // ─── Similaires ───
  similarRow: { gap: 12, paddingTop: 4 },
  similarCardWrap: { width: 160 },
  // ─── Multi-offres ───
  offerRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 10, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: t.colors.border },
  offerLeft: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  offerMerchant: { fontFamily: 'Inter_500Medium', fontSize: 13, color: t.colors.text },
  offerVolume: { fontFamily: 'Inter_400Regular', fontSize: 11, color: t.colors.textMuted, backgroundColor: t.colors.surface2, paddingHorizontal: 6, paddingVertical: 2, borderRadius: 4 },
  offerRight: { alignItems: 'flex-end' },
  offerPrice: { fontFamily: 'Inter_700Bold', fontSize: 15, color: t.colors.primary },
  offerDiff: { fontFamily: 'Inter_500Medium', fontSize: 11, color: t.colors.overpriced },
} as const;
}
