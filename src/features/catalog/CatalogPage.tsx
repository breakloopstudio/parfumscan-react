// app/(tabs)/catalog.tsx — Catalogue avec navigation par famille olfactive

import { useState, useEffect } from 'react';
import { View, Text, TextInput, FlatList, ActivityIndicator, Pressable, ScrollView, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Link, useLocalSearchParams } from 'expo-router';
import Ionicons from '@react-native-vector-icons/ionicons/static';
import { useAuthContext } from '../../contexts/AuthContext';
import { useCatalog } from '../../hooks/useCatalog';
import ParfumCard from '../../components/ParfumCard';
import { getPopularParfums, getPersonalizedSuggestions } from '../../services/firestore';
import { theme } from '../../theme/theme';
import type { ParfumSearchResult } from '../../services/fragella';
import { consumePendingCatalogQuery } from '../../services/catalog-bridge';

const FAMILIES = [
  { label: 'Tous',    icon: 'apps-outline',       query: null },
  { label: 'Frais',   icon: 'leaf-outline',       query: 'fresh' },
  { label: 'Boisé',   icon: 'git-branch-outline',  query: 'woody' },
  { label: 'Oriental',icon: 'moon-outline',       query: 'oriental' },
  { label: 'Floral',  icon: 'flower-outline',     query: 'floral' },
];

function seededShuffle<T>(arr: T[], seed: number): T[] {
  const shuffled = [...arr];
  let s = seed;
  for (let i = shuffled.length - 1; i > 0; i--) {
    s = (s * 16807 + 0) % 2147483647;
    const j = s % (i + 1);
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }
  return shuffled;
}

export default function CatalogPage() {
  const { user, authReady, isAuthenticated } = useAuthContext();
  const { q: routeQuery } = useLocalSearchParams<{ q?: string }>();
  const initialQuery = routeQuery ?? consumePendingCatalogQuery();
  const [searchText, setSearchText] = useState(initialQuery ?? '');
  const { parfums, searching, search, clear } = useCatalog();
  const [suggestionParfums, setSuggestionParfums] = useState<ParfumSearchResult[]>([]);
  const [suggestionLabel, setSuggestionLabel] = useState('Parfums populaires');
  const [suggestionLoading, setSuggestionLoading] = useState(true);
  const [activeFamily, setActiveFamily] = useState<string | null>(null);
  const [sortBy, setSortBy] = useState<'relevant' | 'price-asc' | 'price-desc'>('relevant');
  const handleSearch = (t: string) => { setSearchText(t); t.trim().length >= 3 ? search(t) : clear(); };

  useEffect(() => {
    let cancelled = false;
    const today = Math.floor(Date.now() / 86400000);
    async function load() {
      if (isAuthenticated && user) {
        try {
          const personalized = await getPersonalizedSuggestions(user.uid, 16);
          if (!cancelled && personalized.length > 0) {
            setSuggestionParfums(seededShuffle(personalized, today).slice(0, 8));
            setSuggestionLabel('Pour vous');
            setSuggestionLoading(false);
            return;
          }
        } catch {}
      }
      try {
        const popular = await getPopularParfums(30);
        if (!cancelled) {
          setSuggestionParfums(seededShuffle(popular, today).slice(0, 8));
          setSuggestionLabel('Parfums populaires');
          setSuggestionLoading(false);
        }
      } catch {
        if (!cancelled) { setSuggestionParfums([]); setSuggestionLoading(false); }
      }
    }
    load();
    return () => { cancelled = true; };
  }, [authReady, isAuthenticated, user?.uid]);

  useEffect(() => {
    if (initialQuery && initialQuery.trim().length >= 3) {
      setSearchText(initialQuery);
      search(initialQuery.trim());
    }
  }, [initialQuery]);

  const sortedParfums = [...parfums].sort((a, b) => {
    if (sortBy === 'price-asc') return (a.bestPrice ?? Infinity) - (b.bestPrice ?? Infinity);
    if (sortBy === 'price-desc') return (b.bestPrice ?? Infinity) - (a.bestPrice ?? Infinity);
    return 0;
  });

  return (
    <SafeAreaView edges={['top', 'bottom']} style={s.container}>
      {authReady && !isAuthenticated && (
        <View style={s.banner}>
          <Ionicons name="heart-outline" size={20} color={theme.colors.primary} />
          <Text style={s.bannerText}>Connectez-vous pour sauvegarder vos parfums préférés</Text>
          <Link href="/auth/login" style={s.bannerLink}>
            <Text style={s.bannerLinkText}>Connexion</Text>
          </Link>
        </View>
      )}
      {!searchText && (
        <View style={s.hero}>
          <Ionicons name="sparkles-outline" size={32} color={theme.colors.primary} />
          <Text style={s.heroTitle}>ParfumScan</Text>
          <Text style={s.heroSub}>Trouve ton parfum au meilleur prix</Text>
        </View>
      )}
      <View style={s.searchWrap}>
        <TextInput
          style={s.searchInput}
          placeholder="Rechercher un parfum..."
          placeholderTextColor={theme.colors.textMuted}
          value={searchText}
          onChangeText={handleSearch}
          autoCapitalize="none"
          autoCorrect={false}
        />
      </View>

      {!searchText && (
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={s.familyScroll} contentContainerStyle={s.familyChips}>
          {FAMILIES.map(f => (
              <Pressable
                key={f.label}
                style={[s.chip, activeFamily === f.query && s.chipActive]}
                onPress={() => {
                  setActiveFamily(f.query);
                  if (f.query) handleSearch(f.query);
                  else { setSearchText(''); clear(); }
                }}
              >
              <Ionicons
                name={f.icon as never}
                size={14}
                color={activeFamily === f.query ? theme.colors.primaryInk : theme.colors.textMuted}
              />
              <Text style={[s.chipText, activeFamily === f.query && s.chipTextActive]}>
                {f.label}
              </Text>
            </Pressable>
          ))}
        </ScrollView>
      )}

      {searchText && (
        <View style={s.sortRow}>
          <Text style={s.resultsCount}>{parfums.length} parfum(s)</Text>
          <View style={s.sortBtns}>
            {(['relevant', 'price-asc', 'price-desc'] as const).map(sort => (
              <Pressable
                key={sort}
                style={[s.sortBtn, sortBy === sort && s.sortBtnActive]}
                onPress={() => setSortBy(sort)}
              >
                <Text style={[s.sortBtnText, sortBy === sort && s.sortBtnTextActive]}>
                  {sort === 'relevant' ? 'Pertinence' : sort === 'price-asc' ? 'Prix ↑' : 'Prix ↓'}
                </Text>
              </Pressable>
            ))}
          </View>
        </View>
      )}

      {!searchText ? (
        suggestionLoading ? (
          <View style={s.ghostSection}><Text style={s.ghostLabel}>{suggestionLabel}</Text><ActivityIndicator style={{ marginTop: 20 }} color={theme.colors.primary} /></View>
        ) : (
          <FlatList
            data={suggestionParfums}
            numColumns={2}
            keyExtractor={p => p.id}
            renderItem={({ item }) => (
              <View style={s.popularCardWrap}><ParfumCard parfum={item} compact /></View>
            )}
            columnWrapperStyle={s.popularRow}
            ListHeaderComponent={<Text style={s.ghostLabel}>{suggestionLabel}</Text>}
            contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: 16 }}
            style={{ flex: 1 }}
            showsVerticalScrollIndicator={false}
          />
        )
      ) : (
        <>
          {searching && <ActivityIndicator style={{ marginTop: 12 }} color={theme.colors.primary} />}
          <FlatList
            data={sortedParfums}
            keyExtractor={(p, i) => `${p.id}_${i}`}
            renderItem={({ item }) => <ParfumCard parfum={item} showDeal />}
            contentContainerStyle={{ paddingBottom: 16 }}
            showsVerticalScrollIndicator={false}
            ListEmptyComponent={
              !searching ? (
                <View style={s.empty}>
                  <Ionicons name="search-outline" size={64} color={theme.colors.primary} style={{ opacity: 0.5 }} />
                  <Text style={s.emptyTitle}>Aucun résultat</Text>
                  <Text style={s.emptyDesc}>Essaie une autre orthographe{'\n'}ou scanne un flacon !</Text>
                  <Link href="/(tabs)/scan" style={s.emptyScanBtn}>
                    <Text style={s.emptyScanText}>Scanner un flacon</Text>
                  </Link>
                </View>
              ) : null
            }
          />
        </>
      )}
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: theme.colors.background },
  banner: { flexDirection: 'row', alignItems: 'center', backgroundColor: theme.colors.primarySoft, padding: 12, gap: 8 },
  bannerText: { flex: 1, fontFamily: 'Inter_400Regular', fontSize: 13, color: theme.colors.primaryInk },
  bannerLink: { backgroundColor: theme.colors.primary, paddingHorizontal: 12, paddingVertical: 6, borderRadius: theme.radius.sm },
  bannerLinkText: { color: '#FFFFFF', fontFamily: 'Inter_600SemiBold', fontSize: 13 },
  hero: { alignItems: 'center', paddingTop: 20, paddingBottom: 12 },
  heroTitle: { fontFamily: 'PlayfairDisplay_700Bold', fontSize: 28, color: theme.colors.text },
  heroSub: { fontFamily: 'Inter_400Regular', fontSize: 14, color: theme.colors.textMuted, marginTop: 4 },
  searchWrap: { paddingHorizontal: 16, paddingBottom: 8 },
  searchInput: { borderRadius: theme.radius.base, backgroundColor: theme.colors.surface, borderWidth: 1, borderColor: theme.colors.border, paddingHorizontal: 14, height: 44, fontFamily: 'Inter_400Regular', fontSize: 15, color: theme.colors.text },
  familyScroll: { maxHeight: 44, marginBottom: 4 },
  familyChips: { paddingHorizontal: 16, gap: 8, alignItems: 'center' },
  chip: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 14, paddingVertical: 8, borderRadius: 20, backgroundColor: theme.colors.surface2, borderWidth: 1, borderColor: 'transparent' },
  chipActive: { backgroundColor: theme.colors.primarySoft, borderColor: theme.colors.primary },
  chipText: { fontFamily: 'Inter_500Medium', fontSize: 13, color: theme.colors.textMuted },
  chipTextActive: { color: theme.colors.primaryInk },
  sortRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 16, paddingTop: 4, paddingBottom: 4 },
  sortBtns: { flexDirection: 'row', gap: 4 },
  sortBtn: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 6, backgroundColor: theme.colors.surface2 },
  sortBtnActive: { backgroundColor: theme.colors.primarySoft },
  sortBtnText: { fontFamily: 'Inter_500Medium', fontSize: 12, color: theme.colors.textMuted },
  sortBtnTextActive: { color: theme.colors.primary },
  resultsCount: { fontFamily: 'Inter_400Regular', fontSize: 13, color: theme.colors.textMuted },
  ghostSection: { padding: 16 },
  ghostLabel: { fontFamily: 'Inter_600SemiBold', fontSize: 13, textTransform: 'uppercase', letterSpacing: 1.5, color: theme.colors.textMuted, marginBottom: 12 },
  empty: { alignItems: 'center', paddingTop: 48 },
  emptyTitle: { fontFamily: 'PlayfairDisplay_600SemiBold', fontSize: 20, color: theme.colors.text, marginTop: 12 },
  emptyDesc: { fontFamily: 'Inter_400Regular', fontSize: 14, color: theme.colors.textMuted, textAlign: 'center', lineHeight: 20, marginTop: 8 },
  emptyScanBtn: { marginTop: 20, backgroundColor: theme.colors.primary, paddingHorizontal: 20, paddingVertical: 12, borderRadius: theme.radius.base, ...theme.shadow.button },
  emptyScanText: { color: '#FFFFFF', fontFamily: 'Inter_600SemiBold', fontSize: 16 },
  popularRow: { gap: 8, marginBottom: 8 },
  popularCardWrap: { flex: 1, maxWidth: '50%' },
});
