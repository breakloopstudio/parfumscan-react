// src/features/scan/ScanError.tsx — Erreur + retry

import { useMemo } from 'react';
import { View, Text, Pressable } from 'react-native';
import Ionicons from "@react-native-vector-icons/ionicons/static";
import { useTheme, type Theme } from '../../theme/ThemeContext';

interface Props { message: string; onReset: () => void; }

export function ScanError({ message, onReset }: Props) {
  const { theme } = useTheme();
  const s = useMemo(() => getStyles(theme), [theme]);
  return (
    <View style={s.container}>
      <Ionicons name="alert-circle-outline" size={64} color={theme.colors.danger} />
      <Text style={s.title}>Oups, une erreur</Text>
      <Text style={s.desc}>{message}</Text>
      <Pressable style={s.btn} onPress={onReset}>
        <Ionicons name="refresh-outline" size={20} color="#FFF" style={{ marginRight: 8 }} />
        <Text style={s.btnText}>Réessayer</Text>
      </Pressable>
    </View>
  );
}

function getStyles(t: Theme) {
  return {
    container: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 32 },
    title: { fontFamily: 'PlayfairDisplay_600SemiBold', fontSize: 20, color: t.colors.text, marginTop: 16, marginBottom: 8 },
    desc: { fontSize: 14, color: t.colors.textMuted, textAlign: 'center', lineHeight: 20, marginBottom: 24 },
    btn: { flexDirection: 'row', backgroundColor: t.colors.primary, borderRadius: t.radius.base, height: 48, paddingHorizontal: 24, justifyContent: 'center', alignItems: 'center', ...t.shadow.button },
    btnText: { color: '#FFF', fontFamily: 'Inter_600SemiBold', fontSize: 16 },
  } as const;
}