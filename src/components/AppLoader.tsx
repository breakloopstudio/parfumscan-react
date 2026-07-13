// src/components/AppLoader.tsx — Spinner avec message

import { View, Text, ActivityIndicator, StyleSheet } from 'react-native';
import { theme } from '../theme/theme';

interface Props { message?: string; }

export default function AppLoader({ message = 'Chargement en cours…' }: Props) {
  return (
    <View style={s.container}>
      <ActivityIndicator size="large" color={theme.colors.primary} />
      <Text style={s.text}>{message}</Text>
    </View>
  );
}

const s = StyleSheet.create({
  container: { flex: 1, justifyContent: 'center', alignItems: 'center', gap: 16, padding: 32 },
  text: { color: theme.colors.textMuted, fontSize: 15 },
});
