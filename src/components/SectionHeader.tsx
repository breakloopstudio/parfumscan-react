// src/components/SectionHeader.tsx — Titre + sous-titre + action optionnelle

import { useMemo } from 'react';
import { View, Text, Pressable, type ViewStyle } from 'react-native';
import { useTheme, type Theme } from '../theme/ThemeContext';

interface Props {
  title: string;
  subtitle?: string;
  actionLabel?: string;
  onAction?: () => void;
  style?: ViewStyle;
}

export default function SectionHeader({ title, subtitle, actionLabel, onAction, style }: Props) {
  const { theme } = useTheme();
  const s = useMemo(() => getStyles(theme), [theme]);
  return (
    <View style={[s.container, style]}>
      <View style={s.texts}>
        <Text style={s.title}>{title}</Text>
        {subtitle ? <Text style={s.subtitle}>{subtitle}</Text> : null}
      </View>
      {actionLabel && onAction ? (
        <Pressable onPress={onAction} hitSlop={12} style={s.action}>
          <Text style={s.actionLabel}>{actionLabel}</Text>
        </Pressable>
      ) : null}
    </View>
  );
}

function getStyles(t: Theme) {
  return {
    container: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      paddingVertical: 8,
    },
    texts: {
      flex: 1,
    },
    title: {
      fontFamily: 'PlayfairDisplay_700Bold',
      fontSize: t.fonts.size.lg,
      color: t.colors.text,
    },
    subtitle: {
      fontSize: 13,
      color: t.colors.textMuted,
      marginTop: 2,
    },
    action: {
      paddingVertical: 4,
      paddingHorizontal: 8,
    },
    actionLabel: {
      fontFamily: 'Inter_600SemiBold',
      fontSize: 14,
      color: t.colors.primary,
    },
  } as const;
}