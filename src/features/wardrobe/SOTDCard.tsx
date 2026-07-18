// src/features/wardrobe/SOTDCard.tsx

import { useMemo, useState } from 'react';
import { View, Text, Pressable } from 'react-native';
import { Image } from 'expo-image';
import Ionicons from '@react-native-vector-icons/ionicons/static';
import { useTheme, type Theme } from '../../theme/ThemeContext';
import type { SotdEntry } from '../../models/wardrobe.interface';

interface Props {
  sotd: SotdEntry | null;
  onPress: () => void;
  onChangePress: () => void;
}

export default function SOTDCard({ sotd, onPress, onChangePress }: Props) {
  const { theme } = useTheme();
  const s = useMemo(() => getStyles(theme), [theme]);
  const [imgFailed, setImgFailed] = useState(false);

  if (sotd) {
    return (
      <Pressable style={s.card} onPress={onPress}>
        {sotd.imageUrl && !imgFailed ? (
          <Image
            source={{ uri: sotd.imageUrl }}
            style={s.image}
            contentFit="cover"
            transition={200}
            onError={() => setImgFailed(true)}
          />
        ) : (
          <View style={s.placeholder}>
            <Ionicons name="flask-outline" size={13} color={theme.colors.primaryInk} />
          </View>
        )}
        <View style={s.info}>
          <View style={s.nameRow}>
            <Ionicons name="sunny" size={12} color={theme.colors.primary} />
            <Text style={s.name} numberOfLines={1}>{sotd.nom}</Text>
            <Text style={s.brand} numberOfLines={1}>{sotd.marque}</Text>
          </View>
        </View>
        <Text style={s.sotdLabel}>SOTD</Text>
        <View style={s.spacer} />
        <Pressable onPress={onChangePress} hitSlop={10} style={s.changeBtn}>
          <Ionicons name="swap-horizontal-outline" size={16} color={theme.colors.primary} />
        </Pressable>
      </Pressable>
    );
  }

  return (
    <Pressable style={s.card} onPress={onChangePress}>
      <View style={s.placeholder}>
        <Ionicons name="sunny-outline" size={15} color={theme.colors.primaryInk} />
      </View>
      <Text style={s.emptyTitle}>Parfum du jour ?</Text>
      <View style={s.changeBtn}>
        <Ionicons name="add-circle-outline" size={16} color={theme.colors.primary} />
      </View>
    </Pressable>
  );
}

function getStyles(t: Theme) {
  return {
    card: {
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: t.colors.primarySoft,
      borderRadius: t.radius.base,
      paddingVertical: 6,
      paddingLeft: 8,
      paddingRight: 4,
      marginHorizontal: 16,
      marginVertical: 6,
      gap: 8,
    },
    image: {
      width: 26,
      height: 26,
      borderRadius: 5,
      backgroundColor: t.colors.surface2,
    },
    placeholder: {
      width: 26,
      height: 26,
      borderRadius: 5,
      backgroundColor: t.colors.primarySoft,
      justifyContent: 'center',
      alignItems: 'center',
    },
    info: {
      flex: 1,
    },
    nameRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 5,
    },
    name: {
      fontFamily: 'Inter_600SemiBold',
      fontSize: 12,
      color: t.colors.text,
    },
    brand: {
      fontFamily: 'Inter_400Regular',
      fontSize: 11,
      color: t.colors.textMuted,
      marginLeft: 2,
    },
    emptyTitle: {
      flex: 1,
      fontFamily: 'Inter_500Medium',
      fontSize: 12,
      color: t.colors.primaryInk,
    },
    changeBtn: {
      padding: 6,
    },
    sotdLabel: {
      fontFamily: 'Inter_600SemiBold',
      fontSize: 9,
      color: t.colors.primary,
      borderWidth: 0.5,
      borderColor: t.colors.primary,
      borderRadius: 4,
      paddingHorizontal: 4,
      paddingVertical: 1,
      lineHeight: 13,
    },
    spacer: {
      width: 4,
    },
  } as const;
}
