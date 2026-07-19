// src/features/catalog/CatalogPage.tsx — Catalogue avec navigation par famille olfactive
// La recherche est geree par la barre persistante (index.tsx) et l'ecran de recherche (search.tsx)

import { useState, useEffect, useMemo } from 'react';
import { View, Text, FlatList, ActivityIndicator, Pressable, ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Link, useRouter } from 'expo-router';
import Ionicons from '@react-native-vector-icons/ionicons/static';
import { useAuthContext } from '../../contexts/AuthContext';
import ParfumCard from '../../components/ParfumCard';
import ProfileAvatar from '../../components/ProfileAvatar';
import { getPopularParfums, getPersonalizedSuggestions } from '../../services/firestore';
import { setPendingCatalogQuery, consumePendingCatalogQuery } from '../../services/catalog-bridge';
import { useTheme, type Theme } from '../../theme/ThemeContext';
import type { Parfum } from '../../models';

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

interface Props {
  onScroll?: (y: number) => void;
}

export default function CatalogPage({ onScroll }: Props) {
  const { theme, resolvedMode } = useTheme();
  const s = useMemo(() => getStyles(theme), [theme]);
  const { user, authReady, isAuthenticated } = useAuthContext();
  const router = useRouter();
  const [activeFamily, setActiveFamily] = useState<string | null>(null);
  const [suggestionParfums, setSuggestionParfums] = useState<Parfum[]>([]);
  const [suggestionLabel, setSuggestionLabel] = useState('Parfums populaires');
  const [suggestionLoading, setSuggestionLoading] = useState(true);

  useEffect(() => {
    const pending = consumePendingCatalogQuery();
    if (pending && pending.trim().length >= 3) {
      setPendingCatalogQuery(pending);
      router.push(`/(tabs)/search?q=${encodeURIComponent(pending)}`);
    }
  }, []);

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

  return (
    <SafeAreaView edges={['bottom']} style={s.container}>
      {authReady && !isAuthenticated && (
        <View style={s.banner}>
          <Ionicons name="heart-outline" size={20} color={theme.colors.primary} />
          <Text style={s.bannerText}>Connectez-vous pour sauvegarder vos parfums préférés</Text>
          <Link href="/auth/login" style={s.bannerLink}>
            <Text style={s.bannerLinkText}>Connexion</Text>
          </Link>
        </View>
      )}

      <View style={s.headerBar}>
        <View style={{ flex: 1 }}>
          <Text style={s.heroTitle}>ParfumScan</Text>
          <Text style={s.heroSub}>Trouve ton parfum au meilleur prix</Text>
        </View>
        <ProfileAvatar />
      </View>

      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={s.familyScroll} contentContainerStyle={s.familyChips}>
        {FAMILIES.map(f => (
          <Pressable
            key={f.label}
            style={[s.chip, activeFamily === f.query && s.chipActive]}
            onPress={() => {
              setActiveFamily(f.query);
              if (f.query) {
                router.push(`/(tabs)/search?q=${encodeURIComponent(f.query)}`);
              }
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

      {suggestionLoading ? (
        <View style={s.ghostSection}><Text style={s.ghostLabel}>{suggestionLabel}</Text><ActivityIndicator style={{ marginTop: 20 }} color={theme.colors.primary} /></View>
      ) : (
        <FlatList
          key={`suggestions-${resolvedMode}`}
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
          onScroll={onScroll ? (e) => onScroll(e.nativeEvent.contentOffset.y) : undefined}
          scrollEventThrottle={16}
        />
      )}
    </SafeAreaView>
  );
}

function getStyles(t: Theme) {
  return {
    container: { flex: 1, backgroundColor: t.colors.background },
    banner: { flexDirection: 'row', alignItems: 'center', backgroundColor: t.colors.primarySoft, padding: 12, gap: 8 },
    bannerText: { flex: 1, fontFamily: 'Inter_400Regular', fontSize: 13, color: t.colors.primaryInk },
    bannerLink: { backgroundColor: t.colors.primary, paddingHorizontal: 12, paddingVertical: 6, borderRadius: t.radius.sm },
    bannerLinkText: { color: '#FFFFFF', fontFamily: 'Inter_600SemiBold', fontSize: 13 },
    headerBar: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, paddingTop: 8, paddingBottom: 12 },
    heroTitle: { fontFamily: 'PlayfairDisplay_700Bold', fontSize: 28, color: t.colors.text },
    heroSub: { fontFamily: 'Inter_400Regular', fontSize: 14, color: t.colors.textMuted, marginTop: 4 },
    familyScroll: { maxHeight: 44, marginBottom: 4 },
    familyChips: { paddingHorizontal: 16, gap: 8, alignItems: 'center' },
    chip: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 14, paddingVertical: 8, borderRadius: 20, backgroundColor: t.colors.surface2, borderWidth: 1, borderColor: 'transparent' },
    chipActive: { backgroundColor: t.colors.primarySoft, borderColor: t.colors.primary },
    chipText: { fontFamily: 'Inter_500Medium', fontSize: 13, color: t.colors.textMuted },
    chipTextActive: { color: t.colors.primaryInk },
    ghostSection: { padding: 16 },
    ghostLabel: { fontFamily: 'Inter_600SemiBold', fontSize: 13, textTransform: 'uppercase', letterSpacing: 1.5, color: t.colors.textMuted, marginBottom: 12 },
    popularRow: { gap: 8, marginBottom: 8 },
    popularCardWrap: { flex: 1, maxWidth: '50%' },
  } as const;
}
