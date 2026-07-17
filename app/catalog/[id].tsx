// app/catalog/[id].tsx — Fiche détail parfum (refonte Luxe malin)

import { useState, useEffect, useRef, useMemo } from 'react';
import { View, Text, ScrollView, Pressable, ActivityIndicator, Linking, TextInput, StyleSheet, useWindowDimensions, Platform } from 'react-native';
import { Image } from 'expo-image';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import Animated, { useSharedValue, useAnimatedStyle, withSpring, runOnJS } from 'react-native-reanimated';
import Ionicons from '@react-native-vector-icons/ionicons/static';
import { useAuthContext } from '../../src/contexts/AuthContext';
import { getParfumById, cacheParfumFromSearch, batchCacheParfums, updateParfum } from '../../src/services/firestore';
import { isParfumFavori, addFavori, removeFavori, addToCollection, removeFromCollection, addToWishlist, removeFromWishlist, isInCollection, isInWishlist } from '../../src/services/user-data';
import { consumePendingParfum, setPendingParfum } from '../../src/services/catalog-bridge';
import { searchFragrance, searchFragranceByQuery, getFragranceById, fragellaToParfum, getSimilarFragrances } from '../../src/services/fragella';
import type { ParfumSearchResult } from '../../src/services/fragella';
import { useTheme, type Theme } from '../../src/theme/ThemeContext';
import type { Parfum } from '../../src/models';
import { translateNote } from '../../src/utils/translate-note';
import OlfactoryPyramid from '../../src/features/catalog/OlfactoryPyramid';
import PriceDisplay from '../../src/components/PriceDisplay';
import Button from '../../src/components/Button';
import AlertPriceToggle from '../../src/components/AlertPriceToggle';

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
  const colors = [t.colors.primary, t.colors.primaryTint, '#A78BFA', '#C4B5FD', t.colors.primarySoft];
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

  const backGesture = Gesture.Pan()
    .activeOffsetX(20)
    .failOffsetY([-15, 15])
    .onUpdate((e) => {
      if (e.translationX > 0) {
        translateX.value = e.translationX * 0.85;
      }
    })
    .onEnd((e) => {
      const threshold = Math.max((windowWidth || 400) * SWIPE_THRESHOLD_RATIO, MIN_SWIPE_THRESHOLD);
      if (e.translationX > threshold || e.velocityX > 500) {
        translateX.value = withSpring(0, { damping: 20, stiffness: 300, mass: 0.5 });
        runOnJS(router.back)();
      } else {
        translateX.value = withSpring(0, SWIPE_SPRING);
      }
    });

  const swipeStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: translateX.value }],
  }));

  const { user, isAuthenticated } = useAuthContext();
  const [parfum, setParfum] = useState<Parfum | ParfumSearchResult | null>(null);
  const [loading, setLoading] = useState(true);
  const [isFav, setIsFav] = useState(false);
  const [favoriId, setFavoriId] = useState<string | null>(null);
  const [isInColl, setIsInColl] = useState(false);
  const [collItemId, setCollItemId] = useState<string | null>(null);
  const [isInWish, setIsInWish] = useState(false);
  const [wishItemId, setWishItemId] = useState<string | null>(null);
  const [pending] = useState<Parfum | ParfumSearchResult | null>(() => consumePendingParfum());
  const [imgFailed, setImgFailed] = useState(false);
  const [storePrice, setStorePrice] = useState('');
  const [showStoreInput, setShowStoreInput] = useState(false);
  const [similars, setSimilars] = useState<ParfumSearchResult[]>([]);
  const [similarsLoading, setSimilarsLoading] = useState(false);
  const loadingRef = useRef(false);
  const enrichmentRef = useRef(false);
  // Chargement auto-suffisant : bridge (preview) -> Firestore -> Fragella by ID -> Fragella search
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

        // Step 2: Toujours tenter Firestore (données plus complètes : enriched metadata)
        try {
          const cached = await getParfumById(id);
          if (cached) {
            setParfum(cached); // override le preview bridge
            
            return;
          }
        } catch (e) {
          console.warn('[detail] Firestore fetch failed:', (e as Error)?.message);
        }

        // Step 3: Si on a déjà le bridge, on s'arrête là (pas besoin d'appeler l'API)
          
        if (pending && pending.id === id) {
          return;
        }

        // Step 4: Dernier recours — recherche textuelle Fragella
          
        try {
          const searchQuery = id.replace(/_/g, ' ').trim();
          const results = await searchFragranceByQuery(searchQuery);
          if (results.length > 0) {
            const p = fragellaToParfum(results[0]);
            setParfum(p);
            cacheParfumFromSearch(p).catch(() => {});
          } else {
          }
        } catch (e) {
          console.warn('[detail] Fragella search failed:', (e as Error)?.message);
          if (!parfum) setParfum(null);
        }
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
  // Statut favori + collection + wishlist
  useEffect(() => {
    if (user?.uid && id) {
      isParfumFavori(user.uid, id).then(r => { setIsFav(r.isFavori); setFavoriId(r.favoriId); });
      isInCollection(user.uid, id).then(r => { setIsInColl(r.isInCollection); setCollItemId(r.itemId); });
      isInWishlist(user.uid, id).then(r => { setIsInWish(r.isInWishlist); setWishItemId(r.itemId); });
    }
  }, [user?.uid, id]);


  // Enrichissement : si le parfum est chargé mais sans saisonnalité/occasions,
  // on appelle l'endpoint détail Fragella pour récupérer les métadonnées complètes
  useEffect(() => {
    if (!parfum || !id) return;
    if (enrichmentRef.current) return;
    const hasSeason = parfum.seasonRanking && parfum.seasonRanking.length > 0;
    const hasOccasion = parfum.occasionRanking && parfum.occasionRanking.length > 0;
    if (hasSeason && hasOccasion) { enrichmentRef.current = true; return; }
    enrichmentRef.current = true;

    // Utiliser l'ID Fragella original si disponible, sinon chercher via search
    const enrich = async () => {
      let fragellaId = parfum.fragellaId;
      if (!fragellaId && parfum.marque && parfum.nom) {
        const results = await searchFragrance(parfum.marque, parfum.nom);
        if (results[0]?.fragellaId) {
          fragellaId = results[0].fragellaId;
        }
      }
      if (!fragellaId) return;
      const detail = await getFragranceById(fragellaId);
      if (!detail) return;
      const enriched = fragellaToParfum(detail);
      setParfum(prev => {
        if (!prev) return enriched;
        return {
          ...prev,
          seasonRanking: prev.seasonRanking ?? enriched.seasonRanking,
          occasionRanking: prev.occasionRanking ?? enriched.occasionRanking,
          mainAccords: prev.mainAccords ?? enriched.mainAccords,
          mainAccordsPercentage: prev.mainAccordsPercentage ?? enriched.mainAccordsPercentage,
          longevity: prev.longevity ?? enriched.longevity,
          sillage: prev.sillage ?? enriched.sillage,
          gender: prev.gender ?? enriched.gender,
          rating: prev.rating ?? enriched.rating,
          popularity: prev.popularity ?? enriched.popularity,
          popularityScore: prev.popularityScore ?? enriched.popularityScore,
          ratingScore: prev.ratingScore ?? enriched.ratingScore,
          priceValue: prev.priceValue ?? enriched.priceValue,
          country: prev.country ?? enriched.country,
          generalNotes: prev.generalNotes ?? enriched.generalNotes,
          bestPrice: prev.bestPrice ?? enriched.bestPrice,
          referencePrice: prev.referencePrice ?? enriched.referencePrice,
          imageUrl: prev.imageUrl ?? enriched.imageUrl,
          purchaseUrl: prev.purchaseUrl ?? enriched.purchaseUrl,
          fragellaId: prev.fragellaId ?? enriched.fragellaId,
        } as ParfumSearchResult;
      });
      cacheParfumFromSearch(enriched).catch(() => {});
    };
    enrich().catch(() => {});
  }, [id]);

  // Parfums similaires — cache-first (Firestore free → Fragella paid)
  useEffect(() => {
    if (!parfum?.marque || !parfum?.nom) return;

    const loadSimilars = async () => {
      setSimilarsLoading(true);

      // Step 1: check Firestore cache via similarIds
      if (parfum.similarIds && parfum.similarIds.length > 0) {
        const cached = (await Promise.all(
          parfum.similarIds.map((id: string) => getParfumById(id).catch(() => undefined))
        )).filter(Boolean) as Parfum[];

        if (cached.length >= 3) {
          setSimilars(cached.map(p => ({
            ...p,
            source: 'fragella' as const,
          } as ParfumSearchResult)));
          setSimilarsLoading(false);
          return;
        }
      }

      // Step 2: call Fragella API
      try {
        const r = await getSimilarFragrances(parfum.marque, parfum.nom, 6);
        const mapped = r.filter(f => f.id !== parfum.id).map(fragellaToParfum);
        setSimilars(mapped);

        // Step 3: cache results + persist similarIds for next visitor
        if (mapped.length > 0) {
          const ids = mapped.map(p => p.id);
          batchCacheParfums(mapped).catch(() => {});
          updateParfum(parfum.id!, { similarIds: ids }).catch(() => {});
        }
      } catch {
        // silent fail — similars carousel is non-critical
      } finally {
        setSimilarsLoading(false);
      }
    };

    loadSimilars();
  }, [parfum?.id]);

  const toggleFav = async () => {
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
        if (!('createdAt' in parfum)) {
          await cacheParfumFromSearch(parfum as ParfumSearchResult);
        }
        const fid = await addFavori(user.uid, id, parfum.nom, parfum.marque, parfum.imageUrl, parfum.familleOlactive);
        setFavoriId(fid);
      } catch (e) {
        console.warn('[fav] Failed:', (e as Error)?.message);
        setIsFav(false);
      }
    }
  };

  const toggleCollection = async () => {
    if (!isAuthenticated) { router.push('/auth/login'); return; }
    if (!user?.uid || !id || !parfum) return;
    if (isInColl && collItemId) {
      const cid = collItemId;
      setIsInColl(false); setCollItemId(null);
      try { await removeFromCollection(user.uid, cid); } catch { setIsInColl(true); setCollItemId(cid); }
    } else {
      setIsInColl(true);
      try {
        if (!('createdAt' in parfum)) {
          await cacheParfumFromSearch(parfum as ParfumSearchResult);
        }
        const itemId = await addToCollection(user.uid, id, parfum.nom, parfum.marque, parfum.imageUrl);
        setCollItemId(itemId);
      } catch { setIsInColl(false); }
    }
  };

  const toggleWishlist = async () => {
    if (!isAuthenticated) { router.push('/auth/login'); return; }
    if (!user?.uid || !id || !parfum) return;
    if (isInWish && wishItemId) {
      const wid = wishItemId;
      setIsInWish(false); setWishItemId(null);
      try { await removeFromWishlist(user.uid, wid); } catch { setIsInWish(true); setWishItemId(wid); }
    } else {
      setIsInWish(true);
      try {
        if (!('createdAt' in parfum)) {
          await cacheParfumFromSearch(parfum as ParfumSearchResult);
        }
        const itemId = await addToWishlist(user.uid, id, parfum.nom, parfum.marque, parfum.imageUrl, parfum.familleOlactive);
        setWishItemId(itemId);
      } catch { setIsInWish(false); }
    }
  };
  const seasonData = parfum && parfum.seasonRanking ? [...parfum.seasonRanking].sort(function(a,b){return b.score-a.score}) : null;
  const seasonMax = seasonData && seasonData.length > 0 ? Math.max.apply(null, seasonData.map(function(s){return s.score})) : 0;
  const occasionData = parfum && parfum.occasionRanking ? [...parfum.occasionRanking].sort(function(a,b){return b.score-a.score}) : null;
  const occasionMax = occasionData && occasionData.length > 0 ? Math.max.apply(null, occasionData.map(function(o){return o.score})) : 0;
  const heroUrl = parfum?.imageUrl ?? parfum?.imageUrlTransparent ?? (parfum?.imageFallbacks?.[0]) ?? null;

  const content = (
    <>
      {loading ? (
      <View style={s.center}><ActivityIndicator size="large" color={t.colors.primary} /></View>
    ) : !parfum ? (
      <View style={s.center}><Text style={{color:t.colors.textMuted}}>Parfum introuvable.</Text></View>
    ) : (
      <SafeAreaView style={s.container}>
    <ScrollView>
        {heroUrl && !imgFailed && <Image source={{ uri: heroUrl }} style={s.heroImg} contentFit="cover" transition={300} onError={() => setImgFailed(true)} />}
        <View style={s.card}>
          <View style={s.titleRow}>
            <View style={{flex:1}}><Text style={s.brand}>{parfum.marque}</Text><Text style={s.name}>{parfum.nom}</Text></View>
            <Pressable onPress={toggleFav} hitSlop={12}><Ionicons name={isFav?'heart':'heart-outline'} size={28} color={isFav?t.colors.favorite:t.colors.textMuted}/></Pressable>
            {__DEV__ && <View style={{width:8,height:8,borderRadius:4,backgroundColor:parfum.source==='fragella'?'#10B981':parfum.source==='fragella-cached'?'#3B82F6':parfum.source==='seed'||parfum.source==='manual'?'#8B5CF6':'#EF4444',marginLeft:4}} />}
          </View>
          <View style={s.badges}>
            <View style={s.tagFamily}><Text style={s.tagFamilyText}>{translateNote(parfum.familleOlactive)}</Text></View>
            {parfum.annee && <View style={s.tagYear}><Text style={s.tagYearText}>{parfum.annee}</Text></View>}
            {'gender' in parfum && parfum.gender && <View style={s.tagGender}><Text style={s.tagGenderText}>{parfum.gender === 'men' ? '👨 Homme' : parfum.gender === 'women' ? '👩 Femme' : '🧑 Unisexe'}</Text></View>}
            {'typeParfum' in parfum && parfum.typeParfum && <View style={s.tagType}><Text style={s.tagTypeText}>{typeParfumLabel(parfum.typeParfum)}</Text></View>}
            {'ratingScore' in parfum && parfum.ratingScore ? <View style={s.tagRating}><Ionicons name="star" size={13} color="#D97706" /><Text style={s.tagRatingText}> {parfum.ratingScore}</Text></View> : ('rating' in parfum && parfum.rating ? <View style={s.tagRating}><Ionicons name="star" size={13} color="#D97706" /><Text style={s.tagRatingText}> {parfum.rating}</Text></View> : null)}
            {/* Popularit� masqu�e */}
          </View>
          {/* ─── Longévité & Sillage ─── */}
          {('longevity' in parfum && parfum.longevity) || ('sillage' in parfum && parfum.sillage) || ('popularityScore' in parfum && typeof parfum.popularityScore === 'number') ? (
            <View style={s.infoZone}>
              {('longevity' in parfum && parfum.longevity) ? (() => { const m = longevityMeta(parfum.longevity!); return <View style={s.gaugeRow}><View style={[s.gaugeIcon, { backgroundColor: t.colors.violetSoft }]}><Ionicons name="time-outline" size={14} color={t.colors.violetInk} /></View><View style={s.gaugeBody}><Text style={s.gaugeLabel}>Longévité</Text><View style={s.gaugeTrack}><View style={[s.gaugeFill, { width: `${m.pct}%`, backgroundColor: t.colors.primary }]} /></View></View><Text style={[s.gaugeVal, { color: t.colors.violetInk }]}>{m.label}</Text></View>; })() : null}
              {('sillage' in parfum && parfum.sillage) ? (() => { const m = sillageMeta(parfum.sillage!); return <View style={s.gaugeRow}><View style={[s.gaugeIcon, { backgroundColor: t.colors.rewardSoft }]}><Ionicons name="pulse-outline" size={14} color={t.colors.reward} /></View><View style={s.gaugeBody}><Text style={s.gaugeLabel}>Sillage</Text><View style={s.gaugeTrack}><View style={[s.gaugeFill, { width: `${m.pct}%`, backgroundColor: t.colors.reward }]} /></View></View><Text style={[s.gaugeVal, { color: t.colors.reward }]}>{m.label}</Text></View>; })() : null}
              {('popularityScore' in parfum && typeof parfum.popularityScore === 'number') ? (() => { const pop = popLabel(parfum.popularityScore!); return <View style={s.gaugeRow}><View style={[s.gaugeIcon, { backgroundColor: '#FFF7ED' }]}><Ionicons name="flame-outline" size={14} color={pop.color} /></View><View style={s.gaugeBody}><Text style={s.gaugeLabel}>Popularité</Text><View style={s.gaugeTrack}><View style={[s.gaugeFill, { width: `${parfum.popularityScore}%`, backgroundColor: pop.color }]} /></View></View><Text style={[s.gaugeVal, { color: pop.color }]}>{pop.label}</Text></View>; })() : null}
            </View>
          ) : null}

          {/* ─── Prix (PriceDisplay) ─── */}
          {'bestPrice' in parfum && parfum.bestPrice ? (
            <View style={s.dealSection}>
              <PriceDisplay
                bestPrice={parfum.bestPrice}
                referencePrice={parfum.referencePrice}
                priceValue={'priceValue' in parfum ? parfum.priceValue as 'deal' | 'fair' | 'overpriced' : undefined}
                large
              />
              {parfum.purchaseUrl && (
                <Button variant="primary" onPress={() => Linking.openURL(parfum.purchaseUrl!)} icon="cart-outline" style={s.buyBtn}>
                  Voir l'offre
                </Button>
              )}

              {/* ─── Indicateur de tendance ─── */}
              {'bestPrice' in parfum && parfum.referencePrice ? (
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

              {/* ─── Prix en magasin ─── */}
              {!showStoreInput ? (
                <Pressable onPress={() => setShowStoreInput(true)} style={s.storeToggle}>
                  <Ionicons name="storefront-outline" size={16} color={t.colors.textMuted} />
                  <Text style={s.storeToggleText}>Comparer avec le prix en magasin</Text>
                </Pressable>
              ) : (
                <View style={s.storeRow}>
                  <View style={s.storeInputWrap}>
                    <Ionicons name="storefront-outline" size={16} color={t.colors.textMuted} style={{ marginRight: 6 }} />
                    <TextInput
                      style={s.storeInput}
                      placeholder="Prix en boutique (€)"
                      placeholderTextColor={t.colors.textMuted}
                      value={storePrice}
                      onChangeText={setStorePrice}
                      keyboardType="decimal-pad"
                    />
                  </View>
                  {storePrice && !isNaN(Number(storePrice)) && Number(storePrice) > 0 ? (
                    <Text style={[s.storeDiff, { color: Number(storePrice) > parfum.bestPrice ? t.colors.deal : t.colors.overpriced }]}>
                      {Number(storePrice) > parfum.bestPrice
                        ? `Tu économises ${(Number(storePrice) - parfum.bestPrice).toFixed(0)} € en ligne`
                        : `Le prix boutique est plus bas de ${(parfum.bestPrice - Number(storePrice)).toFixed(0)} €`}
                    </Text>
                  ) : null}
                </View>
              )}
            </View>
          ) : null}

          {/* ─── 3 boutons d'action ─── */}
          <View style={s.actionRow}>
            <Pressable onPress={toggleFav} style={s.actionBtn}>
              <Ionicons name={isFav ? 'heart' : 'heart-outline'} size={18} color={isFav ? t.colors.favorite : t.colors.textMuted} />
              <Text style={[s.actionLabel, isFav && { color: t.colors.favorite }]}>Favori</Text>
            </Pressable>
            <Pressable onPress={toggleCollection} style={s.actionBtn}>
              <Ionicons name={isInColl ? 'flask' : 'flask-outline'} size={18} color={isInColl ? t.colors.primary : t.colors.textMuted} />
              <Text style={[s.actionLabel, isInColl && { color: t.colors.primary }]}>Collection</Text>
            </Pressable>
            <Pressable onPress={toggleWishlist} style={s.actionBtn}>
              <Ionicons name={isInWish ? 'bookmark' : 'bookmark-outline'} size={18} color={isInWish ? t.colors.secondary : t.colors.textMuted} />
              <Text style={[s.actionLabel, isInWish && { color: t.colors.secondary }]}>Wishlist</Text>
            </Pressable>
          </View>

          {/* ─── Alerte prix ─── */}
          {isAuthenticated && user?.uid && id && (
            <AlertPriceToggle parfumId={id} uid={user.uid} currentPrice={parfum.bestPrice} />
          )}

          {/* ─── Toutes les offres (multi-marchands) ─── */}
          {'offers' in parfum && parfum.offers && parfum.offers.length > 1 ? (
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
          <OlfactoryPyramid
            topNotes={parfum.notesTete}
            heartNotes={parfum.notesCoeur}
            baseNotes={parfum.notesFond}
          />
          {/* ─── Accords principaux ─── */}
          {'mainAccords' in parfum && parfum.mainAccords && parfum.mainAccords.length > 0 ? (
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
          {/* ─── Saisonnalité ─── */}
            {seasonData && seasonMax > 0 ? (
              <View style={s.infoZone}>
                <SectionTitle icon="🌸" title="Saisonnalité" s={s} />
                {seasonData.map(function(item) {
                  var meta = SEASON_META[item.name.toLowerCase()] ?? { label: item.name, color: t.colors.primary, bg: t.colors.violetSoft, emoji: '📅' };
                  var m = scoreLabel(item.score, seasonMax, 'Très adapté', 'Adapté'); return <View key={item.name} style={s.gaugeRow}><View style={[s.gaugeIcon, { backgroundColor: meta.bg }]}><Text style={{fontSize:15}}>{meta.emoji}</Text></View><View style={s.gaugeBody}><Text style={s.gaugeLabel}>{meta.label}</Text><View style={s.gaugeTrack}><View style={[s.gaugeFill, { width: `${m.pct}%`, backgroundColor: meta.color }]} /></View></View><Text style={[s.gaugeVal, { color: meta.color }]}>{m.label}</Text></View>;
                })}
              </View>
            ) : null}
          {/* ─── Occasions ─── */}
            {occasionData && occasionMax > 0 ? (
              <View style={s.infoZone}>
                <SectionTitle icon="🎭" title="Occasions" s={s} />
                {occasionData.map(function(item) {
                  var meta = OCCASION_META[item.name.toLowerCase()] ?? { label: item.name, emoji: '📍' };
                  var m = scoreLabel(item.score, occasionMax, 'Idéal', 'Recommandé'); return <View key={item.name} style={s.gaugeRow}><View style={[s.gaugeIcon, { backgroundColor: t.colors.violetSoft }]}><Text style={{fontSize:15}}>{meta.emoji}</Text></View><View style={s.gaugeBody}><Text style={s.gaugeLabel}>{meta.label}</Text><View style={s.gaugeTrack}><View style={[s.gaugeFill, { width: `${m.pct}%`, backgroundColor: t.colors.primary }]} /></View></View><Text style={[s.gaugeVal, { color: t.colors.violetInk }]}>{m.label}</Text></View>;
                })}
              </View>
            ) : null}
          {/* ─── Parfums similaires ─── */}
          {similars.length > 0 && (
            <View style={s.infoZone}>
              <SectionTitle icon="🔄" title="Parfums similaires" s={s} />
              <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={s.similarRow}>
                {similars.map(sim => (
                  <Pressable
                    key={sim.id}
                    style={s.similarCard}
                    onPress={() => {
                      setPendingParfum(sim);
                      router.push(`/catalog/${sim.id}`);
                    }}
                  >
                    <View style={s.similarImgWrap}>
                      <Ionicons name="flask-outline" size={24} color={t.colors.textMuted} />
                    </View>
                    <Text style={s.similarBrand} numberOfLines={1}>{sim.marque}</Text>
                    <Text style={s.similarName} numberOfLines={2}>{sim.nom}</Text>
                    {sim.bestPrice && (
                      <Text style={s.similarPrice}>{sim.bestPrice.toFixed(0)} €</Text>
                    )}
                  </Pressable>
                ))}
              </ScrollView>
            </View>
          )}
          {similarsLoading && <ActivityIndicator style={{ marginTop: 12 }} color={t.colors.primary} />}
        </View>
      </ScrollView>
          </SafeAreaView>
      )}
    </>
  );

  if (Platform.OS === 'android') {
    return (
      <GestureDetector gesture={backGesture}>
        <Animated.View style={[{ flex: 1, backgroundColor: t.colors.background }, swipeStyle]}>
          {content}
        </Animated.View>
      </GestureDetector>
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
  container: { flex: 1, backgroundColor: t.colors.background },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  heroImg: { width: '100%', height: 280, resizeMode: 'cover' },
  card: { backgroundColor: t.colors.surface, borderRadius: 20, padding: 20, marginTop: -30, position: 'relative', zIndex: 1, ...t.shadow.card },
  titleRow: { flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between' },
  brand: { fontSize: 11, textTransform: 'uppercase', letterSpacing: 2, color: t.colors.textMuted, fontFamily: 'Inter_600SemiBold' },
  name: { fontFamily: 'PlayfairDisplay_700Bold', fontSize: 26, color: t.colors.text, marginTop: 4, lineHeight: 30 },
  badges: { flexDirection: 'row', gap: 8, flexWrap: 'wrap', marginTop: 12, marginBottom: 24 },
  tagFamily: { backgroundColor: t.colors.primarySoft, paddingHorizontal: 12, paddingVertical: 5, borderRadius: 20 },
  tagFamilyText: { fontSize: 11, fontFamily: 'Inter_500Medium', color: t.colors.primaryInk },
  tagYear: { backgroundColor: t.colors.secondarySoft, paddingHorizontal: 12, paddingVertical: 5, borderRadius: 20 },
  tagYearText: { fontSize: 11, fontFamily: 'Inter_500Medium', color: t.colors.secondary },
  tagGender: { backgroundColor: '#E8F0FE', paddingHorizontal: 12, paddingVertical: 5, borderRadius: 20 },
  tagGenderText: { fontSize: 11, fontFamily: 'Inter_500Medium', color: '#1A56DB' },
  tagType: { backgroundColor: '#FFF7ED', paddingHorizontal: 12, paddingVertical: 5, borderRadius: 20 },
  tagRating: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#FFFBEB', paddingHorizontal: 10, paddingVertical: 5, borderRadius: 20 },
  tagRatingText: { fontSize: 12, fontFamily: 'Inter_700Bold', color: '#D97706' },
  tagTypeText: { fontSize: 11, fontFamily: 'Inter_500Medium', color: '#9A3412' },
  // ─── Prix & Deal ───
  dealSection: { marginBottom: 20, gap: 10 },
  buyBtn: { marginTop: 4 },
  trendRow: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingVertical: 4 },
  trendText: { fontFamily: 'Inter_500Medium', fontSize: 13 },
  storeToggle: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingVertical: 4 },
  storeToggleText: { fontFamily: 'Inter_500Medium', fontSize: 13, color: t.colors.textMuted },
  storeRow: { gap: 8 },
  storeInputWrap: { flexDirection: 'row', alignItems: 'center', borderRadius: t.radius.sm, backgroundColor: t.colors.surface2, paddingHorizontal: 12, height: 40 },
  storeInput: { flex: 1, fontFamily: 'Inter_400Regular', fontSize: 14, color: t.colors.text },
  storeDiff: { fontFamily: 'Inter_600SemiBold', fontSize: 13 },
  // ─── Boutons d'action (Collection / Wishlist / Favori) ───
  actionRow: { flexDirection: 'row', marginBottom: 24, gap: 8 },
  actionBtn: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, paddingVertical: 12, borderRadius: t.radius.base, borderWidth: 1, borderColor: t.colors.border, backgroundColor: t.colors.surface2 },
  actionLabel: { fontFamily: 'Inter_500Medium', fontSize: 13, color: t.colors.textMuted },
  // ─── Sections ───
  pyramidDesc: { fontSize: 13, color: t.colors.textMuted, marginBottom: 4 },
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
  similarCard: { width: 130, backgroundColor: t.colors.surface2, borderRadius: t.radius.card, padding: 12, alignItems: 'center', borderWidth: 1, borderColor: t.colors.border },
  similarImgWrap: { width: 56, height: 56, borderRadius: 28, backgroundColor: t.colors.border, justifyContent: 'center', alignItems: 'center', marginBottom: 8 },
  similarBrand: { fontFamily: 'Inter_600SemiBold', fontSize: 11, color: t.colors.textMuted, textAlign: 'center' },
  similarName: { fontFamily: 'Inter_500Medium', fontSize: 12, color: t.colors.text, textAlign: 'center', marginTop: 2 },
  similarPrice: { fontFamily: 'Inter_700Bold', fontSize: 14, color: t.colors.primary, marginTop: 6 },
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
