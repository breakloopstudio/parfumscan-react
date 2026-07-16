// src/features/scan/ScanNoResult.tsx — Aucun résultat + actions

import { useMemo } from 'react';
import { View, Text, Pressable } from 'react-native';
import Ionicons from "@react-native-vector-icons/ionicons/static";
import { useTheme, type Theme } from '../../theme/ThemeContext';

interface Props {
  marque: string | null;
  onSearchCatalog: (marque: string) => void;
  onReset: () => void;
}

export function ScanNoResult({ marque, onSearchCatalog, onReset }: Props) {
  const { theme } = useTheme();
  const s = useMemo(() => getStyles(theme), [theme]);
  return (
    <View style={s.container}>
      <Ionicons name="search-outline" size={64} color={theme.colors.primary} style={{ opacity: 0.6 }} />
      <Text style={s.title}>Parfum introuvable</Text>
      <Text style={s.desc}>Nous n'avons pas trouvé ce parfum dans notre catalogue.{'\n'}Essaie avec une autre orthographe ou explore le catalogue.</Text>
      <View style={s.actions}>
        {marque && (
          <Pressable style={s.cta} onPress={() => onSearchCatalog(marque)}>
            <Ionicons name="book-outline" size={20} color="#FFF" style={{ marginRight: 8 }} />
            <Text style={s.ctaText}>Chercher "{marque}"</Text>
          </Pressable>
        )}
        <Pressable style={s.resetBtn} onPress={onReset}>
          <Ionicons name="refresh-outline" size={18} color={theme.colors.textMuted} style={{ marginRight: 6 }} />
          <Text style={s.resetText}>Réessayer</Text>
        </Pressable>
      </View>
    </View>
  );
}

function getStyles(t: Theme) {
  return {
    container: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 32 },
    title: { fontFamily: 'PlayfairDisplay_600SemiBold', fontSize: 20, color: t.colors.text, marginTop: 16, marginBottom: 8 },
    desc: { fontSize: 14, color: t.colors.textMuted, textAlign: 'center', lineHeight: 20, marginBottom: 24 },
    actions: { width: '100%', maxWidth: 300, gap: 12 },
    cta: { flexDirection: 'row', backgroundColor: t.colors.primary, borderRadius: t.radius.base, height: 48, justifyContent: 'center', alignItems: 'center', ...t.shadow.button },
    ctaText: { color: '#FFF', fontFamily: 'Inter_600SemiBold', fontSize: 16 },
    resetBtn: { flexDirection: 'row', justifyContent: 'center', alignItems: 'center', paddingVertical: 10 },
    resetText: { fontSize: 14, color: t.colors.textMuted },
  } as const;
}