// app/catalog/[id].tsx — Fiche détail parfum

import { useState, useEffect } from 'react';
import { View, Text, ScrollView, Image, Pressable, ActivityIndicator, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useAuthContext } from '../../src/contexts/AuthContext';
import { getParfumById } from '../../src/services/firestore';
import { isParfumFavori, addFavori, removeFavori } from '../../src/services/user-data';
import { theme } from '../../src/theme/theme';
import type { Parfum } from '../../src/models';

function PyramidSection({ label, notes, color, chipBg, chipCl, lblCl, last }: { label: string; notes: string[]; color: any; chipBg: any; chipCl: any; lblCl: string; last?: boolean }) {
  return <View style={[s.pyramidSection, last && { borderLeftColor: 'transparent', paddingBottom: 0 }]}><View style={[s.pyramidDot, color]} /><Text style={[s.pyramidLabel, { color: lblCl }]}>{label}</Text><View style={s.pyramidNotes}>{notes.map(n => <View key={n} style={[s.noteChip, chipBg]}><Text style={[s.noteChipText, chipCl]}>{n}</Text></View>)}</View></View>;
}

export default function CatalogDetailPage() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const { user, isAuthenticated } = useAuthContext();
  const [parfum, setParfum] = useState<Parfum | null>(null);
  const [loading, setLoading] = useState(true);
  const [isFav, setIsFav] = useState(false);
  const [favoriId, setFavoriId] = useState<string | null>(null);

  useEffect(() => { if (id) getParfumById(id as string).then(p => { setParfum(p ?? null); setLoading(false); }); }, [id]);
  useEffect(() => { if (user?.uid && id) isParfumFavori(user.uid, id as string).then(r => { setIsFav(r.isFavori); setFavoriId(r.favoriId); }); }, [user?.uid, id]);

  const toggleFav = async () => {
    if (!isAuthenticated) { router.push('/auth/login'); return; }
    if (!user?.uid || !id) return;
    if (isFav && favoriId) { await removeFavori(user.uid, favoriId); setIsFav(false); setFavoriId(null); }
    else { const fid = await addFavori(user.uid, id as string); setIsFav(true); setFavoriId(fid); }
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
          </View>
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
