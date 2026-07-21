// src/components/ParfumCard.tsx — Carte parfum réutilisable (4 modes)
// compact (rangées horizontales), comfortable (grille 2 col), compactPlus (grille dense), list

import { useMemo, useState } from 'react';
import { View, Text, Pressable, StyleSheet } from 'react-native';
import { Image } from 'expo-image';
import { useRouter } from 'expo-router';
import { useTheme, type Theme } from '../theme/ThemeContext';
import type { Parfum } from '../models';
import { setPendingParfum } from '../services/catalog-bridge';
import { translateNote } from '../utils/translate-note';

export type CardMode = 'compact' | 'comfortable' | 'compactPlus' | 'list';

interface Props {
  parfum: Parfum;
  mode?: CardMode;
  onPressOverride?: () => void;
}

function getDiscount(p: Parfum): number | null {
  if (typeof p.referencePrice === 'number' && p.referencePrice > 0 && typeof p.bestPrice === 'number') {
    const d = Math.round((1 - p.bestPrice / p.referencePrice) * 100);
    return d >= 10 ? d : null;
  }
  return null;
}

type PriceTier = 'deal' | 'fair' | 'overpriced' | null;
function getPriceTier(p: Parfum): PriceTier {
  if (typeof p.bestPrice !== 'number' || p.bestPrice <= 0) return null;
  if (typeof p.referencePrice === 'number' && p.referencePrice > 0) {
    const ratio = p.bestPrice / p.referencePrice;
    if (ratio <= 0.8) return 'deal';
    if (ratio >= 1.15) return 'overpriced';
    if (ratio <= 0.95) return 'fair';
  }
  return null;
}

const PALETTE = ['#5B21B6','#1E40AF','#065F46','#92400E','#991B1B','#9D174D','#3730A3','#854D0E'];

function brandColor(brand: string): string {
  let hash = 0;
  for (let i = 0; i < brand.length; i++) hash = brand.charCodeAt(i) + ((hash << 5) - hash);
  return PALETTE[Math.abs(hash) % PALETTE.length];
}

function resolveImageUrl(p: Parfum): string | null {
  return p.imageUrl ?? null;
}

export default function ParfumCard({ parfum, mode = 'comfortable', onPressOverride }: Props) {
  const { theme } = useTheme();
  const s = useMemo(() => getStyles(theme), [theme]);
  const router = useRouter();
  const [imgFailed, setImgFailed] = useState(false);

  const discount = getDiscount(parfum);
  const priceTier = getPriceTier(parfum);
  const bestPrice = parfum.bestPrice ?? null;
  const imageUrl = resolveImageUrl(parfum);
  const hasImage = imageUrl !== null;
  const showImage = hasImage && !imgFailed;
  const tint = brandColor(parfum.marque);
  const imageSource = useMemo(() => (imageUrl ? { uri: imageUrl } : null), [imageUrl]);

  const goToDetail = () => {
    if (onPressOverride) { onPressOverride(); return; }
    setPendingParfum(parfum);
    router.push(`/catalog/${parfum.id}`);
  };

  // ── Mode: compact (rangées horizontales) ──
  if (mode === 'compact') {
    return (
      <Pressable style={s.cardCompact} onPress={goToDetail}>
        {showImage ? (
          <View style={s.imgWrapCompact}>
            <View style={s.imgBgCompact} />
            <Image source={imageSource!} style={s.imgCompact} contentFit="contain" transition={300} onError={() => setImgFailed(true)} />
            {discount !== null && <View style={s.dealBadgeCompact}><Text style={s.dealBadgeTextCompact}>-{discount}%</Text></View>}
          </View>
        ) : (
          <View style={[s.imgPlaceholderCompact, { backgroundColor: tint }]}>
            <Text style={s.placeholderInitCompact}>{parfum.marque.charAt(0).toUpperCase()}</Text>
          </View>
        )}
        <View style={s.headerCompact}>
          <Text style={s.brandCompact} numberOfLines={1}>{parfum.marque}</Text>
          <Text style={s.titleCompact} numberOfLines={2} ellipsizeMode="tail">{parfum.nom}</Text>
        </View>
        <View style={s.priceRowCompact}>
          {bestPrice !== null ? (
            <>
              <Text style={s.priceCompact}>{bestPrice.toFixed(0)} €</Text>
              {parfum.referencePrice && bestPrice < parfum.referencePrice && (
                <Text style={s.priceRefCompact}>{parfum.referencePrice.toFixed(0)} €</Text>
              )}
            </>
          ) : (
            <Text style={s.priceCompactMuted}>— €</Text>
          )}
        </View>
      </Pressable>
    );
  }

  // ── Mode: comfortable (grille 2 col, défaut) ──
  if (mode === 'comfortable') {
    return (
      <Pressable style={s.cardComfortable} onPress={goToDetail}>
        {showImage ? (
          <View style={s.imgWrapComfortable}>
            <View style={s.imgBgComfortable} />
            <Image source={imageSource!} style={s.imgComfortable} contentFit="contain" transition={300} onError={() => setImgFailed(true)} />
            {discount !== null && <View style={s.dealBadge}><Text style={s.dealBadgeText}>-{discount}%</Text></View>}
          </View>
        ) : (
          <View style={[s.imgPlaceholderComfortable, { backgroundColor: tint }]}>
            <Text style={s.placeholderInitComfortable}>{parfum.marque.charAt(0).toUpperCase()}</Text>
          </View>
        )}
        <View style={s.bodyComfortable}>
          <Text style={s.brandComfortable} numberOfLines={1}>{parfum.marque}</Text>
          <Text style={s.titleComfortable} numberOfLines={2} ellipsizeMode="tail">{parfum.nom}</Text>
          {parfum.familleOlactive || parfum.annee ? (
            <View style={s.tags}>
              {parfum.familleOlactive ? (
                <View style={s.tagFamily}><Text style={s.tagFamilyText}>{translateNote(parfum.familleOlactive)}</Text></View>
              ) : null}
              {parfum.annee ? (
                <View style={s.tagYear}><Text style={s.tagYearText}>{parfum.annee}</Text></View>
              ) : null}
            </View>
          ) : null}
          {parfum.notesTete?.length > 0 && (
            <Text style={s.notesText} numberOfLines={1}>{parfum.notesTete!.slice(0, 3).map(translateNote).join(' · ')}</Text>
          )}
          <View style={s.priceRowComfortable}>
            {priceTier && <View style={[s.priceDot, { backgroundColor: theme.colors[priceTier] }]} />}
            {bestPrice !== null ? (
              <>
                <Text style={s.priceComfortable}>{bestPrice.toFixed(0)} €</Text>
                {parfum.referencePrice && bestPrice < parfum.referencePrice && (
                  <Text style={s.priceRefComfortable}>{parfum.referencePrice.toFixed(0)} €</Text>
                )}
              </>
            ) : (
              <Text style={s.priceComfortableMuted}>— €</Text>
            )}
          </View>
        </View>
      </Pressable>
    );
  }

  // ── Mode: compactPlus (grille 2 col dense) ──
  if (mode === 'compactPlus') {
    return (
      <Pressable style={s.cardCompactPlus} onPress={goToDetail}>
        {showImage ? (
          <View style={s.imgWrapCompactPlus}>
            <View style={s.imgBgCompactPlus} />
            <Image source={imageSource!} style={s.imgCompactPlus} contentFit="contain" transition={300} onError={() => setImgFailed(true)} />
            {discount !== null && <View style={s.dealBadgeCompactPlus}><Text style={s.dealBadgeTextCompactPlus}>-{discount}%</Text></View>}
          </View>
        ) : (
          <View style={[s.imgPlaceholderCompactPlus, { backgroundColor: tint }]}>
            <Text style={s.placeholderInitCompactPlus}>{parfum.marque.charAt(0).toUpperCase()}</Text>
          </View>
        )}
        <View style={s.bodyCompactPlus}>
          <Text style={s.brandCompactPlus} numberOfLines={1}>{parfum.marque}</Text>
          <Text style={s.titleCompactPlus} numberOfLines={1} ellipsizeMode="tail">{parfum.nom}</Text>
          <View style={s.priceRowCompactPlus}>
            {priceTier && <View style={[s.priceDotSmall, { backgroundColor: theme.colors[priceTier] }]} />}
            {bestPrice !== null ? (
              <>
                <Text style={s.priceCompactPlus}>{bestPrice.toFixed(0)} €</Text>
                {parfum.referencePrice && bestPrice < parfum.referencePrice && (
                  <Text style={s.priceRefCompactPlus}>{parfum.referencePrice.toFixed(0)} €</Text>
                )}
              </>
            ) : (
              <Text style={s.priceCompactPlusMuted}>— €</Text>
            )}
          </View>
        </View>
      </Pressable>
    );
  }

  // ── Mode: list ──
  if (mode === 'list') {
    return (
      <Pressable style={s.cardList} onPress={goToDetail}>
        {showImage ? (
          <View style={s.imgWrapList}>
            <Image source={imageSource!} style={s.imgList} contentFit="contain" transition={300} onError={() => setImgFailed(true)} />
          </View>
        ) : (
          <View style={[s.imgPlaceholderList, { backgroundColor: tint }]}>
            <Text style={s.placeholderInitList}>{parfum.marque.charAt(0).toUpperCase()}</Text>
          </View>
        )}
        <View style={s.bodyList}>
          <Text style={s.brandList} numberOfLines={1}>{parfum.marque}</Text>
          <Text style={s.titleList} numberOfLines={1} ellipsizeMode="tail">{parfum.nom}</Text>
          <View style={s.tagsList}>
            {parfum.familleOlactive ? (
              <View style={s.tagFamily}><Text style={s.tagFamilyText}>{translateNote(parfum.familleOlactive)}</Text></View>
            ) : null}
            {parfum.annee ? (
              <View style={s.tagYear}><Text style={s.tagYearText}>{parfum.annee}</Text></View>
            ) : null}
          </View>
        </View>
        <View style={s.priceColList}>
          <View style={s.priceRowList}>
            {priceTier && <View style={[s.priceDotSmall, { backgroundColor: theme.colors[priceTier] }]} />}
            {bestPrice !== null ? (
              <Text style={s.priceList}>{bestPrice.toFixed(0)} €</Text>
            ) : (
              <Text style={s.priceListMuted}>— €</Text>
            )}
          </View>
          {parfum.referencePrice && bestPrice && bestPrice < parfum.referencePrice && (
            <Text style={s.priceRefList}>{parfum.referencePrice.toFixed(0)} €</Text>
          )}
        </View>
      </Pressable>
    );
  }

  return null;
}

function getStyles(t: Theme) {
  return {
    // ── Shared ──
    tagFamily: { backgroundColor: t.colors.violetSoft, paddingHorizontal: 8, paddingVertical: 3, borderRadius: 20 },
    tagFamilyText: { fontSize: 10, fontFamily: 'Inter_500Medium', color: t.colors.violetInk },
    tagYear: { backgroundColor: t.colors.rewardSoft, paddingHorizontal: 8, paddingVertical: 3, borderRadius: 20 },
    tagYearText: { fontSize: 10, fontFamily: 'Inter_500Medium', color: t.colors.reward },
    priceDot: { width: 8, height: 8, borderRadius: 4, marginRight: 4 },
    priceDotSmall: { width: 7, height: 7, borderRadius: 3.5, marginRight: 4 },

    // ── Compact (horizontal rows) ──
    cardCompact: {
      width: 140, borderRadius: t.radius.card, backgroundColor: t.colors.surface,
      overflow: 'hidden', ...t.shadow.card, marginBottom: 2,
    },
    imgWrapCompact: { position: 'relative', height: 186, overflow: 'hidden', backgroundColor: t.colors.surface },
    imgBgCompact: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: t.colors.surface },
    imgCompact: { width: '100%', height: '100%', backgroundColor: t.colors.surface },
    imgPlaceholderCompact: { width: '100%', height: 186, justifyContent: 'center', alignItems: 'center' },
    placeholderInitCompact: { fontSize: 48, fontFamily: 'Inter_700Bold', color: '#FFFFFF', opacity: 0.5 },
    dealBadgeCompact: { position: 'absolute', top: 8, left: 8, backgroundColor: t.colors.deal, paddingHorizontal: 6, paddingVertical: 3, borderRadius: 6 },
    dealBadgeTextCompact: { color: '#FFFFFF', fontFamily: 'Inter_600SemiBold', fontSize: 10 },
    headerCompact: { padding: 10, paddingBottom: 2 },
    brandCompact: { fontSize: 10, textTransform: 'uppercase', letterSpacing: 1, color: t.colors.textMuted, fontFamily: 'Inter_400Regular' },
    titleCompact: { fontFamily: 'PlayfairDisplay_600SemiBold', fontSize: 14, color: t.colors.text, lineHeight: 18 },
    priceRowCompact: { flexDirection: 'row', alignItems: 'baseline', paddingHorizontal: 10, paddingBottom: 10, gap: 4 },
    priceCompact: { fontFamily: 'Inter_700Bold', fontSize: 14, color: t.colors.text },
    priceRefCompact: { fontFamily: 'Inter_400Regular', fontSize: 11, color: t.colors.textMuted, textDecorationLine: 'line-through' },
    priceCompactMuted: { fontFamily: 'Inter_400Regular', fontSize: 14, color: t.colors.textMuted },

    // ── Comfortable (grid 2 col) ──
    cardComfortable: {
      borderRadius: t.radius.card, backgroundColor: t.colors.surface,
      overflow: 'hidden', borderWidth: 1, borderColor: t.colors.border,
    },
    imgWrapComfortable: { position: 'relative', aspectRatio: 3/4, overflow: 'hidden', backgroundColor: t.colors.surface },
    imgBgComfortable: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: t.colors.surface },
    imgComfortable: { width: '100%', height: '100%', backgroundColor: t.colors.surface },
    imgPlaceholderComfortable: { aspectRatio: 3/4, justifyContent: 'center', alignItems: 'center' },
    placeholderInitComfortable: { fontSize: 56, fontFamily: 'Inter_700Bold', color: '#FFFFFF', opacity: 0.5 },
    dealBadge: { position: 'absolute', top: 8, left: 8, backgroundColor: t.colors.deal, paddingHorizontal: 8, paddingVertical: 4, borderRadius: 6 },
    dealBadgeText: { color: '#FFFFFF', fontFamily: 'Inter_600SemiBold', fontSize: 11 },
    bodyComfortable: { padding: 10 },
    brandComfortable: { fontSize: 11, textTransform: 'uppercase', letterSpacing: 1.5, color: t.colors.textMuted, fontFamily: 'Inter_400Regular', marginBottom: 2 },
    titleComfortable: { fontFamily: 'PlayfairDisplay_600SemiBold', fontSize: 16, color: t.colors.text, lineHeight: 19, marginBottom: 6 },
    tags: { flexDirection: 'row', gap: 5, flexWrap: 'wrap', marginBottom: 4 },
    notesText: { fontSize: 11, color: t.colors.textMuted, fontFamily: 'Inter_400Regular', marginBottom: 6 },
    priceRowComfortable: { flexDirection: 'row', alignItems: 'baseline', gap: 0 },
    priceComfortable: { fontFamily: 'Inter_700Bold', fontSize: 17, color: t.colors.text },
    priceRefComfortable: { fontFamily: 'Inter_400Regular', fontSize: 11, color: t.colors.textMuted, textDecorationLine: 'line-through', marginLeft: 4 },
    priceComfortableMuted: { fontFamily: 'Inter_400Regular', fontSize: 17, color: t.colors.textMuted },

    // ── CompactPlus (grid dense) ──
    cardCompactPlus: {
      borderRadius: t.radius.base, backgroundColor: t.colors.surface,
      overflow: 'hidden', borderWidth: 1, borderColor: t.colors.border,
    },
    imgWrapCompactPlus: { position: 'relative', height: 90, overflow: 'hidden', backgroundColor: t.colors.surface },
    imgBgCompactPlus: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: t.colors.surface },
    imgCompactPlus: { width: '100%', height: '100%', backgroundColor: t.colors.surface },
    imgPlaceholderCompactPlus: { width: '100%', height: 90, justifyContent: 'center', alignItems: 'center' },
    placeholderInitCompactPlus: { fontSize: 32, fontFamily: 'Inter_700Bold', color: '#FFFFFF', opacity: 0.5 },
    dealBadgeCompactPlus: { position: 'absolute', top: 4, left: 4, backgroundColor: t.colors.deal, paddingHorizontal: 5, paddingVertical: 2, borderRadius: 4 },
    dealBadgeTextCompactPlus: { color: '#FFFFFF', fontFamily: 'Inter_600SemiBold', fontSize: 9 },
    bodyCompactPlus: { padding: 8 },
    brandCompactPlus: { fontSize: 10, textTransform: 'uppercase', letterSpacing: 0.8, color: t.colors.textMuted, fontFamily: 'Inter_400Regular' },
    titleCompactPlus: { fontFamily: 'PlayfairDisplay_600SemiBold', fontSize: 13, color: t.colors.text, lineHeight: 16, marginBottom: 6 },
    priceRowCompactPlus: { flexDirection: 'row', alignItems: 'baseline' },
    priceCompactPlus: { fontFamily: 'Inter_700Bold', fontSize: 14, color: t.colors.text },
    priceRefCompactPlus: { fontFamily: 'Inter_400Regular', fontSize: 10, color: t.colors.textMuted, textDecorationLine: 'line-through', marginLeft: 3 },
    priceCompactPlusMuted: { fontFamily: 'Inter_400Regular', fontSize: 14, color: t.colors.textMuted },

    // ── List ──
    cardList: {
      flexDirection: 'row', alignItems: 'center',
      borderRadius: t.radius.base, backgroundColor: t.colors.surface,
      padding: 10, gap: 12,
      borderWidth: 1, borderColor: t.colors.border,
    },
    imgWrapList: { width: 56, height: 74, borderRadius: t.radius.sm, overflow: 'hidden', backgroundColor: t.colors.surface },
    imgList: { width: '100%', height: '100%', backgroundColor: t.colors.surface },
    imgPlaceholderList: { width: 56, height: 74, borderRadius: t.radius.sm, justifyContent: 'center', alignItems: 'center' },
    placeholderInitList: { fontSize: 24, fontFamily: 'Inter_700Bold', color: '#FFFFFF', opacity: 0.5 },
    bodyList: { flex: 1, minWidth: 0 },
    brandList: { fontSize: 11, textTransform: 'uppercase', letterSpacing: 1, color: t.colors.textMuted, fontFamily: 'Inter_400Regular' },
    titleList: { fontFamily: 'PlayfairDisplay_600SemiBold', fontSize: 15, color: t.colors.text, marginBottom: 4 },
    tagsList: { flexDirection: 'row', gap: 4, flexWrap: 'wrap' },
    priceColList: { alignItems: 'flex-end', flexShrink: 0 },
    priceRowList: { flexDirection: 'row', alignItems: 'baseline' },
    priceList: { fontFamily: 'Inter_700Bold', fontSize: 16, color: t.colors.text },
    priceListMuted: { fontFamily: 'Inter_400Regular', fontSize: 16, color: t.colors.textMuted },
    priceRefList: { fontFamily: 'Inter_400Regular', fontSize: 11, color: t.colors.textMuted, textDecorationLine: 'line-through', marginTop: 2 },

  } as const;
}
