// src/features/catalog/BrandSheet.tsx — Bottom sheet alphabétique des marques

import { useState, useMemo, useCallback } from 'react';
import { View, Text, Pressable, Modal, FlatList, TextInput, StyleSheet } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Ionicons from '@react-native-vector-icons/ionicons/static';
import { useTheme, type Theme } from '../../theme/ThemeContext';

const ALL_BRANDS = [
  'Acqua di Parma', 'Amouage', 'Armani', 'Armaf',
  'Bentley', 'Burberry', 'Byredo',
  'Calvin Klein', 'Carolina Herrera', 'Cartier', 'Cerruti', 'Chanel', 'Chloé', 'Creed',
  'Davidoff', 'Diptyque', 'Dior', 'Dolce & Gabbana',
  'Essential Parfums',
  'Givenchy', 'Gucci', 'Guerlain',
  'Hermès', 'Hugo Boss',
  'Issey Miyake',
  'Jean Paul Gaultier', 'Jo Malone',
  'Kenzo',
  'Lalique', 'Lancôme', 'Lattafa', 'Le Labo', 'Loewe',
  'Maison Francis Kurkdjian', 'Maison Margiela', 'Mancera', 'Montblanc', 'Mugler',
  'Narciso Rodriguez', 'Nishane',
  'Paco Rabanne', 'Parfums de Marly', 'Penhaligon\'s', 'Prada',
  'Ralph Lauren', 'Rasasi', 'Roja Dove',
  'Salvatore Ferragamo', 'Serge Lutens',
  'Tom Ford', 'Tommy Hilfiger',
  'Valentino', 'Van Cleef & Arpels', 'Versace', 'Viktor & Rolf',
  'Xerjoff',
  'Yves Saint Laurent',
  'Zadig & Voltaire', 'Zara',
];

function groupByLetter(brands: string[]): { letter: string; brands: string[] }[] {
  const groups: { letter: string; brands: string[] }[] = [];
  for (const brand of brands) {
    const letter = brand.charAt(0).toUpperCase();
    const last = groups[groups.length - 1];
    if (last && last.letter === letter) {
      last.brands.push(brand);
    } else {
      groups.push({ letter, brands: [brand] });
    }
  }
  return groups;
}

interface Props {
  visible: boolean;
  onClose: () => void;
  onSelectBrand: (brand: string) => void;
}

export default function BrandSheet({ visible, onClose, onSelectBrand }: Props) {
  const { theme, resolvedMode } = useTheme();
  const s = useMemo(() => getStyles(theme), [theme]);
  const insets = useSafeAreaInsets();
  const keyboardAppearance = resolvedMode === 'dark' ? 'dark' : 'light';

  const [search, setSearch] = useState('');

  const filtered = useMemo(() => {
    if (!search.trim()) return ALL_BRANDS;
    const q = search.trim().toLowerCase();
    return ALL_BRANDS.filter(b => b.toLowerCase().includes(q));
  }, [search]);

  const sections = useMemo(() => groupByLetter(filtered), [filtered]);

  const handleSelect = useCallback((brand: string) => {
    onSelectBrand(brand);
    setSearch('');
    onClose();
  }, [onSelectBrand, onClose]);

  const handleClose = useCallback(() => {
    setSearch('');
    onClose();
  }, [onClose]);

  const letterIndex = useMemo(() => sections.map(s => s.letter), [sections]);

  return (
    <Modal visible={visible} animationType="slide" presentationStyle="pageSheet" onRequestClose={handleClose}>
      <View style={[s.container, { paddingTop: insets.top }]}>
        <View style={s.handleBar}>
          <View style={s.handle} />
        </View>

        <View style={s.header}>
          <Text style={s.title}>Toutes les marques</Text>
          <Pressable onPress={handleClose} hitSlop={12}>
            <Ionicons name="close" size={24} color={theme.colors.textMuted} />
          </Pressable>
        </View>

        <View style={s.searchRow}>
          <View style={s.searchWrap}>
            <Ionicons name="search-outline" size={16} color={theme.colors.textMuted} />
            <TextInput
              style={s.searchInput}
              placeholder="Rechercher une marque..."
              placeholderTextColor={theme.colors.textMuted}
              value={search}
              onChangeText={setSearch}
              autoCapitalize="none"
              autoCorrect={false}
              keyboardAppearance={keyboardAppearance}
            />
            {search.length > 0 && (
              <Pressable onPress={() => setSearch('')} hitSlop={8}>
                <Ionicons name="close-circle" size={16} color={theme.colors.textMuted} />
              </Pressable>
            )}
          </View>
        </View>

        <View style={s.listWrap}>
          <FlatList
            data={sections}
            keyExtractor={item => item.letter}
            renderItem={({ item }) => (
              <View style={s.section}>
                <Text style={s.letter}>{item.letter}</Text>
                {item.brands.map(brand => (
                  <Pressable
                    key={brand}
                    style={({ pressed }) => [s.brandItem, pressed && s.brandItemPressed]}
                    onPress={() => handleSelect(brand)}
                  >
                    <Text style={s.brandText}>{brand}</Text>
                    <Ionicons name="chevron-forward" size={16} color={theme.colors.textMuted} />
                  </Pressable>
                ))}
              </View>
            )}
            showsVerticalScrollIndicator={false}
            contentContainerStyle={{ paddingBottom: insets.bottom + 20 }}
          />

          {sections.length > 3 && (
            <View style={s.quickIndex}>
              {letterIndex.map(letter => (
                <Pressable key={letter} hitSlop={4} style={s.quickIndexItem}>
                  <Text style={s.quickIndexText}>{letter}</Text>
                </Pressable>
              ))}
            </View>
          )}
        </View>
      </View>
    </Modal>
  );
}

function getStyles(t: Theme) {
  return {
    container: { flex: 1, backgroundColor: t.colors.background },
    handleBar: { alignItems: 'center', paddingVertical: 10 },
    handle: { width: 36, height: 4, backgroundColor: t.colors.border, borderRadius: 2 },
    header: {
      flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
      paddingHorizontal: 20, paddingBottom: 14,
    },
    title: { fontFamily: 'PlayfairDisplay_700Bold', fontSize: 26, color: t.colors.text },
    searchRow: { paddingHorizontal: 16, paddingBottom: 12 },
    searchWrap: {
      flexDirection: 'row', alignItems: 'center',
      backgroundColor: t.colors.surface2, borderRadius: 14,
      paddingHorizontal: 14, height: 42, gap: 10,
    },
    searchInput: { flex: 1, fontFamily: 'Inter_400Regular', fontSize: 15, color: t.colors.text, padding: 0 },
    listWrap: { flex: 1, flexDirection: 'row' },
    section: { paddingHorizontal: 20, marginBottom: 8 },
    letter: {
      fontFamily: 'Inter_700Bold', fontSize: 13, color: t.colors.primary,
      paddingVertical: 8, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: t.colors.border,
      marginBottom: 4,
    },
    brandItem: {
      flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
      paddingVertical: 12, paddingHorizontal: 4,
      borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: t.colors.surface2,
    },
    brandItemPressed: { opacity: 0.6 },
    brandText: { fontFamily: 'Inter_500Medium', fontSize: 15, color: t.colors.text },
    quickIndex: {
      position: 'absolute', right: 4, top: 0, bottom: 0,
      justifyContent: 'center', alignItems: 'center',
      paddingVertical: 8, gap: 1,
    },
    quickIndexItem: { paddingHorizontal: 6, paddingVertical: 2 },
    quickIndexText: { fontFamily: 'Inter_600SemiBold', fontSize: 10, color: t.colors.primary },
  } as const;
}
