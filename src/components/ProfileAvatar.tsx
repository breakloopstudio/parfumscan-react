// src/components/ProfileAvatar.tsx — Avatar cliquable (photo Google ou initiale)
// Partagé par les écrans Favoris, Historique, Collection

import { useState } from 'react';
import { View, Pressable, Text } from 'react-native';
import { Image } from 'expo-image';
import { useRouter } from 'expo-router';
import { useAuthContext } from '../contexts/AuthContext';
import { useTheme, type Theme } from '../theme/ThemeContext';

export default function ProfileAvatar() {
  const { theme } = useTheme();
  const { user } = useAuthContext();
  const router = useRouter();
  const [failed, setFailed] = useState(false);
  const initial = user?.email?.charAt(0).toUpperCase() ?? '?';

  return (
    <Pressable onPress={() => router.push('/settings')} hitSlop={8}>
      {user?.photoURL && !failed ? (
        <Image
          source={{ uri: user.photoURL }}
          style={{
            width: 36, height: 36, borderRadius: 18,
            backgroundColor: theme.colors.surface2,
          }}
          contentFit="cover"
          transition={200}
          onError={() => setFailed(true)}
        />
      ) : (
        <View
          style={{
            width: 36, height: 36, borderRadius: 18,
            backgroundColor: theme.colors.primarySoft,
            justifyContent: 'center', alignItems: 'center',
          }}
        >
          <Text style={{
            fontFamily: 'Inter_700Bold',
            fontSize: 14,
            color: theme.colors.primaryInk ?? theme.colors.primary,
          }}>
            {initial}
          </Text>
        </View>
      )}
    </Pressable>
  );
}
