// src/components/ParfumCard.tsx — Carte parfum réutilisable

import { useMemo, useState } from 'react';
import { View, Text, Pressable, Linking, StyleSheet } from 'react-native';
import { Image } from 'expo-image';
import { useRouter } from 'expo-router';
import Ionicons from "@react-native-vector-icons/ionicons/static";
import { useTheme, type Theme } from '../theme/ThemeContext';
import type { Parfum } from '../models';
import type { ParfumSearchResult } from '../services/fragella';
import { setPendingParfum } from '../services/catalog-bridge';
import { translateNote } from '../utils/translate-note';

interface Props { parfum: Parfum | ParfumSearchResult; showDeal?: boolean; compact?: boolean; onPressOverride?: () => void; }

function getDiscount(p: Parfum | ParfumSearchResult): number | null {
  if (typeof p.discountPct === 'number') return Math.round(p.discountPct);
  if (typeof p.bestPrice === 'number' && typeof p.referencePrice === 'number' && p.referencePrice > 0) {
    return Math.round((1 - p.bestPrice / p.referencePrice) * 100);
  }
  return null;
}

const PALETTE = ['#5B21B6','#1E40AF','#065F46','#92400E','#991B1B','#9D174D','#3730A3','#854D0E'];

function brandColor(brand: string): string {
  let hash = 0;
  for (let i = 0; i < brand.length; i++) hash = brand.charCodeAt(i) + ((hash << 5) - hash);
  return PALETTE[Math.abs(hash) % PALETTE.length];
}

function resolveImageUrl(p: Parfum | ParfumSearchResult): string | null {
  if (p.imageUrl) return p.imageUrl;
  if (p.imageUrlTransparent) return p.imageUrlTransparent;
  if (p.imageFallbacks && p.imageFallbacks.length > 0) return p.imageFallbacks[0];
  return null;
}

export default function ParfumCard({ parfum, showDeal = false, compact = false, onPressOverride }: Props) {
  const { theme } = useTheme();
  const s = useMemo(() => getStyles(theme), [theme]);
  const router = useRouter();
  const [imgFailed, setImgFailed] = useState(false);
  const discount = getDiscount(parfum);
  const bestPrice = parfum.bestPrice ?? null;
  const imageUrl = resolveImageUrl(parfum);
  const hasImage = imageUrl !== null;
  const showImage = hasImage && !imgFailed;
  const tint = brandColor(parfum.marque);

  const goToDetail = () => {
    if (onPressOverride) {
      onPressOverride();
      return;
    }
    setPendingParfum(parfum);
    router.push(`/catalog/${parfum.id}`);
  };

  return (
    <Pressable style={compact ? s.cardCompact : s.card} onPress={goToDetail}>
        {showImage ? (
          <View style={compact ? s.imgWrapCompact : s.imgWrap}>
            <Image source={{ uri: imageUrl }} style={compact ? s.imgCompact : s.img} contentFit="cover" transition={300} onError={() => setImgFailed(true)} />
            <View style={s.imgOverlay} />
            {discount !== null && <View style={compact ? s.dealBadgeCompact : s.dealBadge}><Text style={compact ? s.dealBadgeTextCompact : s.dealBadgeText}>-{discount}%</Text></View>}
          </View>
        ) : (
          <View style={[compact ? s.imgPlaceholderCompact : s.imgPlaceholder, { backgroundColor: tint }]}>
            <Text style={compact ? s.placeholderInitCompact : s.placeholderInit}>
              {parfum.marque.charAt(0).toUpperCase()}
            </Text>
          </View>
        )}
        <View style={compact ? s.headerCompact : s.header}>
          <Text style={compact ? s.brandCompact : s.brand}>{parfum.marque}</Text>
          <Text style={compact ? s.titleCompact : s.title} numberOfLines={compact ? 2 : undefined} ellipsizeMode="tail">{parfum.nom}</Text>
        </View>
        <View style={compact ? s.bodyCompact : s.body}>
          <View style={compact ? s.tagsCompact : s.tags}>
            <View style={compact ? s.tagFamilyCompact : s.tagFamily}><Text style={compact ? s.tagFamilyTextCompact : s.tagFamilyText}>{translateNote(parfum.familleOlactive)}</Text></View>
            {parfum.annee && <View style={compact ? s.tagYearCompact : s.tagYear}><Text style={compact ? s.tagYearTextCompact : s.tagYearText}>{parfum.annee}</Text></View>}
          </View>
          {!compact && parfum.notesTete.length > 0 && (
            <View style={s.notes}>
              <Text style={s.notesLabel}>Tête</Text>
              <Text style={s.notesText}>{parfum.notesTete.slice(0, 3).map(translateNote).join(' · ')}</Text>
            </View>
          )}
        </View>
        {!compact && showDeal && (
          <View style={s.dealZone}>
            <View style={s.dealPrice}>
              {bestPrice !== null ? (
                <>
                  <Text style={s.dealFrom}>Dès</Text>
                  <Text style={s.dealAmount}>{bestPrice.toFixed(2)} €</Text>
                  {parfum.referencePrice && <Text style={s.dealRef}>{parfum.referencePrice.toFixed(2)} €</Text>}
                </>
              ) : (
                <>
                  <Ionicons name="trending-down-outline" size={18} color={theme.colors.deal} />
                  <Text style={s.dealTeaser}>Comparer les prix</Text>
                </>
              )}
            </View>
            {bestPrice !== null && parfum.purchaseUrl ? (
              <Pressable style={s.dealCta} onPress={() => Linking.openURL(parfum.purchaseUrl!)} hitSlop={8}>
                <Text style={s.dealCtaText}>Voir l'offre</Text>
                <Ionicons name="chevron-forward" size={15} color={theme.colors.primary} />
              </Pressable>
            ) : (
              <View style={s.dealCta}>
                <Text style={s.dealCtaGhost}>Bientôt</Text>
                <Ionicons name="chevron-forward" size={15} color={theme.colors.textMuted} />
              </View>
            )}
          </View>
        )}
      </Pressable>
    );
}

function getStyles(t: Theme) {
  return {
    card: {
      marginHorizontal: 16, marginVertical: 6,
      borderRadius: t.radius.card, backgroundColor: t.colors.surface,
      overflow: 'hidden', ...t.shadow.card,
    },
    imgWrap: { position: 'relative', maxHeight: 180, overflow: 'hidden' },
    img: { width: '100%', height: 180, resizeMode: 'cover' },
    imgOverlay: { position: 'absolute', bottom: 0, left: 0, right: 0, height: 60, backgroundColor: 'rgba(0,0,0,0.1)' },
    dealBadge: {
      position: 'absolute', top: 12, right: 12,
      backgroundColor: t.colors.reward, paddingHorizontal: 10, paddingVertical: 5, borderRadius: 20,
    },
    dealBadgeText: { color: '#1F1A2E', fontFamily: 'Inter_800ExtraBold', fontSize: 13 },
    header: { padding: 16, paddingBottom: 0 },
    brand: { fontSize: 12, textTransform: 'uppercase', letterSpacing: 1.5, color: t.colors.textMuted, marginBottom: 2 },
    title: { fontFamily: 'PlayfairDisplay_600SemiBold', fontSize: 18, color: t.colors.text },
    body: { paddingHorizontal: 16, paddingTop: 8, paddingBottom: 8 },
    tags: { flexDirection: 'row', gap: 8, flexWrap: 'wrap', marginBottom: 6 },
    tagFamily: { backgroundColor: t.colors.violetSoft, paddingHorizontal: 10, paddingVertical: 4, borderRadius: 20 },
    tagFamilyText: { fontSize: 11, fontFamily: 'Inter_500Medium', color: t.colors.violetInk },
    tagYear: { backgroundColor: t.colors.rewardSoft, paddingHorizontal: 10, paddingVertical: 4, borderRadius: 20 },
    tagYearText: { fontSize: 11, fontFamily: 'Inter_500Medium', color: t.colors.reward },
    notes: { flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 2 },
    notesLabel: { fontSize: 10, textTransform: 'uppercase', letterSpacing: 1, color: t.colors.reward, backgroundColor: t.colors.rewardSoft, paddingHorizontal: 8, paddingVertical: 2, borderRadius: 10 },
    notesText: { fontSize: 12, color: t.colors.textMuted, flex: 1 },
    dealZone: {
      flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
      padding: 12, borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: t.colors.border, backgroundColor: t.colors.dealSoft,
    },
    dealPrice: { flexDirection: 'row', alignItems: 'baseline', gap: 6 },
    dealFrom: { fontSize: 11, color: t.colors.textMuted },
    dealAmount: { fontSize: 18, fontFamily: 'Inter_800ExtraBold', color: t.colors.deal },
    dealRef: { fontSize: 12, color: t.colors.textMuted, textDecorationLine: 'line-through' },
    dealTeaser: { fontSize: 14, fontFamily: 'Inter_600SemiBold', color: t.colors.text },
    dealCta: { flexDirection: 'row', alignItems: 'center', gap: 2 },
    dealCtaText: { fontSize: 13, fontFamily: 'Inter_700Bold', color: t.colors.primary },
    dealCtaGhost: { fontSize: 13, fontFamily: 'Inter_600SemiBold', color: t.colors.textMuted },
    cardCompact: { margin: 4, borderRadius: t.radius.card, backgroundColor: t.colors.surface, overflow: 'hidden', ...t.shadow.card },
    imgWrapCompact: { position: 'relative', maxHeight: 130, overflow: 'hidden' },
    imgCompact: { width: '100%', height: 130, resizeMode: 'cover' },
    dealBadgeCompact: { position: 'absolute', top: 6, right: 6, backgroundColor: t.colors.reward, paddingHorizontal: 6, paddingVertical: 3, borderRadius: 20 },
    dealBadgeTextCompact: { color: '#1F1A2E', fontFamily: 'Inter_800ExtraBold', fontSize: 10 },
    headerCompact: { padding: 10, paddingBottom: 0 },
    brandCompact: { fontSize: 10, textTransform: 'uppercase', letterSpacing: 1, color: t.colors.textMuted, marginBottom: 1 },
    titleCompact: { fontFamily: 'PlayfairDisplay_600SemiBold', fontSize: 14, color: t.colors.text, lineHeight: 18 },
    bodyCompact: { paddingHorizontal: 10, paddingTop: 4, paddingBottom: 8 },
    tagsCompact: { flexDirection: 'row', gap: 4, flexWrap: 'wrap' },
    tagFamilyCompact: { backgroundColor: t.colors.violetSoft, paddingHorizontal: 6, paddingVertical: 2, borderRadius: 20 },
    tagFamilyTextCompact: { fontSize: 9, fontFamily: 'Inter_500Medium', color: t.colors.violetInk },
    tagYearCompact: { backgroundColor: t.colors.rewardSoft, paddingHorizontal: 6, paddingVertical: 2, borderRadius: 20 },
    tagYearTextCompact: { fontSize: 9, fontFamily: 'Inter_500Medium', color: t.colors.reward },
    imgPlaceholder: { width: '100%', height: 180, justifyContent: 'center', alignItems: 'center' },
    imgPlaceholderCompact: { width: '100%', height: 130, justifyContent: 'center', alignItems: 'center' },
    placeholderInit: { fontSize: 72, fontFamily: 'Inter_700Bold', color: '#FFFFFF', opacity: 0.5 },
    placeholderInitCompact: { fontSize: 48, fontFamily: 'Inter_700Bold', color: '#FFFFFF', opacity: 0.5 },
  } as const;
}