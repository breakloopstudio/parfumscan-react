// src/components/Button.tsx — Bouton atomique 4 variantes × 3 états

import { useMemo } from 'react';
import { Pressable, Text, ActivityIndicator, type ViewStyle } from 'react-native';
import Ionicons from '@react-native-vector-icons/ionicons/static';
import { useTheme, type Theme } from '../theme/ThemeContext';

type Variant = 'primary' | 'secondary' | 'outline' | 'ghost';

interface Props {
  variant?: Variant;
  onPress: () => void;
  loading?: boolean;
  disabled?: boolean;
  icon?: string;
  children: string;
  style?: ViewStyle;
}

export default function Button({
  variant = 'primary',
  onPress,
  loading = false,
  disabled = false,
  icon,
  children,
  style,
}: Props) {
  const { theme } = useTheme();
  const s = useMemo(() => getStyles(theme), [theme]);
  const isDisabled = disabled || loading;

  const bg = variant === 'primary' ? theme.colors.primary
    : variant === 'secondary' ? theme.colors.secondary
    : 'transparent';

  const fg = variant === 'primary' || variant === 'secondary' ? '#FFFFFF'
    : variant === 'outline' ? theme.colors.primary
    : theme.colors.primary;

  const border = variant === 'outline'
    ? { borderWidth: 1.5, borderColor: theme.colors.primary }
    : {};

  const shadow = variant === 'primary'
    ? theme.shadow.button
    : variant === 'secondary'
    ? { shadowColor: theme.colors.secondary, shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.25, shadowRadius: 10, elevation: 4 }
    : {};

  return (
    <Pressable
      onPress={onPress}
      disabled={isDisabled}
      style={({ pressed }) => [
        s.base,
        { backgroundColor: bg },
        border,
        shadow,
        isDisabled && { opacity: variant === 'ghost' ? 0.4 : 0.5 },
        pressed && !isDisabled && (variant === 'ghost'
          ? { backgroundColor: theme.colors.primarySoft }
          : { opacity: 0.85 }),
        style,
      ]}
    >
      {loading ? (
        <ActivityIndicator size="small" color={fg} style={s.loader} />
      ) : icon ? (
        <Ionicons name={icon as never} size={20} color={fg} style={s.icon} />
      ) : null}
      <Text style={[s.label, { color: fg }, variant === 'ghost' && { fontFamily: 'Inter_600SemiBold' }]}>
        {children}
      </Text>
    </Pressable>
  );
}

function getStyles(t: Theme) {
  return {
    base: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      height: 50,
      borderRadius: t.radius.base,
      paddingHorizontal: 24,
      gap: 8,
    },
    label: {
      fontSize: t.fonts.size.md,
      fontFamily: 'Inter_600SemiBold',
    },
    loader: {
      marginRight: 4,
    },
    icon: {
      marginRight: 2,
    },
  } as const;
}
