// app/(tabs)/search.tsx — Overlay recherche plein écran
// Ouvert depuis la barre de recherche persistante (index.tsx) ou les chips famille (CatalogPage)

import { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import { View, Text, TextInput, FlatList, Pressable, ActivityIndicator, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter, useLocalSearchParams } from 'expo-router';
import Ionicons from '@react-native-vector-icons/ionicons/static';
import { useCatalog } from '../../src/hooks/useCatalog';
import ParfumCard from '../../src/components/ParfumCard';
import { useTheme, type Theme } from '../../src/theme/ThemeContext';
import { consumePendingCatalogQuery } from '../../src/services/catalog-bridge';

// Persiste les recherches recentes entre les navigations
let _recentSearches: string[] = [];

const FAMILIES = [
  { label: 'Tous',    query: null },
  { label: 'Floral',  query: 'floral' },
  { label: 'Oriental',query: 'oriental' },
  { label: 'Boisé',   query: 'woody' },
  { label: 'Frais',   query: 'fresh' },
  { label: 'Fougère', query: 'fougere' },
];

export default function SearchScreen() {
  const { theme } = useTheme();
  const s = useMemo(() => getStyles(theme), [theme]);
  const router = useRouter();
  const { q: routeQuery } = useLocalSearchParams<{ q?: string }>();
  const initialQuery = routeQuery ?? consumePendingCatalogQuery();

  const inputRef = useRef<TextInput>(null);
  const [searchText, setSearchText] = useState(initialQuery ?? '');
  const { parfums, searching, search, clear } = useCatalog();
  const [activeFamily, setActiveFamily] = useState<string | null>(null);
  const [recentSearches, setRecentSearches] = useState<string[]>(_recentSearches);

  useEffect(() => {
    const t = setTimeout(() => inputRef.current?.focus(), 250);
    return () => clearTimeout(t);
  }, []);

  useEffect(() => {
    if (initialQuery && initialQuery.trim().length >= 3) {
      setSearchText(initialQuery);
      search(initialQuery.trim());
    }
  }, [initialQuery]);

  const handleTextChange = useCallback((t: string) => {
    setSearchText(t);
    t.trim().length >= 3 ? search(t) : clear();
  }, [search, clear]);

  const handleFamily = useCallback((query: string | null) => {
    setActiveFamily(query);
    if (query) {
      setSearchText(query);
      search(query);
    } else {
      clear();
      setSearchText('');
    }
  }, [search, clear]);

  const handleResultPress = useCallback((id: string) => {
    const text = searchText.trim();
    if (text && text.length >= 3) {
      _recentSearches = [text, ..._recentSearches.filter(x => x.toLowerCase() !== text.toLowerCase())].slice(0, 5);
      setRecentSearches(_recentSearches);
    }
    router.push(`/catalog/${id}`);
  }, [searchText, router]);

  const handleRecentTap = useCallback((term: string) => {
    setSearchText(term);
    search(term);
    inputRef.current?.blur();
  }, [search]);

  const hasResults = parfums.length > 0 && !searching;

  return (
    <SafeAreaView edges={['top', 'bottom']} style={s.container}>
      <View style={s.header}>
        <View style={s.inputWrap}>
          <Ionicons
            name="search-outline"
            size={18}
            color={theme.colors.primary}
          />
          <TextInput
            ref={inputRef}
            style={s.input}
            placeholder="Rechercher un parfum..."
            placeholderTextColor={theme.colors.textMuted}
            value={searchText}
            onChangeText={handleTextChange}
            autoCapitalize="none"
            autoCorrect={false}
            returnKeyType="search"
          />
          {searchText.length > 0 && (
            <Pressable onPress={() => { setSearchText(''); clear(); setActiveFamily(null); }} hitSlop={8}>
              <Ionicons name="close-circle" size={18} color={theme.colors.textMuted} />
            </Pressable>
          )}
        </View>
        <Pressable onPress={() => router.back()} hitSlop={8} style={s.cancelBtn}>
          <Text style={s.cancelText}>Annuler</Text>
        </Pressable>
      </View>

      {!searchText && (
        <View style={s.recentSection}>
          <Text style={s.recentTitle}>Recherches récentes</Text>
          <View style={s.recentChips}>
            {recentSearches.length > 0 ? recentSearches.map(term => (
              <Pressable key={term} style={s.recentChip} onPress={() => handleRecentTap(term)}>
                <Ionicons name="time-outline" size={14} color={theme.colors.textMuted} />
                <Text style={s.recentChipText}>{term}</Text>
              </Pressable>
            )) : (
              <Text style={s.recentEmpty}>Aucune recherche récente</Text>
            )}
          </View>
        </View>
      )}

      <FlatList
        horizontal
        showsHorizontalScrollIndicator={false}
        style={s.filterRow}
        contentContainerStyle={s.filterChips}
        data={FAMILIES}
        renderItem={({ item }) => (
          <Pressable
            style={[s.filterChip, activeFamily === item.query && s.filterChipActive]}
            onPress={() => handleFamily(item.query)}
          >
            <Text style={[s.filterChipText, activeFamily === item.query && s.filterChipTextActive]}>
              {item.label}
            </Text>
          </Pressable>
        )}
        keyExtractor={f => f.label}
      />

      {searching && <ActivityIndicator style={{ marginTop: 24 }} color={theme.colors.primary} />}

      {hasResults ? (
        <FlatList
          data={parfums}
          keyExtractor={(p, i) => `${p.id}_${i}`}
          renderItem={({ item }) => (
            <Pressable onPress={() => handleResultPress(item.id)}>
              <ParfumCard parfum={item} showDeal />
            </Pressable>
          )}
          contentContainerStyle={{ paddingBottom: 16 }}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        />
      ) : searchText.length >= 3 && !searching ? (
        <View style={s.empty}>
          <Ionicons name="search-outline" size={48} color={theme.colors.textMuted} style={{ opacity: 0.4 }} />
          <Text style={s.emptyTitle}>Aucun résultat</Text>
          <Text style={s.emptyDesc}>Essaie une autre orthographe ou scanne un flacon.</Text>
        </View>
      ) : null}
    </SafeAreaView>
  );
}

function getStyles(t: Theme) {
  return {
    container: { flex: 1, backgroundColor: t.colors.background },
    header: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 12,
      paddingHorizontal: 16,
      paddingTop: 12,
      paddingBottom: 12,
      borderBottomWidth: StyleSheet.hairlineWidth,
      borderBottomColor: t.colors.border,
    },
    inputWrap: {
      flex: 1,
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: t.colors.surface,
      borderRadius: 14,
      paddingHorizontal: 14,
      height: 44,
      gap: 10,
      borderWidth: 1.5,
      borderColor: t.colors.primary,
      ...t.shadow.card,
    },
    input: {
      flex: 1,
      fontFamily: 'Inter_400Regular',
      fontSize: 16,
      color: t.colors.text,
      padding: 0,
    },
    cancelBtn: {
      paddingHorizontal: 4,
      paddingVertical: 8,
    },
    cancelText: {
      fontFamily: 'Inter_500Medium',
      fontSize: 15,
      color: t.colors.primary,
    },
    recentSection: {
      paddingHorizontal: 16,
      paddingTop: 8,
      paddingBottom: 12,
    },
    recentTitle: {
      fontFamily: 'Inter_600SemiBold',
      fontSize: 13,
      textTransform: 'uppercase',
      letterSpacing: 0.8,
      color: t.colors.textMuted,
      marginBottom: 10,
    },
    recentChips: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      gap: 8,
    },
    recentChip: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 6,
      paddingHorizontal: 14,
      paddingVertical: 8,
      borderRadius: 20,
      backgroundColor: t.colors.surface,
      borderWidth: StyleSheet.hairlineWidth,
      borderColor: t.colors.border,
    },
    recentChipText: {
      fontFamily: 'Inter_500Medium',
      fontSize: 13,
      color: t.colors.text,
    },
    recentEmpty: {
      fontFamily: 'Inter_400Regular',
      fontSize: 13,
      color: t.colors.textMuted,
    },
    filterRow: {
      maxHeight: 44,
      marginBottom: 4,
    },
    filterChips: {
      paddingHorizontal: 16,
      gap: 8,
      alignItems: 'center',
    },
    filterChip: {
      paddingHorizontal: 14,
      paddingVertical: 8,
      borderRadius: 20,
      backgroundColor: t.colors.surface,
      borderWidth: 1,
      borderColor: t.colors.border,
    },
    filterChipActive: {
      backgroundColor: t.colors.primarySoft,
      borderColor: t.colors.primary,
    },
    filterChipText: {
      fontFamily: 'Inter_500Medium',
      fontSize: 13,
      color: t.colors.textMuted,
    },
    filterChipTextActive: {
      color: t.colors.primaryInk,
    },
    empty: {
      alignItems: 'center',
      paddingTop: 48,
    },
    emptyTitle: {
      fontFamily: 'PlayfairDisplay_600SemiBold',
      fontSize: 18,
      color: t.colors.text,
      marginTop: 12,
    },
    emptyDesc: {
      fontFamily: 'Inter_400Regular',
      fontSize: 13,
      color: t.colors.textMuted,
      textAlign: 'center',
      lineHeight: 20,
      marginTop: 8,
      paddingHorizontal: 32,
    },
  } as const;
}
