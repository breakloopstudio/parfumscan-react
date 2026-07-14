// app/catalog/[id].tsx — Fiche détail parfum

import { useState, useEffect } from 'react';
import { View, Text, ScrollView, Image, Pressable, ActivityIndicator, Linking, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useAuthContext } from '../../src/contexts/AuthContext';
import { getParfumById, cacheParfumFromSearch } from '../../src/services/firestore';
import { isParfumFavori, addFavori, removeFavori } from '../../src/services/user-data';
import { consumePendingParfum } from '../../src/services/catalog-bridge';
import type { ParfumSearchResult } from '../../src/services/fragella';
import { theme } from '../../src/theme/theme';
import type { Parfum } from '../../src/models';

function PyramidSection({ label, notes, color, chipBg, chipCl, lblCl, last }: { label: string; notes: string[]; color: any; chipBg: any; chipCl: any; lblCl: string; last?: boolean }) {
  return <View style={[s.pyramidSection, last && { borderLeftColor: 'transparent', paddingBottom: 0 }]}><View style={[s.pyramidDot, color]} /><Text style={[s.pyramidLabel, { color: lblCl }]}>{label}</Text><View style={s.pyramidNotes}>{(notes || []).map(n => <View key={n} style={[s.noteChip, chipBg]}><Text style={[s.noteChipText, chipCl]}>{n}</Text></View>)}</View></View>;
}

export default function CatalogDetailPage() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const { user, isAuthenticated } = useAuthContext();
  const [parfum, setParfum] = useState<Parfum | ParfumSearchResult | null>(null);
  const [loading, setLoading] = useState(true);
  const [isFav, setIsFav] = useState(false);
  const [favoriId, setFavoriId] = useState<string | null>(null);

  useEffect(() => {
    if (!id) return;
    // 1. Priorité au pont inter-écrans (données du catalogue/search)
    const pending = consumePendingParfum();
    if (pending && pending.id === id) {
      setParfum(pending);
      setLoading(false);
      return;
    }
    // 2. Fallback : cherche dans Firestore (deep link, favoris, etc.)
    getParfumById(id as string).then(p => { setParfum(p ?? null); setLoading(false); });
  }, [id]);
  useEffect(() => { if (user?.uid && id) isParfumFavori(user.uid, id as string).then(r => { setIsFav(r.isFavori); setFavoriId(r.favoriId); }); }, [user?.uid, id]);

  const toggleFav = async () => {
    if (!isAuthenticated) { router.push('/auth/login'); return; }
    if (!user?.uid || !id || !parfum) return;
    if (isFav && favoriId) { await removeFavori(user.uid, favoriId); setIsFav(false); setFavoriId(null); }
    else {
      // S'assurer que le parfum est caché AVANT d'ajouter le favori
      if (!('createdAt' in parfum)) {
        try { await cacheParfumFromSearch(parfum as ParfumSearchResult); }
        catch (e) { console.warn('[cache] Échec cache parfum, ajout favori quand même:', (e as Error)?.message); }
      }
      const fid = await addFavori(user.uid, id as string, parfum.nom, parfum.marque);
      setIsFav(true); setFavoriId(fid);
    }
  };

  if (loading) return <View style={s.center}><ActivityIndicator size="large" color={theme.colors.primary} /></View>;
  if (!parfum) return <View style={s.center}><Text style={{color:theme.colors.textMuted}}>Parfum introuvable.</Text></View>;

  return (
    <SafeAreaView style={s.container}>
      <ScrollView>
        {parfum.imageUrl && <Image source={{ uri: parfum.imageUrl }} style={s.heroImg} />}
        <View style={s.card}>
          <View style={s.titleRow}>
            <View style={{flex:1}}><Text style={s.brand}>{parfum.marque}</Text><Text style={s.name}>{parfum.nom}</Text></View>
            <Pressable onPress={toggleFav} hitSlop={12}><Ionicons name={isFav?'heart':'heart-outline'} size={28} color={isFav?theme.colors.danger:theme.colors.textMuted}/></Pressable>
          </View>
          <View style={s.badges}>
            <View style={s.tagFamily}><Text style={s.tagFamilyText}>{parfum.familleOlactive}</Text></View>
            {parfum.annee && <View style={s.tagYear}><Text style={s.tagYearText}>{parfum.annee}</Text></View>}
            {'gender' in parfum && parfum.gender && <View style={s.tagGender}><Text style={s.tagGenderText}>{parfum.gender === 'men' ? '👨 Homme' : parfum.gender === 'women' ? '👩 Femme' : '🧑 Unisexe'}</Text></View>}
          </View>
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
                    {parfum.priceValue === 'overpriced' ? '💸 Surcôté' : parfum.priceValue === 'fair' ? '⚖️ Prix correct' : '🎯 Bonne affaire'}
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
          <View style={s.pyramid}>
            <PyramidSection label="Notes de Tête" notes={parfum.notesTete} color={s.topDot} chipBg={s.topChip} chipCl={s.topChipText} lblCl="#059669" />
            <PyramidSection label="Notes de Cœur" notes={parfum.notesCoeur} color={s.heartDot} chipBg={s.heartChip} chipCl={s.heartChipText} lblCl="#D97706" />
            <PyramidSection label="Notes de Fond" notes={parfum.notesFond} color={s.baseDot} chipBg={s.baseChip} chipCl={s.baseChipText} lblCl="#7C3AED" last />
          </View>
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
  pyramid: { gap: 0 },
  pyramidSection: { paddingLeft: 16, paddingBottom: 12, borderLeftWidth: 2, borderLeftColor: theme.colors.border, position: 'relative' },
  pyramidDot: { width: 10, height: 10, borderRadius: 5, position: 'absolute', left: -6, top: 2 },
  pyramidLabel: { fontSize: 13, fontWeight: '600', marginBottom: 8, marginLeft: 8 },
  pyramidNotes: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  noteChip: { paddingHorizontal: 12, paddingVertical: 4, borderRadius: 14 },
  noteChipText: { fontSize: 12, fontWeight: '500' },
  topDot: { backgroundColor: '#A7F3D0' },
  heartDot: { backgroundColor: '#FDE68A' },
  baseDot: { backgroundColor: '#DDD6FE' },
  topChip: { backgroundColor: '#ECFDF5' },
  topChipText: { color: '#065F46' },
  heartChip: { backgroundColor: '#FFFBEB' },
  heartChipText: { color: '#92400E' },
  baseChip: { backgroundColor: '#F5F3FF' },
  baseChipText: { color: '#5B21B6' },
});
