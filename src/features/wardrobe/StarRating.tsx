// src/features/wardrobe/StarRating.tsx

import { useMemo, useState, useCallback } from 'react';
import { View, type ViewStyle, type LayoutChangeEvent } from 'react-native';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import Animated, { useSharedValue, useAnimatedStyle, withTiming, runOnJS } from 'react-native-reanimated';
import Ionicons from '@react-native-vector-icons/ionicons/static';
import { useTheme, type Theme } from '../../theme/ThemeContext';

const GAP = 4;

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
  const [previewRating, setPreviewRating] = useState(-1);

  const displayRating = previewRating >= 0 ? previewRating : rating;
  const dragScale = useSharedValue(1);
  const gestureCommitted = useSharedValue(false);
  const measuredRowWidth = useSharedValue(0);

  const handleRowLayout = useCallback((e: LayoutChangeEvent) => {
    measuredRowWidth.value = e.nativeEvent.layout.width;
  }, []);

  const xToRating = (x: number) => {
    'worklet';
    const step = size + GAP;
    const maxX = measuredRowWidth.value > 0 ? measuredRowWidth.value : 5 * size + 4 * GAP;
    const clamped = Math.max(0, Math.min(x, maxX));
    const starIdx = Math.floor(clamped / step);
    if (starIdx >= 5) return 5;
    const localX = clamped - starIdx * step;
    if (starIdx === 0 && localX < size / 4) return 0;
    return starIdx + (localX >= size / 2 ? 1 : 0.5);
  };

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: dragScale.value }],
    transformOrigin: 'left center',
  }));

  const gesture = useMemo(() => {
    if (!interactive || !onChange) return Gesture.Pan().enabled(false);

    return Gesture.Pan()
      .onBegin((e) => {
        gestureCommitted.value = false;
        dragScale.value = withTiming(1.15, { duration: 120 });
        runOnJS(setPreviewRating)(xToRating(e.x));
      })
      .onUpdate((e) => {
        runOnJS(setPreviewRating)(xToRating(e.x));
      })
      .onEnd((e) => {
        gestureCommitted.value = true;
        const r = xToRating(e.x);
        runOnJS(setPreviewRating)(-1);
        runOnJS(onChange)(r);
      })
      .onFinalize((e) => {
        if (!gestureCommitted.value) {
          const r = xToRating(e.x);
          runOnJS(setPreviewRating)(-1);
          runOnJS(onChange)(r);
        }
        dragScale.value = withTiming(1, { duration: 150 });
      });
  }, [interactive, onChange, rating, size]);

  const getIconName = (n: number) => {
    if (displayRating >= n) return 'star';
    if (displayRating >= n - 0.5) return 'star-half';
    return 'star-outline';
  };

  const getIconColor = (n: number) => {
    if (displayRating >= n || displayRating >= n - 0.5) return theme.colors.secondary;
    return theme.colors.textMuted;
  };

  const content = (
    <View style={s.row} onLayout={handleRowLayout}>
      {[1, 2, 3, 4, 5].map(n => (
        <View key={n}>
          <Ionicons
            name={getIconName(n)}
            size={size}
            color={getIconColor(n)}
          />
        </View>
      ))}
    </View>
  );

  if (!interactive) return <View style={style}>{content}</View>;

  return (
    <GestureDetector gesture={gesture}>
      <Animated.View style={[style, animatedStyle]}>
        {content}
      </Animated.View>
    </GestureDetector>
  );
}

function getStyles(_t: Theme) {
  return {
    row: {
      flexDirection: 'row',
      gap: GAP,
      alignItems: 'center',
    },
  } as const;
}
