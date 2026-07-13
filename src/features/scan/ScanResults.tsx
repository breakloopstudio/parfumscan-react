// src/features/scan/ScanResults.tsx — Résultats : liste de parfums trouvés

import { View, Text, FlatList, Pressable, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import ParfumCard from '../../components/ParfumCard';
import { theme } from '../../theme/theme';
import type { Parfum } from '../../models';

interface Props {
  parfums: Parfum[];
  onOpenCatalog: () => void;
}

export function ScanResults({ parfums, onOpenCatalog }: Props) {
  return (
    <View style={s.container}>
      <View style={s.header}>
        <Ionicons name="checkmark-circle" size={36} color={theme.colors.success} />
        <Text style={s.title}>{parfums.length} parfum{parfums.length > 1 ? 's' : ''} trouvé{parfums.length > 1 ? 's' : ''}</Text>
      </View>
      <FlatList
        data={parfums}
        keyExtractor={p => p.id + p.nom}
        renderItem={({ item }) => <ParfumCard parfum={item} showDeal />}
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
