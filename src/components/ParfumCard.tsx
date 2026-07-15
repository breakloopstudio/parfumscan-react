// src/components/ParfumCard.tsx — Carte parfum réutilisable

import { View, Text, Image, Pressable, Linking, StyleSheet } from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { theme } from '../theme/theme';
import type { Parfum } from '../models';
import type { ParfumSearchResult } from '../services/fragella';
import { setPendingParfum } from '../services/catalog-bridge';
import { translateNote } from '../utils/translate-note';

interface Props { parfum: Parfum | ParfumSearchResult; showDeal?: boolean; onPressOverride?: () => void; }

function getDiscount(p: Parfum | ParfumSearchResult): number | null {
  if (typeof p.discountPct === 'number') return Math.round(p.discountPct);
  if (typeof p.bestPrice === 'number' && typeof p.referencePrice === 'number' && p.referencePrice > 0) {
    return Math.round((1 - p.bestPrice / p.referencePrice) * 100);
  }
  return null;
}

export default function ParfumCard({ parfum, showDeal = false, onPressOverride }: Props) {
  const router = useRouter();
  const discount = getDiscount(parfum);
  const bestPrice = parfum.bestPrice ?? null;

  const goToDetail = () => {
    if (onPressOverride) {
      onPressOverride();
      return;
    }
    setPendingParfum(parfum);
    router.push(`/catalog/${parfum.id}`);
  };

  return (
    <Pressable style={s.card} onPress={goToDetail}>
        {parfum.imageUrl && (
          <View style={s.imgWrap}>
            <Image source={{ uri: parfum.imageUrl }} style={s.img} />
            <View style={s.imgOverlay} />
            {discount !== null && <View style={s.dealBadge}><Text style={s.dealBadgeText}>-{discount}%</Text></View>}
          </View>
        )}
        <View style={s.header}>
          <Text style={s.brand}>{parfum.marque}</Text>
          <Text style={s.title}>{parfum.nom}</Text>
        </View>
        <View style={s.body}>
          <View style={s.tags}>
            <View style={s.tagFamily}><Text style={s.tagFamilyText}>{translateNote(parfum.familleOlactive)}</Text></View>
            {parfum.annee && <View style={s.tagYear}><Text style={s.tagYearText}>{parfum.annee}</Text></View>}
          </View>
          {parfum.notesTete.length > 0 && (
            <View style={s.notes}>
              <Text style={s.notesLabel}>Tête</Text>
              <Text style={s.notesText}>{parfum.notesTete.slice(0, 3).map(translateNote).join(' · ')}</Text>
            </View>
          )}
        </View>
        {showDeal && (
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

const s = StyleSheet.create({
  card: {
    marginHorizontal: 16, marginVertical: 6,
    borderRadius: theme.radius.card, backgroundColor: theme.colors.surface,
    overflow: 'hidden', ...theme.shadow.card,
  },
  imgWrap: { position: 'relative', maxHeight: 180, overflow: 'hidden' },
  img: { width: '100%', height: 180, resizeMode: 'cover' },
  imgOverlay: { position: 'absolute', bottom: 0, left: 0, right: 0, height: 60, backgroundColor: 'rgba(0,0,0,0.1)' },
  dealBadge: {
    position: 'absolute', top: 12, right: 12,
    backgroundColor: theme.colors.reward, paddingHorizontal: 10, paddingVertical: 5, borderRadius: 20,
  },
  dealBadgeText: { color: '#1F1A2E', fontWeight: '800', fontSize: 13 },
  header: { padding: 16, paddingBottom: 0 },
  brand: { fontSize: 12, textTransform: 'uppercase', letterSpacing: 1.5, color: theme.colors.textMuted, marginBottom: 2 },
  title: { fontFamily: 'PlayfairDisplay_600SemiBold', fontSize: 18, color: theme.colors.text },
  body: { paddingHorizontal: 16, paddingTop: 8, paddingBottom: 8 },
  tags: { flexDirection: 'row', gap: 8, flexWrap: 'wrap', marginBottom: 6 },
  tagFamily: { backgroundColor: theme.colors.violetSoft, paddingHorizontal: 10, paddingVertical: 4, borderRadius: 20 },
  tagFamilyText: { fontSize: 11, fontWeight: '500', color: theme.colors.violetInk },
  tagYear: { backgroundColor: theme.colors.rewardSoft, paddingHorizontal: 10, paddingVertical: 4, borderRadius: 20 },
  tagYearText: { fontSize: 11, fontWeight: '500', color: theme.colors.reward },
  notes: { flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 2 },
  notesLabel: { fontSize: 10, textTransform: 'uppercase', letterSpacing: 1, color: theme.colors.reward, backgroundColor: theme.colors.rewardSoft, paddingHorizontal: 8, paddingVertical: 2, borderRadius: 10 },
  notesText: { fontSize: 12, color: theme.colors.textMuted, flex: 1 },
  dealZone: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    padding: 12, borderTopWidth: 1, borderTopColor: theme.colors.border, backgroundColor: theme.colors.dealSoft,
  },
  dealPrice: { flexDirection: 'row', alignItems: 'baseline', gap: 6 },
  dealFrom: { fontSize: 11, color: theme.colors.textMuted },
  dealAmount: { fontSize: 18, fontWeight: '800', color: theme.colors.deal },
  dealRef: { fontSize: 12, color: theme.colors.textMuted, textDecorationLine: 'line-through' },
  dealTeaser: { fontSize: 14, fontWeight: '600', color: theme.colors.text },
  dealCta: { flexDirection: 'row', alignItems: 'center', gap: 2 },
  dealCtaText: { fontSize: 13, fontWeight: '700', color: theme.colors.primary },
  dealCtaGhost: { fontSize: 13, fontWeight: '600', color: theme.colors.textMuted },
});
