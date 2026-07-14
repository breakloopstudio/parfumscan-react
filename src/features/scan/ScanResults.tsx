// src/features/scan/ScanResults.tsx — Résultats : liste de parfums trouvés

import { View, Text, FlatList, Pressable, StyleSheet } from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import ParfumCard from '../../components/ParfumCard';
import { setPendingParfum } from '../../services/catalog-bridge';
import { theme } from '../../theme/theme';
import type { Parfum } from '../../models';
import type { ParfumSearchResult } from '../../services/fragella';

interface Props {
  parfums: Parfum[] | ParfumSearchResult[];
  onOpenCatalog: () => void;
}

export function ScanResults({ parfums, onOpenCatalog }: Props) {
  const router = useRouter();

  const handleParfumPress = (parfum: Parfum | ParfumSearchResult) => {
    setPendingParfum(parfum);
    // Dismiss le scan → retour aux tabs, le TabPager va ouvrir la fiche détail
    router.dismissTo('/(tabs)');
  };

  return (
    <View style={s.container}>
      <View style={s.header}>
        <Ionicons name="checkmark-circle" size={36} color={theme.colors.success} />
        <Text style={s.title}>{parfums.length} parfum{parfums.length > 1 ? 's' : ''} trouvé{parfums.length > 1 ? 's' : ''}</Text>
      </View>
      <FlatList<Parfum | ParfumSearchResult>
        data={parfums}
        keyExtractor={(p,i) => p.id + '_' + p.nom || String(i)}
        renderItem={({ item }) => <ParfumCard parfum={item} showDeal onPressOverride={() => handleParfumPress(item)} />}
        contentContainerStyle={s.list}
        showsVerticalScrollIndicator={false}
      />
      <Pressable style={s.catalogBtn} onPress={onOpenCatalog}>
        <Text style={s.catalogText}>Voir plus dans le catalogue</Text>
      </Pressable>
    </View>
  );
}

const s = StyleSheet.create({
  container: { flex: 1 },
  header: { alignItems: 'center', paddingTop: 24, paddingBottom: 8 },
  title: { fontFamily: 'PlayfairDisplay_600SemiBold', fontSize: 20, color: theme.colors.text, marginTop: 8 },
  list: { paddingBottom: 16 },
  catalogBtn: { alignSelf: 'center', marginVertical: 16, paddingVertical: 10, paddingHorizontal: 20 },
  catalogText: { color: theme.colors.primary, fontWeight: '600', fontSize: 15 },
});
