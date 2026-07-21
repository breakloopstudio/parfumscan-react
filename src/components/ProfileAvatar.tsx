// src/components/ProfileAvatar.tsx — Avatar cliquable (photo Google ou initiale)

import { useState, useMemo } from 'react';
import { View, Pressable, Text } from 'react-native';
import { Image } from 'expo-image';
import { useRouter } from 'expo-router';
import { useAuthContext } from '../contexts/AuthContext';
import { useTheme, type Theme } from '../theme/ThemeContext';

export default function ProfileAvatar() {
  const { theme } = useTheme();
  const s = useMemo(() => getStyles(theme), [theme]);
  const { user } = useAuthContext();
  const router = useRouter();
  const [failed, setFailed] = useState(false);
  const initial = user?.email?.charAt(0).toUpperCase() ?? '?';

  return (
    <Pressable onPress={() => router.push('/settings')} hitSlop={8}>
      {user?.photoURL && !failed ? (
        <Image
          source={{ uri: user.photoURL }}
          style={s.image}
          contentFit="cover"
          transition={200}
          onError={() => setFailed(true)}
        />
      ) : (
        <View style={s.placeholder}>
          <Text style={s.initial}>{initial}</Text>
        </View>
      )}
    </Pressable>
  );
}

function getStyles(t: Theme) {
  return {
    image: {
      width: 36, height: 36, borderRadius: 18,
      backgroundColor: t.colors.surface2,
    },
    placeholder: {
      width: 36, height: 36, borderRadius: 18,
      backgroundColor: t.colors.primarySoft,
      justifyContent: 'center', alignItems: 'center',
    },
    initial: {
      fontFamily: 'Inter_700Bold',
      fontSize: 14,
      color: t.colors.primaryInk,
    },
  } as const;
}
