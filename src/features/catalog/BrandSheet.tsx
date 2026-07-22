// src/features/catalog/BrandSheet.tsx — Bottom sheet alphabétique des marques

import { useState, useMemo, useCallback, useRef } from 'react';
import { View, Text, Pressable, Modal, FlatList, TextInput, StyleSheet, PanResponder } from 'react-native';
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
  const [activeLetter, setActiveLetter] = useState<string | null>(null);
  const [isScrubbing, setIsScrubbing] = useState(false);
  const [scrubY, setScrubY] = useState(0);
  const [scrubViewHeight, setScrubViewHeight] = useState(0);

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
  const listRef = useRef<FlatList<{ letter: string; brands: string[] }>>(null);

  const getLetterFromY = useCallback((y: number) => {
    if (scrubViewHeight === 0 || letterIndex.length === 0) return null;
    const ratio = Math.max(0, Math.min(1, y / scrubViewHeight));
    const idx = Math.floor(ratio * letterIndex.length);
    return letterIndex[Math.min(idx, letterIndex.length - 1)];
  }, [letterIndex, scrubViewHeight]);

  const scrollToLetter = useCallback((letter: string) => {
    const idx = sections.findIndex(s => s.letter === letter);
    if (idx >= 0 && listRef.current) {
      listRef.current.scrollToIndex({ index: idx, animated: false, viewPosition: 0 });
    }
  }, [sections]);

  const getLetterFromYRef = useRef(getLetterFromY);
  const scrollToLetterRef = useRef(scrollToLetter);
  const activeLetterRef = useRef(activeLetter);
  getLetterFromYRef.current = getLetterFromY;
  scrollToLetterRef.current = scrollToLetter;
  activeLetterRef.current = activeLetter;

  const panResponder = useRef(PanResponder.create({
    onStartShouldSetPanResponder: () => true,
    onMoveShouldSetPanResponder: () => true,
    onPanResponderGrant: (evt) => {
      setIsScrubbing(true);
      const letter = getLetterFromYRef.current(evt.nativeEvent.locationY);
      if (letter !== null) {
        setActiveLetter(letter);
        setScrubY(evt.nativeEvent.locationY);
        activeLetterRef.current = letter;
        scrollToLetterRef.current(letter);
      }
    },
    onPanResponderMove: (evt) => {
      const letter = getLetterFromYRef.current(evt.nativeEvent.locationY);
      if (letter !== null && letter !== activeLetterRef.current) {
        setActiveLetter(letter);
        setScrubY(evt.nativeEvent.locationY);
        activeLetterRef.current = letter;
        scrollToLetterRef.current(letter);
      }
    },
    onPanResponderRelease: () => {
      setIsScrubbing(false);
      setActiveLetter(null);
      activeLetterRef.current = null;
    },
    onPanResponderTerminate: () => {
      setIsScrubbing(false);
      setActiveLetter(null);
      activeLetterRef.current = null;
    },
  })).current;

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
            style={{ flex: 1 }}
            ref={listRef}
            data={sections}
            keyExtractor={item => item.letter}
            getItemLayout={(_, index) => {
              const sec = sections[index];
              const headerH = 38;
              const itemH = 44;
              const sectionGap = 8;
              const offset = sections.slice(0, index).reduce(
                (acc, s2) => acc + headerH + s2.brands.length * itemH + sectionGap, 0,
              );
              return { length: headerH + sec.brands.length * itemH + sectionGap, offset, index };
            }}
            onScrollToIndexFailed={(info) => {
              setTimeout(() => {
                listRef.current?.scrollToIndex({ index: info.index, animated: false, viewPosition: 0 });
              }, 100);
            }}
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
            <>
              <View
                style={s.quickIndex}
                onLayout={(e) => { setScrubViewHeight(e.nativeEvent.layout.height); }}
                {...panResponder.panHandlers}
              >
                {letterIndex.map(letter => (
                  <Text
                    key={letter}
                    style={[
                      s.quickIndexText,
                      isScrubbing && activeLetter === letter && s.quickIndexTextActive,
                    ]}
                    allowFontScaling={false}
                  >
                    {letter}
                  </Text>
                ))}
              </View>

              {isScrubbing && activeLetter && (
                <View style={[s.loupe, { top: Math.max(0, scrubY - 28) }]} pointerEvents="none">
                  <Text style={s.loupeText} allowFontScaling={false}>{activeLetter}</Text>
                </View>
              )}
            </>
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
      justifyContent: 'space-between', alignItems: 'center',
      paddingVertical: 12,
      zIndex: 10,
    },
    quickIndexText: { fontFamily: 'Inter_600SemiBold', fontSize: 10, color: t.colors.primary },
    quickIndexTextActive: { fontSize: 13, color: t.colors.secondary },
    loupe: {
      position: 'absolute',
      right: 36,
      width: 56, height: 56, borderRadius: 28,
      backgroundColor: t.colors.primary,
      justifyContent: 'center', alignItems: 'center',
      shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.3, shadowRadius: 6,
      elevation: 6,
      zIndex: 20,
    },
    loupeText: {
      fontFamily: 'PlayfairDisplay_700Bold', fontSize: 24, color: '#FFFFFF',
    },
  } as const;
}
