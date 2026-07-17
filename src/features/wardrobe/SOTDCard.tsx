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
            <Ionicons name="flask-outline" size={20} color={theme.colors.primaryInk} />
          </View>
        )}
        <View style={s.info}>
          <Text style={s.name} numberOfLines={1}>{sotd.nom}</Text>
          <Text style={s.brand} numberOfLines={1}>{sotd.marque}</Text>
          <View style={s.badge}>
            <Text style={s.badgeText}>Porté aujourd'hui</Text>
          </View>
        </View>
        <Pressable onPress={onChangePress} hitSlop={12} style={s.changeBtn}>
          <Text style={s.changeText}>Changer</Text>
        </Pressable>
      </Pressable>
    );
  }

  return (
    <Pressable style={s.card} onPress={onChangePress}>
      <View style={s.placeholder}>
        <Ionicons name="sunny-outline" size={24} color={theme.colors.primaryInk} />
      </View>
      <View style={s.info}>
        <Text style={s.emptyTitle}>Quel parfum portez-vous aujourd'hui ?</Text>
      </View>
      <View style={s.changeBtn}>
        <Text style={s.changeText}>Choisir</Text>
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
      borderRadius: t.radius.card,
      padding: 14,
      marginHorizontal: 16,
      marginVertical: 8,
      gap: 12,
    },
    image: {
      width: 44,
      height: 44,
      borderRadius: 8,
      backgroundColor: t.colors.surface2,
    },
    placeholder: {
      width: 44,
      height: 44,
      borderRadius: 8,
      backgroundColor: t.colors.primarySoft,
      justifyContent: 'center',
      alignItems: 'center',
    },
    info: {
      flex: 1,
    },
    name: {
      fontFamily: 'Inter_600SemiBold',
      fontSize: 15,
      color: t.colors.text,
    },
    brand: {
      fontFamily: 'Inter_400Regular',
      fontSize: 12,
      color: t.colors.textMuted,
      marginTop: 1,
    },
    emptyTitle: {
      fontFamily: 'Inter_500Medium',
      fontSize: 14,
      color: t.colors.primaryInk,
    },
    badge: {
      marginTop: 4,
      alignSelf: 'flex-start',
      backgroundColor: t.colors.primary,
      paddingHorizontal: 8,
      paddingVertical: 2,
      borderRadius: 8,
    },
    badgeText: {
      fontFamily: 'Inter_600SemiBold',
      fontSize: 10,
      color: '#FFFFFF',
    },
    changeBtn: {
      paddingHorizontal: 12,
      paddingVertical: 8,
    },
    changeText: {
      fontFamily: 'Inter_600SemiBold',
      fontSize: 13,
      color: t.colors.primary,
    },
  } as const;
}
