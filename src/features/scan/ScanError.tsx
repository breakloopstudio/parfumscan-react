// src/features/scan/ScanError.tsx — Erreur + retry

import { View, Text, Pressable, StyleSheet } from 'react-native';
import Ionicons from "@react-native-vector-icons/ionicons/static";
import { theme } from '../../theme/theme';

interface Props { message: string; onReset: () => void; }

export function ScanError({ message, onReset }: Props) {
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

const s = StyleSheet.create({
  container: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 32 },
  title: { fontFamily: 'PlayfairDisplay_600SemiBold', fontSize: 20, color: theme.colors.text, marginTop: 16, marginBottom: 8 },
  desc: { fontSize: 14, color: theme.colors.textMuted, textAlign: 'center', lineHeight: 20, marginBottom: 24 },
  btn: { flexDirection: 'row', backgroundColor: theme.colors.primary, borderRadius: theme.radius.base, height: 48, paddingHorizontal: 24, justifyContent: 'center', alignItems: 'center', ...theme.shadow.button },
  btnText: { color: '#FFF', fontFamily: 'Inter_600SemiBold', fontSize: 16 },
});
