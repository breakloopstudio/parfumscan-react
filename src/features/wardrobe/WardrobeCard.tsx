// src/features/wardrobe/WardrobeCard.tsx

import { useMemo } from 'react';
import { View, Text } from 'react-native';
import Ionicons from '@react-native-vector-icons/ionicons/static';
import ParfumCard from '../../components/ParfumCard';
import StarRating from './StarRating';
import { wardrobeToCardItem, ownershipLabel } from '../../utils/ownership';
import { useTheme, type Theme } from '../../theme/ThemeContext';
import type { WardrobeItem } from '../../models/wardrobe.interface';

interface Props {
  item: WardrobeItem;
  onPress: () => void;
}

export default function WardrobeCard({ item, onPress }: Props) {
  const { theme } = useTheme();
  const s = useMemo(() => getStyles(theme), [theme]);
  const cardItem = useMemo(() => wardrobeToCardItem(item), [item]);

  const badgeStyle = useMemo(() => {
    const base: Record<string, { bg: string; color: string }> = {
      have: { bg: theme.colors.primary, color: '#FFFFFF' },
      want: { bg: theme.colors.secondary, color: '#1F1A2E' },
      had: { bg: theme.colors.textMuted + 'B3', color: '#FFFFFF' },
      sample: { bg: theme.colors.deal, color: '#FFFFFF' },
      decant: { bg: theme.colors.dealSoft, color: theme.colors.deal },
    };
    return base[item.ownership] ?? base.have;
  }, [item.ownership, theme]);

  return (
    <View style={s.wrapper}>
      <View style={s.cardWrap}>
        <ParfumCard parfum={cardItem} mode="compact" onPressOverride={onPress} />

        {item.rating !== null && item.rating > 0 && (
          <View style={s.ratingOverlay}>
            <StarRating rating={item.rating} size={12} interactive={false} />
          </View>
        )}

        <View style={[s.badge, { backgroundColor: badgeStyle.bg }]}>
          <Text style={[s.badgeText, { color: badgeStyle.color }]}>
            {ownershipLabel(item.ownership)}
          </Text>
        </View>

        {item.notes && item.notes.trim().length > 0 && (
          <View style={s.noteIcon}>
            <Ionicons name="document-text" size={11} color="#FFFFFF" />
          </View>
        )}

        {item.isSignature && (
          <View style={s.signatureBadge}>
            <Ionicons name="star" size={10} color={theme.colors.secondary} />
          </View>
        )}
      </View>
    </View>
  );
}

function getStyles(t: Theme) {
  return {
    wrapper: {
      flex: 1,
      maxWidth: '50%',
    },
    cardWrap: {
      position: 'relative',
    } as const,
    ratingOverlay: {
      position: 'absolute',
      top: 6,
      left: 6,
      backgroundColor: 'rgba(0,0,0,0.55)',
      paddingHorizontal: 6,
      paddingVertical: 3,
      borderRadius: 10,
      flexDirection: 'row',
      alignItems: 'center',
      gap: 1,
    },
    badge: {
      position: 'absolute',
      top: 6,
      right: 6,
      paddingHorizontal: 8,
      paddingVertical: 3,
      borderRadius: 10,
    },
    badgeText: {
      fontFamily: 'Inter_600SemiBold',
      fontSize: 10,
    },
    noteIcon: {
      position: 'absolute',
      bottom: 8,
      left: 6,
      width: 22,
      height: 22,
      borderRadius: 11,
      backgroundColor: 'rgba(0,0,0,0.55)',
      justifyContent: 'center',
      alignItems: 'center',
    },
    signatureBadge: {
      position: 'absolute',
      bottom: 8,
      right: 6,
      width: 22,
      height: 22,
      borderRadius: 11,
      backgroundColor: 'rgba(0,0,0,0.55)',
      justifyContent: 'center',
      alignItems: 'center',
    },
  } as const;
}
