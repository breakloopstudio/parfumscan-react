// src/features/scan/ScanResults.tsx — Résultats triés par prix croissant

import { useMemo } from 'react';
import { View, Text, FlatList, Pressable } from 'react-native';
import { useRouter } from 'expo-router';
import Ionicons from '@react-native-vector-icons/ionicons/static';
import ParfumCard from '../../components/ParfumCard';
import { setPendingParfum } from '../../services/catalog-bridge';
import { useTheme, type Theme } from '../../theme/ThemeContext';
import type { Parfum } from '../../models';

interface Props {
  parfums: Parfum[];
  onOpenCatalog: () => void;
}

export function ScanResults({ parfums, onOpenCatalog }: Props) {
  const { theme, resolvedMode } = useTheme();
  const s = useMemo(() => getStyles(theme), [theme]);
  const router = useRouter();

  const sorted = [...parfums].sort((a, b) => {
    const aPrice = 'bestPrice' in a ? a.bestPrice ?? Infinity : Infinity;
    const bPrice = 'bestPrice' in b ? b.bestPrice ?? Infinity : Infinity;
    return aPrice - bPrice;
  });

  const handleParfumPress = (parfum: Parfum) => {
    setPendingParfum(parfum);
    router.dismissTo('/(tabs)');
  };

  return (
    <View style={s.container}>
      <View style={s.header}>
        <Ionicons name="checkmark-circle" size={36} color={theme.colors.deal} />
        <Text style={s.title}>
          {sorted.length} parfum{sorted.length > 1 ? 's' : ''} trouvé{sorted.length > 1 ? 's' : ''}
        </Text>
      </View>
      <FlatList<Parfum>
        data={sorted}
        keyExtractor={(p, i) => `${p.id}_${i}`}
        extraData={resolvedMode}
        renderItem={({ item }) => (
          <ParfumCard parfum={item} mode="comfortable" onPressOverride={() => handleParfumPress(item)} />
        )}
        contentContainerStyle={s.list}
        showsVerticalScrollIndicator={false}
      />
      <Pressable style={s.catalogBtn} onPress={onOpenCatalog}>
        <Text style={s.catalogText}>Voir plus dans le catalogue</Text>
      </Pressable>
    </View>
  );
}

function getStyles(t: Theme) {
  return {
    container: { flex: 1 },
    header: { alignItems: 'center', paddingTop: 24, paddingBottom: 8 },
    title: {
      fontFamily: 'PlayfairDisplay_600SemiBold',
      fontSize: 20,
      color: t.colors.text,
      marginTop: 8,
    },
    list: { paddingBottom: 16 },
    catalogBtn: { alignSelf: 'center', marginVertical: 16, paddingVertical: 10, paddingHorizontal: 20 },
    catalogText: {
      fontFamily: 'Inter_600SemiBold',
      fontSize: 15,
      color: t.colors.primary,
    },
  } as const;
}