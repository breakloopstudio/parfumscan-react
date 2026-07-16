// src/components/AppLoader.tsx — Spinner avec message

import { useMemo } from 'react';
import { View, Text, ActivityIndicator } from 'react-native';
import { useTheme, type Theme } from '../theme/ThemeContext';

interface Props { message?: string; }

export default function AppLoader({ message = 'Chargement en cours…' }: Props) {
  const { theme } = useTheme();
  const s = useMemo(() => getStyles(theme), [theme]);
  return (
    <View style={s.container}>
      <ActivityIndicator size="large" color={theme.colors.primary} />
      <Text style={s.text}>{message}</Text>
    </View>
  );
}

function getStyles(t: Theme) {
  return {
    container: { flex: 1, justifyContent: 'center', alignItems: 'center', gap: 16, padding: 32 },
    text: { color: t.colors.textMuted, fontSize: 15 },
  } as const;
}