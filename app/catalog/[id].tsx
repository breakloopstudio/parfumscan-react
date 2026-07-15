// app/catalog/[id].tsx — Fiche détail parfum

import { useState, useEffect, useRef } from 'react';
import { View, Text, ScrollView, Image, Pressable, ActivityIndicator, Linking, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useAuthContext } from '../../src/contexts/AuthContext';
import { getParfumById, cacheParfumFromSearch } from '../../src/services/firestore';
import { isParfumFavori, addFavori, removeFavori } from '../../src/services/user-data';
import { consumePendingParfum } from '../../src/services/catalog-bridge';
import { searchFragrance, searchFragranceByQuery, getFragranceById, fragellaToParfum } from '../../src/services/fragella';
import type { ParfumSearchResult } from '../../src/services/fragella';
import { theme } from '../../src/theme/theme';
import type { Parfum } from '../../src/models';
import { translateNote } from '../../src/utils/translate-note';
import OlfactoryPyramid from '../../src/features/catalog/OlfactoryPyramid';

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

// ─── Sous-composants ─────────────────────────────────────────

function StatBar({ label, score, maxScore, icon, barColor, barBg }: { label: string; score: number; maxScore?: number; icon: string; barColor: string; barBg: string }) {
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

function AccordBar({ name, pct, index, total }: { name: string; pct: number; index: number; total: number }) {
  const colors = ['#7C3AED', '#8B5CF6', '#A78BFA', '#C4B5FD', '#DDD6FE'];
  const color = colors[index % colors.length];
  return (
    <View style={s.statBar}>
      <View style={[s.accordDot, { backgroundColor: color }]} />
      <Text style={s.statLabel}>{name}</Text>
      <View style={[s.statTrack, { backgroundColor: theme.colors.violetSoft }]}>
        <View style={[s.statFill, { width: `${pct}%`, backgroundColor: color }]} />
      </View>
      <Text style={[s.statPct, { color: theme.colors.violetInk }]}>{pct}%</Text>
    </View>
  );
}

function SectionTitle({ icon, title }: { icon: string; title: string }) {
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
  const { user, isAuthenticated } = useAuthContext();
  const [parfum, setParfum] = useState<Parfum | ParfumSearchResult | null>(null);
  const [loading, setLoading] = useState(true);
  const [isFav, setIsFav] = useState(false);
  const [favoriId, setFavoriId] = useState<string | null>(null);
  const pendingRef = useRef<Parfum | ParfumSearchResult | null>(consumePendingParfum());
  const loadingRef = useRef(false);
  // Chargement auto-suffisant : bridge (preview) -> Firestore -> Fragella by ID -> Fragella search
  useEffect(() => {
    if (!id) return;
    if (loadingRef.current) return;
    loadingRef.current = true;
    setLoading(true);

    const load = async () => {
      try {
        // Step 1: Bridge data — affichage instantané si disponible
        const pending = pendingRef.current;
          
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
  // Statut favori
  useEffect(() => {
    if (user?.uid && id) {
      isParfumFavori(user.uid, id).then(r => { setIsFav(r.isFavori); setFavoriId(r.favoriId); });
    }
  }, [user?.uid, id]);


  // Enrichissement : si le parfum est chargé mais sans saisonnalité/occasions,
  // on appelle l'endpoint détail Fragella pour récupérer les métadonnées complètes
  useEffect(() => {
    if (!parfum || !id) return;
    const hasSeason = parfum.seasonRanking && parfum.seasonRanking.length > 0;
    const hasOccasion = parfum.occasionRanking && parfum.occasionRanking.length > 0;
    if (hasSeason && hasOccasion) return; // déjà complet

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
  }, [parfum, id]);

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
  if (loading) return <View style={s.center}><ActivityIndicator size="large" color={theme.colors.primary} /></View>;
  if (!parfum) return <View style={s.center}><Text style={{color:theme.colors.textMuted}}>Parfum introuvable.</Text></View>;

  var seasonData = parfum && parfum.seasonRanking ? [...parfum.seasonRanking].sort(function(a,b){return b.score-a.score}) : null;
  var seasonMax = seasonData && seasonData.length > 0 ? Math.max.apply(null, seasonData.map(function(s){return s.score})) : 0;
  var occasionData = parfum && parfum.occasionRanking ? [...parfum.occasionRanking].sort(function(a,b){return b.score-a.score}) : null;
  var occasionMax = occasionData && occasionData.length > 0 ? Math.max.apply(null, occasionData.map(function(o){return o.score})) : 0;
  return (
    <SafeAreaView style={s.container}>
      <ScrollView>
        {parfum.imageUrl && <Image source={{ uri: parfum.imageUrl }} style={s.heroImg} />}
        <View style={s.card}>
          <View style={s.titleRow}>
            <View style={{flex:1}}><Text style={s.brand}>{parfum.marque}</Text><Text style={s.name}>{parfum.nom}</Text></View>
            <Pressable onPress={toggleFav} hitSlop={12}><Ionicons name={isFav?'heart':'heart-outline'} size={28} color={isFav?theme.colors.danger:theme.colors.textMuted}/></Pressable>
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
              {('longevity' in parfum && parfum.longevity) ? (() => { const m = longevityMeta(parfum.longevity!); return <View style={s.gaugeRow}><View style={[s.gaugeIcon, { backgroundColor: theme.colors.violetSoft }]}><Ionicons name="time-outline" size={14} color={theme.colors.violetInk} /></View><View style={s.gaugeBody}><Text style={s.gaugeLabel}>Longévité</Text><View style={s.gaugeTrack}><View style={[s.gaugeFill, { width: `${m.pct}%`, backgroundColor: theme.colors.primary }]} /></View></View><Text style={[s.gaugeVal, { color: theme.colors.violetInk }]}>{m.label}</Text></View>; })() : null}
              {('sillage' in parfum && parfum.sillage) ? (() => { const m = sillageMeta(parfum.sillage!); return <View style={s.gaugeRow}><View style={[s.gaugeIcon, { backgroundColor: theme.colors.rewardSoft }]}><Ionicons name="pulse-outline" size={14} color={theme.colors.reward} /></View><View style={s.gaugeBody}><Text style={s.gaugeLabel}>Sillage</Text><View style={s.gaugeTrack}><View style={[s.gaugeFill, { width: `${m.pct}%`, backgroundColor: theme.colors.reward }]} /></View></View><Text style={[s.gaugeVal, { color: theme.colors.reward }]}>{m.label}</Text></View>; })() : null}
              {('popularityScore' in parfum && typeof parfum.popularityScore === 'number') ? (() => { const pop = popLabel(parfum.popularityScore!); return <View style={s.gaugeRow}><View style={[s.gaugeIcon, { backgroundColor: '#FFF7ED' }]}><Ionicons name="flame-outline" size={14} color={pop.color} /></View><View style={s.gaugeBody}><Text style={s.gaugeLabel}>Popularité</Text><View style={s.gaugeTrack}><View style={[s.gaugeFill, { width: `${parfum.popularityScore}%`, backgroundColor: pop.color }]} /></View></View><Text style={[s.gaugeVal, { color: pop.color }]}>{pop.label}</Text></View>; })() : null}
            </View>
          ) : null}

          {'bestPrice' in parfum && parfum.bestPrice ? (
            <View style={s.dealCard}>
              <View style={s.dealHeader}>
                <Text style={s.dealLabel}>Meilleur prix</Text>
                <View style={s.dealPriceRow}>
                  <Text style={s.dealBestPrice}>{parfum.bestPrice.toFixed(2)} €</Text>
                  {parfum.referencePrice && (
                    <Text style={s.dealRefPrice}>{parfum.referencePrice.toFixed(2)} €</Text>
                  )}
                  {parfum.referencePrice && parfum.bestPrice < parfum.referencePrice && (
                    <View style={s.dealDiscount}><Text style={s.dealDiscountText}>-{Math.round((1 - parfum.bestPrice / parfum.referencePrice) * 100)}%</Text></View>
                  )}
                </View>
                {'priceValue' in parfum && parfum.priceValue && (
                  <Text style={[s.dealValue, parfum.priceValue === 'overpriced' ? s.dealOver : parfum.priceValue === 'fair' ? s.dealFair : s.dealGood]}>
                    {parfum.priceValue === 'overpriced' ? '💸 Trop cher' : parfum.priceValue === 'fair' ? '⚖️ Prix correct' : '🎯 Bonne affaire'}
                  </Text>
                )}
              </View>
              {parfum.purchaseUrl && (
                <Pressable style={s.dealBtn} onPress={() => Linking.openURL(parfum.purchaseUrl!)}>
                  <Ionicons name="cart-outline" size={18} color="#FFF" />
                  <Text style={s.dealBtnText}>Voir l'offre</Text>
                  <Ionicons name="open-outline" size={14} color="rgba(255,255,255,0.7)" />
                </Pressable>
              )}
            </View>
          ) : null}
          <SectionTitle icon="▲" title="Pyramide olfactive" />
          <Text style={s.pyramidDesc}>Découvrez son évolution sur la peau</Text>
          <OlfactoryPyramid
            topNotes={parfum.notesTete}
            heartNotes={parfum.notesCoeur}
            baseNotes={parfum.notesFond}
          />
          {/* ─── Accords principaux ─── */}
          {'mainAccords' in parfum && parfum.mainAccords && parfum.mainAccords.length > 0 ? (
            <View style={s.infoZone}>
              <SectionTitle icon="🎯" title="Accords principaux" />
              {parfum.mainAccordsPercentage
                ? Object.entries(parfum.mainAccordsPercentage)
                    .sort(([, a], [, b]) => accordScore(b) - accordScore(a))
                    .map(([name, pctStr], i, arr) => (
                      <AccordBar key={name} name={translateNote(name)} pct={accordScore(pctStr)} index={i} total={arr.length} />
                    ))
                : parfum.mainAccords.map((name, i, arr) => (
                    <AccordBar key={name} name={translateNote(name)} pct={100 - i * 12} index={i} total={arr.length} />
                  ))
              }
            </View>
          ) : null}
          {/* ─── Saisonnalité ─── */}
            {seasonData && seasonMax > 0 ? (
              <View style={s.infoZone}>
                <SectionTitle icon="🌸" title="Saisonnalité" />
                {seasonData.map(function(item) {
                  var meta = SEASON_META[item.name.toLowerCase()] ?? { label: item.name, color: theme.colors.primary, bg: theme.colors.violetSoft, emoji: '📅' };
                  var m = scoreLabel(item.score, seasonMax, 'Très adapté', 'Adapté'); return <View key={item.name} style={s.gaugeRow}><View style={[s.gaugeIcon, { backgroundColor: meta.bg }]}><Text style={{fontSize:15}}>{meta.emoji}</Text></View><View style={s.gaugeBody}><Text style={s.gaugeLabel}>{meta.label}</Text><View style={s.gaugeTrack}><View style={[s.gaugeFill, { width: `${m.pct}%`, backgroundColor: meta.color }]} /></View></View><Text style={[s.gaugeVal, { color: meta.color }]}>{m.label}</Text></View>;
                })}
              </View>
            ) : null}
          {/* ─── Occasions ─── */}
            {occasionData && occasionMax > 0 ? (
              <View style={s.infoZone}>
                <SectionTitle icon="🎭" title="Occasions" />
                {occasionData.map(function(item) {
                  var meta = OCCASION_META[item.name.toLowerCase()] ?? { label: item.name, emoji: '📍' };
                  var m = scoreLabel(item.score, occasionMax, 'Idéal', 'Recommandé'); return <View key={item.name} style={s.gaugeRow}><View style={[s.gaugeIcon, { backgroundColor: theme.colors.violetSoft }]}><Text style={{fontSize:15}}>{meta.emoji}</Text></View><View style={s.gaugeBody}><Text style={s.gaugeLabel}>{meta.label}</Text><View style={s.gaugeTrack}><View style={[s.gaugeFill, { width: `${m.pct}%`, backgroundColor: theme.colors.primary }]} /></View></View><Text style={[s.gaugeVal, { color: theme.colors.violetInk }]}>{m.label}</Text></View>;
                })}
              </View>
            ) : null}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: theme.colors.background },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  heroImg: { width: '100%', height: 280, resizeMode: 'cover' },
  card: { backgroundColor: theme.colors.surface, borderRadius: 20, padding: 20, marginTop: -30, position: 'relative', zIndex: 1, ...theme.shadow.card },
  titleRow: { flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between' },
  brand: { fontSize: 11, textTransform: 'uppercase', letterSpacing: 2, color: theme.colors.textMuted, fontWeight: '600' },
  name: { fontFamily: 'PlayfairDisplay_700Bold', fontSize: 26, color: theme.colors.text, marginTop: 4, lineHeight: 30 },
  badges: { flexDirection: 'row', gap: 8, flexWrap: 'wrap', marginTop: 12, marginBottom: 24 },
  tagFamily: { backgroundColor: theme.colors.violetSoft, paddingHorizontal: 12, paddingVertical: 5, borderRadius: 20 },
  tagFamilyText: { fontSize: 11, fontWeight: '500', color: theme.colors.violetInk },
  tagYear: { backgroundColor: theme.colors.rewardSoft, paddingHorizontal: 12, paddingVertical: 5, borderRadius: 20 },
  tagYearText: { fontSize: 11, fontWeight: '500', color: theme.colors.reward },
  tagGender: { backgroundColor: '#E8F0FE', paddingHorizontal: 12, paddingVertical: 5, borderRadius: 20 },
  tagGenderText: { fontSize: 11, fontWeight: '500', color: '#1A56DB' },
  // Deal / Prix
  dealCard: { backgroundColor: theme.colors.dealSoft, borderRadius: 16, padding: 16, marginBottom: 24, borderWidth: 1, borderColor: '#D1FAE5' },
  dealHeader: { marginBottom: 12 },
  dealLabel: { fontSize: 12, textTransform: 'uppercase', letterSpacing: 1.5, color: theme.colors.deal, fontWeight: '600', marginBottom: 8 },
  dealPriceRow: { flexDirection: 'row', alignItems: 'baseline', gap: 10 },
  dealBestPrice: { fontSize: 32, fontWeight: '800', color: theme.colors.deal },
  dealRefPrice: { fontSize: 16, color: theme.colors.textMuted, textDecorationLine: 'line-through' },
  dealDiscount: { backgroundColor: theme.colors.reward, paddingHorizontal: 8, paddingVertical: 3, borderRadius: 10 },
  dealDiscountText: { fontSize: 13, fontWeight: '800', color: '#1F1A2E' },
  dealValue: { fontSize: 13, fontWeight: '600', marginTop: 6 },
  dealOver: { color: '#DC2626' },
  dealFair: { color: '#D97706' },
  dealGood: { color: '#059669' },
  dealBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, backgroundColor: theme.colors.primary, paddingVertical: 14, borderRadius: 12, marginTop: 4, ...theme.shadow.button },
  dealBtnText: { color: '#FFF', fontWeight: '700', fontSize: 16 },
  pyramidDesc: { fontSize: 13, color: theme.colors.textMuted, marginBottom: 4 },
  // ─── Nouvelles sections ───
  tagType: { backgroundColor: '#FFF7ED', paddingHorizontal: 12, paddingVertical: 5, borderRadius: 20 },
  tagRating: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#FFFBEB', paddingHorizontal: 10, paddingVertical: 5, borderRadius: 20 },
  tagRatingText: { fontSize: 12, fontWeight: '700', color: '#D97706' },
  tagPopularity: { backgroundColor: theme.colors.violetSoft },
  tagPopularityText: { fontSize: 11, fontWeight: '600', color: theme.colors.primary },
  tagTypeText: { fontSize: 11, fontWeight: '500', color: '#9A3412' },
  infoZone: { marginTop: 20, marginBottom: 20, gap: 8 },
  sectionTitle: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 4 },
  sectionIcon: { fontSize: 15 },
  sectionTitleText: { fontFamily: 'PlayfairDisplay_600SemiBold', fontSize: 15, color: theme.colors.text },
  // Gauge longévité/sillage
  gaugeRow: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 4 },
  gaugeIcon: { width: 28, height: 28, borderRadius: 14, justifyContent: 'center', alignItems: 'center' },
  gaugeBody: { flex: 1 },
  gaugeLabel: { fontSize: 12, fontWeight: '500', color: theme.colors.textMuted, marginBottom: 3 },
  gaugeTrack: { height: 6, borderRadius: 3, backgroundColor: theme.colors.border, overflow: 'hidden' },
  gaugeFill: { height: '100%', borderRadius: 3 },
  gaugeVal: { fontSize: 12, fontWeight: '600', marginLeft: 8, minWidth: 70, textAlign: 'right' },
  // Stat bar (saison/occasion)
  statBar: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingVertical: 2 },
  statIcon: { fontSize: 13, width: 24, textAlign: 'center' },
  statLabel: { fontSize: 13, fontWeight: '500', color: theme.colors.text, width: 80 },
  statTrack: { flex: 1, height: 6, borderRadius: 3, overflow: 'hidden' },
  statFill: { height: '100%', borderRadius: 3 },
  statPct: { fontSize: 12, fontWeight: '700', width: 36, textAlign: 'right' },
  // Accords
  accordDot: { width: 8, height: 8, borderRadius: 4 },
});
