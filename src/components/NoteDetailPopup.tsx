// src/components/NoteDetailPopup.tsx — Popup descriptif d'une note olfactive
// Overlay centré, tap n'importe où pour fermer

import { useMemo, useEffect } from 'react';
import { View, Text, Pressable, useWindowDimensions } from 'react-native';
import Ionicons from '@react-native-vector-icons/ionicons/static';
import Animated, { useSharedValue, useAnimatedStyle, withTiming, cancelAnimation } from 'react-native-reanimated';
import { useTheme, type Theme } from '../theme/ThemeContext';
import { translateNote } from '../utils/translate-note';
import { getNoteEmoji, getNoteDescription } from '../utils/note-descriptions';

interface Props {
  visible: boolean;
  noteName: string;
  onClose: () => void;
}

export default function NoteDetailPopup({ visible, noteName, onClose }: Props) {
  const { theme } = useTheme();
  const s = useMemo(() => getStyles(theme), [theme]);
  const { width: screenWidth } = useWindowDimensions();

  const opacity = useSharedValue(0);
  const scale = useSharedValue(0.92);

  useEffect(() => {
    if (!visible) return;
    opacity.value = withTiming(1, { duration: 250 });
    scale.value = withTiming(1, { duration: 250 });
    return () => {
      cancelAnimation(opacity);
      cancelAnimation(scale);
    };
  }, [visible]);

  const animStyle = useAnimatedStyle(() => ({
    opacity: opacity.value,
    transform: [{ scale: scale.value }],
  }));

  const displayName = translateNote(noteName);
  const emoji = getNoteEmoji(noteName);
  const description = getNoteDescription(noteName);
  const cardWidth = Math.min(300, screenWidth - 64);

  if (!visible) return null;

  return (
    <View style={s.backdrop}>
      <Pressable
        style={s.backdropTouch}
        onPress={onClose}
        accessibilityRole="button"
        accessibilityLabel="Fermer le détail de la note"
      />
      <Animated.View style={[s.card, { width: cardWidth }, animStyle]}>
        <Pressable onPress={onClose} style={s.closeBtn} hitSlop={12}>
          <Ionicons name="close" size={20} color={theme.colors.textMuted} />
        </Pressable>

        <View style={s.emojiCircle}>
          <Text style={s.emojiText}>{emoji}</Text>
        </View>

        <Text style={s.noteName}>{displayName}</Text>

        <Text style={s.description}>{description}</Text>
      </Animated.View>
    </View>
  );
}

function getStyles(t: Theme) {
  return {
    backdrop: {
      position: 'absolute' as const,
      inset: 0,
      zIndex: 100,
      justifyContent: 'center' as const,
      alignItems: 'center' as const,
    },
    backdropTouch: {
      ...({ position: 'absolute' as const, inset: 0, backgroundColor: 'rgba(0,0,0,0.4)' } as const),
    },
    card: {
      backgroundColor: t.colors.surface,
      borderRadius: t.radius.card,
      paddingHorizontal: 24,
      paddingTop: 36,
      paddingBottom: 28,
      alignItems: 'center' as const,
      ...t.shadow.card,
    },
    closeBtn: {
      position: 'absolute' as const,
      top: 12,
      right: 12,
      width: 32,
      height: 32,
      borderRadius: 16,
      backgroundColor: t.colors.surface2,
      justifyContent: 'center' as const,
      alignItems: 'center' as const,
    },
    emojiCircle: {
      width: 56,
      height: 56,
      borderRadius: 28,
      backgroundColor: t.colors.primarySoft,
      justifyContent: 'center' as const,
      alignItems: 'center' as const,
      marginBottom: 14,
    },
    emojiText: {
      fontSize: 26,
    },
    noteName: {
      fontFamily: 'PlayfairDisplay_600SemiBold',
      fontSize: 20,
      color: t.colors.text,
      textAlign: 'center' as const,
      marginBottom: 10,
    },
    description: {
      fontFamily: 'Inter_400Regular',
      fontSize: 14,
      lineHeight: 21,
      color: t.colors.text,
      textAlign: 'center' as const,
    },
  } as const;
}
