// src/features/wardrobe/StarRating.tsx

import { useMemo } from 'react';
import { View, Pressable, type ViewStyle } from 'react-native';
import Animated, { useSharedValue, withSpring, useAnimatedStyle } from 'react-native-reanimated';
import Ionicons from '@react-native-vector-icons/ionicons/static';
import { useTheme, type Theme } from '../../theme/ThemeContext';

interface Props {
  rating: number;
  size?: number;
  interactive?: boolean;
  onChange?: (rating: number) => void;
  style?: ViewStyle;
}

export default function StarRating({ rating, size = 24, interactive = true, onChange, style }: Props) {
  const { theme } = useTheme();
  const s = useMemo(() => getStyles(theme), [theme]);
  const scale = useSharedValue(1);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  const handlePress = (n: number) => {
    if (!interactive || !onChange) return;
    scale.value = withSpring(1.15, { damping: 12, stiffness: 300 }, () => {
      scale.value = withSpring(1, { damping: 12, stiffness: 300 });
    });
    onChange(rating === n ? 0 : n);
  };

  return (
    <Animated.View style={[s.row, style, animatedStyle]}>
      {[1, 2, 3, 4, 5].map(n => (
        <Pressable
          key={n}
          onPress={() => handlePress(n)}
          hitSlop={8}
          disabled={!interactive}
        >
          <Ionicons
            name={n <= rating ? 'star' : 'star-outline'}
            size={size}
            color={n <= rating ? theme.colors.secondary : theme.colors.textMuted}
          />
        </Pressable>
      ))}
    </Animated.View>
  );
}

function getStyles(_t: Theme) {
  return {
    row: {
      flexDirection: 'row',
      gap: 4,
      alignItems: 'center',
    },
  } as const;
}
