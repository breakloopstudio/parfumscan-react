// app/(tabs)/favorites.tsx — Moodboard olfactif : favoris en grille 3 densités

import { useState, useMemo, useEffect, useRef } from 'react';
import { View, Text, ScrollView, Pressable, ActivityIndicator, FlatList, Animated, Easing, LayoutAnimation, TextInput, RefreshControl } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import Ionicons from '@react-native-vector-icons/ionicons/static';
import { useAuthContext } from '../../src/contexts/AuthContext';
import { useFavoris } from '../../src/hooks/useFavoris';
import { getParfumById } from '../../src/services/firestore';
import { moveToCollection, moveToWishlist } from '../../src/services/user-data';
import { addToWardrobe } from '../../src/services/wardrobe';
import { setPendingParfum } from '../../src/services/catalog-bridge';
import { translateNote } from '../../src/utils/translate-note';
import { useTheme, type Theme } from '../../src/theme/ThemeContext';
import { useDensityPreference, GRID_MODES } from '../../src/hooks/useDensityPreference';
import type { CardMode } from '../../src/components/ParfumCard';
import EmptyState from '../../src/components/EmptyState';
import ProfileAvatar from '../../src/components/ProfileAvatar';
import ActionSheet, { type ActionItem } from '../../src/components/ActionSheet';
import ParfumCard from '../../src/components/ParfumCard';
import type { UserFavori } from '../../src/models/user-favori.interface';
import type { Parfum } from '../../src/models';

interface Props {
  onScroll?: (y: number) => void;
}

function favoriToCardItem(f: UserFavori): Parfum {
  return {
    id: f.parfumId,
    nom: f.nom ?? '',
    marque: f.marque ?? '',
    imageUrl: f.imageUrl ?? null,
    familleOlactive: f.familleOlactive ?? '',
    bestPrice: f.bestPrice ?? undefined,
    referencePrice: f.referencePrice ?? undefined,
    annee: f.annee ?? undefined,
  } as Parfum;
}

export default function FavoritesPage({ onScroll }: Props) {
  const { theme, resolvedMode } = useTheme();
  const s = useMemo(() => getStyles(theme), [theme]);
  const { user, authReady, isAuthenticated } = useAuthContext();
  const router = useRouter();
  const uid = user?.uid ?? null;
  const { favoris, loading, removeFavori } = useFavoris(uid);
  const keyboardAppearance = resolvedMode === 'dark' ? 'dark' : 'light';
  const { density: gridDensity, setDensity: setGridDensity } = useDensityPreference();

  const [searchQuery, setSearchQuery] = useState('');
  const [activeFamily, setActiveFamily] = useState<string | null>(null);
  const [sortMode, setSortMode] = useState<'recent' | 'az' | 'za' | 'price'>('recent');
  const [refreshing, setRefreshing] = useState(false);
  const [selectedItem, setSelectedItem] = useState<UserFavori | null>(null);
  const [showFamilySheet, setShowFamilySheet] = useState(false);

  const animatedValues = useRef<Map<string, Animated.Value>>(new Map());
  const prevFilterKey = useRef<string | null>(null);
  const hasAnimated = useRef(false);

  const hasBestPrice = useMemo(() => favoris.some(f => typeof f.bestPrice === 'number'), [favoris]);

  const familyCounts = useMemo(() => {
    const m = new Map<string, number>();
    for (const f of favoris) {
      if (f.familleOlactive) {
        m.set(f.familleOlactive, (m.get(f.familleOlactive) ?? 0) + 1);
      }
    }
    return [...m.entries()].sort((a, b) => b[1] - a[1]);
  }, [favoris]);

  const familySheetActions: ActionItem[] = useMemo(() => {
    const actions: ActionItem[] = [
      {
        icon: activeFamily === null ? 'checkmark-circle' : 'ellipse-outline',
        label: `Toutes (${favoris.length})`,
        onPress: () => { setActiveFamily(null); setShowFamilySheet(false); },
      },
    ];
    for (const [family, count] of familyCounts) {
      const isActive = activeFamily === family;
      actions.push({
        icon: isActive ? 'checkmark-circle' : 'ellipse-outline',
        label: `${translateNote(family)} (${count})`,
        onPress: () => { setActiveFamily(family); setShowFamilySheet(false); },
      });
    }
    return actions;
  }, [familyCounts, activeFamily, favoris.length]);

  const filtered = useMemo(() => {
    let result = [...favoris];
    if (activeFamily) {
      result = result.filter(f => f.familleOlactive === activeFamily);
    }
    if (searchQuery.trim()) {
      const q = searchQuery.trim().toLowerCase();
      result = result.filter(f =>
        (f.nom ?? '').toLowerCase().includes(q) ||
        (f.marque ?? '').toLowerCase().includes(q)
      );
    }
    result.sort((a, b) => {
      switch (sortMode) {
        case 'az': return (a.nom ?? '').localeCompare(b.nom ?? '');
        case 'za': return (b.nom ?? '').localeCompare(a.nom ?? '');
        case 'price': {
          const pa = a.bestPrice ?? Infinity;
          const pb = b.bestPrice ?? Infinity;
          return pa - pb;
        }
        default: {
          const da = a.addedAt instanceof Date ? a.addedAt.getTime() : 0;
          const db = b.addedAt instanceof Date ? b.addedAt.getTime() : 0;
          return db - da;
        }
      }
    });
    return result;
  }, [favoris, activeFamily, searchQuery, sortMode]);

  const showFilterBar = favoris.length > 5;

  const getSortCycle = useMemo(() => {
    const base: { key: typeof sortMode; label: string }[] = [
      { key: 'recent', label: 'Récents' },
      { key: 'az', label: 'A–Z' },
      { key: 'za', label: 'Z–A' },
    ];
    if (hasBestPrice) base.push({ key: 'price', label: 'Moins chers' });
    return base;
  }, [hasBestPrice]);

  const cycleSort = () => {
    const idx = getSortCycle.findIndex(o => o.key === sortMode);
    const next = getSortCycle[(idx + 1) % getSortCycle.length];
    setSortMode(next.key);
  };

  const currentSortLabel = getSortCycle.find(o => o.key === sortMode)?.label ?? 'Tri';

  const handleRefresh = () => {
    setRefreshing(true);
    setTimeout(() => setRefreshing(false), 800);
  };

  const filterKey = `${activeFamily ?? ''}|${searchQuery}|${sortMode}`;

  useEffect(() => {
    const needsAnim = (!hasAnimated.current || prevFilterKey.current !== filterKey) && filtered.length >= 4;
    if (!needsAnim) {
      prevFilterKey.current = filterKey;
      return;
    }
    hasAnimated.current = true;
    prevFilterKey.current = filterKey;

    animatedValues.current = new Map();
    filtered.forEach((item, i) => {
      const val = new Animated.Value(0);
      animatedValues.current.set(item.id, val);
      Animated.timing(val, {
        toValue: 1,
        duration: 250,
        delay: i * 60,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: true,
      }).start();
    });
  }, [filterKey, filtered.length]);

  const goToDetail = async (parfumId: string) => {
    try {
      const p = await getParfumById(parfumId);
      if (p) setPendingParfum(p);
    } catch (e: unknown) { console.warn('[favorites] getParfumById failed:', (e as Error)?.message ?? String(e)); }
    router.push(`/catalog/${parfumId}`);
  };

  const showContextMenu = (item: UserFavori) => {
    setSelectedItem(item);
  };

  const sheetActions: ActionItem[] = useMemo(() => {
    if (!selectedItem || !uid) return [];
    const item = selectedItem;
    return [
      {
        icon: 'eye-outline',
        label: 'Voir le détail',
        onPress: () => { setSelectedItem(null); goToDetail(item.parfumId); },
      },
      {
        icon: 'shirt-outline',
        label: 'Ajouter à ma parfumerie',
        onPress: () => {
          setSelectedItem(null);
          addToWardrobe(uid, item.parfumId, 'have', item.nom ?? undefined, item.marque ?? undefined, item.imageUrl ?? undefined).catch(() => {});
        },
      },
      {
        icon: 'swap-horizontal-outline',
        label: 'Déplacer vers Parfumerie',
        onPress: () => {
          setSelectedItem(null);
          moveToCollection(uid, 'favoris', item.id, item.parfumId, item.nom ?? null, item.marque ?? null, item.imageUrl ?? null).catch(() => {});
        },
      },
      {
        icon: 'bookmark-outline',
        label: 'Déplacer vers Wishlist',
        onPress: () => {
          setSelectedItem(null);
          moveToWishlist(uid, 'favoris', item.id, item.parfumId, item.nom ?? null, item.marque ?? null, item.imageUrl ?? null, item.familleOlactive ?? null).catch(() => {});
        },
      },
      {
        icon: 'trash-outline',
        label: 'Retirer des favoris',
        destructive: true,
        onPress: () => {
          setSelectedItem(null);
          LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
          removeFavori(item.id).catch(() => {});
        },
      },
    ];
  }, [selectedItem, uid]);

  const gridNumCols = gridDensity === 'list' ? 1 : 2;
  const gridKey = `${gridNumCols}col-${resolvedMode}`;

  if (!authReady) {
    return (
      <View style={s.center}>
        <ActivityIndicator size="large" color={theme.colors.primary} />
      </View>
    );
  }

  if (!isAuthenticated) {
    return (
      <SafeAreaView edges={['bottom']} style={s.container}>
        <View style={s.center}>
          <Ionicons name="heart-outline" size={64} color={theme.colors.textMuted} />
          <Text style={s.authTitle}>Connectez-vous</Text>
          <Text style={s.authDesc}>Accédez à vos favoris.</Text>
          <Pressable style={s.authBtn} onPress={() => router.push('/auth/login')}>
            <Text style={s.authBtnText}>Se connecter</Text>
          </Pressable>
        </View>
      </SafeAreaView>
    );
  }

  if (loading) {
    return (
      <SafeAreaView edges={['bottom']} style={s.container}>
        <View style={s.headerBar}>
          <Text style={s.title}>Favoris</Text>
          <ProfileAvatar />
        </View>
        <ActivityIndicator style={s.loadingSpinner} color={theme.colors.primary} />
      </SafeAreaView>
    );
  }

  if (favoris.length === 0) {
    return (
      <SafeAreaView edges={['bottom']} style={s.container}>
        <FlatList
          data={[]}
          renderItem={() => null}
          ListHeaderComponent={
            <View>
              <View style={s.headerBar}>
                <Text style={s.title}>Favoris</Text>
                <ProfileAvatar />
              </View>
              <EmptyState variant="favoris" onAction={() => router.replace('/(tabs)')} />
            </View>
          }
          onScroll={onScroll ? (e) => onScroll(e.nativeEvent.contentOffset.y) : undefined}
          scrollEventThrottle={16}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} tintColor={theme.colors.primary} />
          }
          contentContainerStyle={{ flexGrow: 1 }}
        />
      </SafeAreaView>
    );
  }

  const ListHeader = (
    <View>
      <View style={s.headerBar}>
        <Text style={s.title}>Favoris{'\u00A0'}·{'\u00A0'}{favoris.length}</Text>
        <ProfileAvatar />
      </View>

      {showFilterBar && (
        <View style={s.filterContainer}>
          <View style={s.searchRow}>
            <View style={s.searchWrap}>
              <Ionicons name="search-outline" size={16} color={theme.colors.textMuted} />
              <TextInput
                style={s.searchInput}
                placeholder="Rechercher dans mes favoris..."
                placeholderTextColor={theme.colors.textMuted}
                value={searchQuery}
                onChangeText={setSearchQuery}
                keyboardAppearance={keyboardAppearance}
              />
            </View>
            <Pressable style={s.sortBtn} onPress={cycleSort} hitSlop={8}>
              <Ionicons name="swap-vertical-outline" size={16} color={theme.colors.primary} />
              <Text style={s.sortLabel}>{currentSortLabel}</Text>
            </Pressable>
          </View>

          <View style={s.controlsRow}>
            <Pressable style={s.familyBtn} onPress={() => setShowFamilySheet(true)}>
              <Ionicons name="options-outline" size={16} color={activeFamily ? theme.colors.primary : theme.colors.textMuted} />
              <Text style={[s.familyBtnText, activeFamily ? s.familyBtnTextActive : undefined]}>
                {activeFamily ? translateNote(activeFamily) : 'Famille'}
              </Text>
            </Pressable>

            {activeFamily && (
              <Pressable style={s.dismissChip} onPress={() => setActiveFamily(null)}>
                <Text style={s.dismissChipText}>{translateNote(activeFamily)}</Text>
                <Ionicons name="close-circle" size={14} color={theme.colors.primaryInk} />
              </Pressable>
            )}

            <View style={{ flex: 1 }} />

            {GRID_MODES.map(m => (
              <Pressable
                key={m.key}
                style={[s.segmentBtn, gridDensity === m.key && s.segmentBtnActive]}
                onPress={() => setGridDensity(m.key)}
              >
                <Text style={[s.segmentBtnText, gridDensity === m.key && s.segmentBtnTextActive]}>
                  {m.label}
                </Text>
              </Pressable>
            ))}
          </View>
        </View>
      )}

      {filtered.length === 0 && activeFamily && (
        <View style={s.emptyFilter}>
          <Text style={s.emptyFilterText}>Aucun favori dans cette famille</Text>
        </View>
      )}
    </View>
  );

  const renderItem = ({ item }: { item: UserFavori }) => {
    const cardData = favoriToCardItem(item);
    const animVal = animatedValues.current.get(item.id);
    const opacity = animVal ?? 1;

    return (
      <Animated.View style={[gridDensity === 'list' ? s.listItemWrap : s.gridItemWrap, { opacity }]}>
        <Pressable onLongPress={() => showContextMenu(item)} delayLongPress={400} style={{ flex: 1 }}>
          <ParfumCard
            parfum={cardData}
            mode={gridDensity}
            onPressOverride={() => goToDetail(item.parfumId)}
          />
        </Pressable>
      </Animated.View>
    );
  };

  return (
    <>
      <SafeAreaView edges={['bottom']} style={s.container}>
        <FlatList
          key={gridKey}
          data={filtered}
          keyExtractor={item => item.id}
          renderItem={renderItem}
          extraData={`${gridDensity}|${resolvedMode}`}
          numColumns={gridNumCols}
          columnWrapperStyle={gridNumCols === 2 ? s.row : undefined}
          contentContainerStyle={s.content}
          ListHeaderComponent={ListHeader}
          showsVerticalScrollIndicator={false}
          onScroll={onScroll ? (e) => onScroll(e.nativeEvent.contentOffset.y) : undefined}
          scrollEventThrottle={16}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} tintColor={theme.colors.primary} />
          }
          windowSize={5}
          maxToRenderPerBatch={10}
        />
      </SafeAreaView>
      <ActionSheet
        visible={selectedItem !== null}
        title={selectedItem?.nom ?? undefined}
        actions={sheetActions}
        onClose={() => setSelectedItem(null)}
      />
      <ActionSheet
        visible={showFamilySheet}
        title="Filtrer par famille"
        actions={familySheetActions}
        onClose={() => setShowFamilySheet(false)}
      />
    </>
  );
}

function getStyles(t: Theme) {
  return {
    container: { flex: 1, backgroundColor: t.colors.background },
    center: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 32 },
    headerBar: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, paddingTop: 8, paddingBottom: 4 },
    title: { fontFamily: 'PlayfairDisplay_700Bold', fontSize: 28, color: t.colors.text, flex: 1 },
    authTitle: { fontFamily: 'PlayfairDisplay_600SemiBold', fontSize: 20, color: t.colors.text, marginTop: 12 },
    authDesc: { fontFamily: 'Inter_400Regular', fontSize: 14, color: t.colors.textMuted, textAlign: 'center', lineHeight: 20, marginTop: 6 },
    authBtn: {
      marginTop: 20,
      borderWidth: 1.5,
      borderColor: t.colors.primary,
      borderRadius: t.radius.base,
      paddingHorizontal: 32,
      paddingVertical: 12,
    },
    authBtnText: {
      fontFamily: 'Inter_600SemiBold',
      fontSize: 15,
      color: t.colors.primary,
    },
    filterContainer: {
      paddingHorizontal: 12,
      paddingBottom: 4,
    },
    searchRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 8,
      marginBottom: 8,
    },
    searchWrap: {
      flex: 1,
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: t.colors.surface2,
      borderRadius: 20,
      paddingHorizontal: 12,
      height: 38,
      gap: 8,
    },
    searchInput: {
      flex: 1,
      fontFamily: 'Inter_400Regular',
      fontSize: 14,
      color: t.colors.text,
    },
    sortBtn: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 2,
      paddingHorizontal: 8,
      paddingVertical: 6,
    },
    sortLabel: {
      fontFamily: 'Inter_500Medium',
      fontSize: 12,
      color: t.colors.primary,
    },
    controlsRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 6,
      marginBottom: 4,
    },
    familyBtn: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 5,
      paddingHorizontal: 12,
      paddingVertical: 8,
      borderRadius: 20,
      backgroundColor: t.colors.surface,
      borderWidth: 1,
      borderColor: t.colors.border,
      minHeight: 44,
    },
    familyBtnText: {
      fontFamily: 'Inter_500Medium',
      fontSize: 12,
      color: t.colors.textMuted,
    },
    familyBtnTextActive: {
      color: t.colors.primary,
      fontFamily: 'Inter_600SemiBold',
    },
    dismissChip: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 4,
      paddingHorizontal: 10,
      paddingVertical: 7,
      borderRadius: 20,
      backgroundColor: t.colors.primarySoft,
    },
    dismissChipText: {
      fontFamily: 'Inter_600SemiBold',
      fontSize: 12,
      color: t.colors.primaryInk,
    },
    segmentBtn: {
      paddingHorizontal: 11,
      paddingVertical: 8,
      borderRadius: 6,
      backgroundColor: t.colors.surface2,
      minHeight: 44,
      justifyContent: 'center',
    },
    segmentBtnActive: {
      backgroundColor: t.colors.surface,
      ...t.shadow.card,
    },
    segmentBtnText: {
      fontFamily: 'Inter_500Medium',
      fontSize: 11,
      color: t.colors.textMuted,
    },
    segmentBtnTextActive: {
      fontFamily: 'Inter_600SemiBold',
      color: t.colors.text,
    },
    emptyFilter: {
      paddingVertical: 24,
      alignItems: 'center',
    },
    emptyFilterText: {
      fontFamily: 'Inter_400Regular',
      fontSize: 14,
      color: t.colors.textMuted,
    },
    row: {
      gap: 8,
      marginBottom: 8,
    },
    content: {
      paddingHorizontal: 16,
      paddingBottom: 40,
    },
    gridItemWrap: { flex: 1 },
    listItemWrap: { marginBottom: 8 },
    loadingSpinner: { marginTop: 24 },
  } as const;
}
