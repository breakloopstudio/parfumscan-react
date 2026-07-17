// app/(tabs)/collection.tsx — Garde-robe principale

import { useState, useMemo, useEffect } from 'react';
import { View, Text, ScrollView, Pressable, ActivityIndicator, Alert, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import Ionicons from '@react-native-vector-icons/ionicons/static';
import { useAuthContext } from '../../src/contexts/AuthContext';
import { useWardrobe } from '../../src/hooks/useWardrobe';
import { useShelves } from '../../src/hooks/useShelves';
import { useSotd } from '../../src/hooks/useSotd';
import { hapticsLight } from '../../src/services/haptics';
import { useTheme, type Theme } from '../../src/theme/ThemeContext';
import ProfileAvatar from '../../src/components/ProfileAvatar';
import EmptyState from '../../src/components/EmptyState';
import Button from '../../src/components/Button';
import SOTDCard from '../../src/features/wardrobe/SOTDCard';
import SOTDPicker from '../../src/features/wardrobe/SOTDPicker';
import FilterBar from '../../src/features/wardrobe/FilterBar';
import WardrobeGrid from '../../src/features/wardrobe/WardrobeGrid';
import WardrobeQuickSheet from '../../src/features/wardrobe/WardrobeQuickSheet';
import ShelfManager from '../../src/features/wardrobe/ShelfManager';
import type { WardrobeItem } from '../../src/models/wardrobe.interface';

interface Props {
  onScroll?: (y: number) => void;
  onSheetOpen?: (visible: boolean) => void;
}

export default function WardrobePage({ onScroll, onSheetOpen }: Props) {
  const { theme } = useTheme();
  const s = useMemo(() => getStyles(theme), [theme]);
  const { user, authReady, isAuthenticated } = useAuthContext();
  const router = useRouter();
  const uid = user?.uid ?? null;

  const { items, loading, update, remove } = useWardrobe(uid);
  const { shelves, create: createShelf, update: updateShelf, remove: removeShelf } = useShelves(uid);
  const { sotd, setTodaySotd } = useSotd(uid);

  const haveItems = useMemo(() => items.filter(i => i.ownership === 'have'), [items]);

  const ownershipCounts = useMemo(() => {
    const counts: Record<string, number> = {};
    for (const item of items) counts[item.ownership] = (counts[item.ownership] ?? 0) + 1;
    return counts;
  }, [items]);

  const [searchQuery, setSearchQuery] = useState('');
  const [activeOwnership, setActiveOwnership] = useState<string | null>(null);
  const [activeShelfId, setActiveShelfId] = useState<string | null>(null);
  const [activeSort, setActiveSort] = useState<string>('recent');
  const [quickSheetItem, setQuickSheetItem] = useState<WardrobeItem | null>(null);
  const [shelfManagerVisible, setShelfManagerVisible] = useState(false);
  const [sotdPickerVisible, setSotdPickerVisible] = useState(false);

  useEffect(() => {
    onSheetOpen?.(quickSheetItem !== null);
  }, [quickSheetItem, onSheetOpen]);

  const filtered = useMemo(() => {
    let result = [...items];
    if (activeOwnership) result = result.filter(i => i.ownership === activeOwnership);
    if (activeShelfId) result = result.filter(i => i.shelfIds.includes(activeShelfId));
    if (searchQuery.trim()) {
      const q = searchQuery.trim().toLowerCase();
      result = result.filter(i =>
        (i.nom ?? '').toLowerCase().includes(q) ||
        (i.marque ?? '').toLowerCase().includes(q)
      );
    }
    result.sort((a, b) => {
      switch (activeSort) {
        case 'rating': return (b.rating ?? 0) - (a.rating ?? 0);
        case 'az': return (a.nom ?? '').localeCompare(b.nom ?? '');
        case 'za': return (b.nom ?? '').localeCompare(a.nom ?? '');
        default: return b.addedAt.getTime() - a.addedAt.getTime();
      }
    });
    return result;
  }, [items, activeOwnership, activeShelfId, searchQuery, activeSort]);

  const handleQuickOwnership = (ownership: WardrobeItem['ownership']) => {
    if (!quickSheetItem) return;
    update(quickSheetItem.parfumId, { ownership });
    setQuickSheetItem(prev => prev ? { ...prev, ownership } : null);
  };

  const handleQuickRating = (rating: number) => {
    if (!quickSheetItem) return;
    update(quickSheetItem.parfumId, { rating: rating === 0 ? null : rating });
    setQuickSheetItem(prev => prev ? { ...prev, rating: rating === 0 ? null : rating } : null);
  };

  const handleQuickToggleShelf = (shelfId: string) => {
    if (!quickSheetItem) return;
    const current = quickSheetItem.shelfIds;
    const next = current.includes(shelfId) ? current.filter(id => id !== shelfId) : [...current, shelfId];
    update(quickSheetItem.parfumId, { shelfIds: next });
    setQuickSheetItem(prev => prev ? { ...prev, shelfIds: next } : null);
  };

  const handleQuickToggleSignature = () => {
    if (!quickSheetItem) return;
    const next = !quickSheetItem.isSignature;
    if (next && items.filter(i => i.isSignature).length >= 3) {
      Alert.alert('Limite atteinte', 'Vous avez déjà 3 signatures. Retirez-en une avant d\'en ajouter.');
      return;
    }
    update(quickSheetItem.parfumId, { isSignature: next });
    setQuickSheetItem(prev => prev ? { ...prev, isSignature: next } : null);
  };

  const signatureCount = useMemo(() => items.filter(i => i.isSignature).length, [items]);

  const handleQuickRemove = () => {
    if (!quickSheetItem) return;
    Alert.alert('Retirer', 'Retirer ce parfum de la garde-robe ?', [
      { text: 'Annuler', style: 'cancel' },
      { text: 'Retirer', style: 'destructive', onPress: () => { remove(quickSheetItem.parfumId); setQuickSheetItem(null); } },
    ]);
  };

  if (!authReady) return <View style={s.center}><ActivityIndicator size="large" color={theme.colors.primary} /></View>;

  if (!isAuthenticated) {
    return (
      <SafeAreaView edges={['bottom']} style={s.container}>
        <View style={s.center}>
          <Ionicons name="shirt-outline" size={64} color={theme.colors.textMuted} />
          <Text style={s.authTitle}>Connectez-vous</Text>
          <Text style={s.authDesc}>Accédez à votre garde-robe.</Text>
        </View>
      </SafeAreaView>
    );
  }

  if (items.length === 0 && !loading) {
    return (
      <SafeAreaView edges={['bottom']} style={s.container}>
        <View style={s.header}>
          <Text style={s.title}>Ma Garde-robe</Text>
          <ProfileAvatar />
        </View>
        <EmptyState variant="wardrobe" onAction={() => router.replace('/(tabs)')} />
        <View style={s.emptyCtaRow}>
          <Button variant="outline" onPress={() => router.push('/(tabs)/scan')} icon="camera-outline" style={{ minWidth: 200 }}>
            Scanner un flacon
          </Button>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView edges={['bottom']} style={s.container}>
      <View style={s.header}>
        <Text style={s.title}>Ma Garde-robe · {items.length}</Text>
        <ProfileAvatar />
      </View>

      <SOTDCard
        sotd={sotd}
        onPress={() => sotd && router.push(`/wardrobe/${sotd.parfumId}`)}
        onChangePress={() => setSotdPickerVisible(true)}
      />

      <FilterBar
        shelves={shelves}
        activeOwnership={activeOwnership}
        activeShelfId={activeShelfId}
        activeSort={activeSort}
        searchQuery={searchQuery}
        ownershipCounts={ownershipCounts}
        onOwnershipChange={setActiveOwnership}
        onShelfChange={setActiveShelfId}
        onSortChange={setActiveSort}
        onSearchChange={setSearchQuery}
        onManageShelves={() => setShelfManagerVisible(true)}
      />

      <WardrobeGrid
        items={filtered}
        loading={loading}
        onItemPress={setQuickSheetItem}
        onScroll={onScroll}
      />

      <WardrobeQuickSheet
        visible={quickSheetItem !== null}
        item={quickSheetItem}
        shelves={shelves}
        signatureCount={signatureCount}
        onClose={() => setQuickSheetItem(null)}
        onOwnershipChange={handleQuickOwnership}
        onRatingChange={handleQuickRating}
        onToggleShelf={handleQuickToggleShelf}
        onToggleSignature={handleQuickToggleSignature}
        onViewMore={() => {
          const id = quickSheetItem?.parfumId;
          setQuickSheetItem(null);
          if (id) router.push(`/wardrobe/${id}`);
        }}
        onRemove={handleQuickRemove}
      />

      <ShelfManager
        visible={shelfManagerVisible}
        shelves={shelves}
        orphanCount={items.filter(i => i.shelfIds.length === 0).length}
        onClose={() => setShelfManagerVisible(false)}
        onCreate={(name, icon, color) => { createShelf(name, icon, color); }}
        onRename={(id, name) => { updateShelf(id, { name }); }}
        onDelete={removeShelf}
      />

      <SOTDPicker
        visible={sotdPickerVisible}
        haveItems={haveItems}
        currentSotdId={sotd?.parfumId ?? null}
        onSelect={(parfumId) => {
          const item = haveItems.find(i => i.parfumId === parfumId);
          if (item) {
            hapticsLight();
            setTodaySotd(item);
          }
          setSotdPickerVisible(false);
        }}
        onClose={() => setSotdPickerVisible(false)}
      />
    </SafeAreaView>
  );
}

function getStyles(t: Theme) {
  return {
    container: { flex: 1, backgroundColor: t.colors.background },
    center: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 32 },
    header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, paddingTop: 8, paddingBottom: 4 },
    title: { fontFamily: 'PlayfairDisplay_700Bold', fontSize: 22, color: t.colors.text, flex: 1 },
    authTitle: { fontFamily: 'PlayfairDisplay_600SemiBold', fontSize: 20, color: t.colors.text, marginTop: 12 },
    authDesc: { fontFamily: 'Inter_400Regular', fontSize: 14, color: t.colors.textMuted, textAlign: 'center', lineHeight: 20, marginTop: 6 },
    emptyCtaRow: { alignItems: 'center', marginTop: 8 },
  } as const;
}
