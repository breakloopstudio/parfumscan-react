// src/features/runner/RunnerBottle.tsx — Flacon joueur anime

import { memo } from 'react';
import { View } from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  useAnimatedReaction,
  withSpring,
  type SharedValue,
} from 'react-native-reanimated';
import { BOTTLE_WIDTH, BOTTLE_HEIGHT } from './runner-types';

interface Props {
  bottleX: number;
  bottleY: SharedValue<number>;
  isJumping: SharedValue<boolean>;
  isDoubleJumping: SharedValue<boolean>;
  landingTrigger: SharedValue<number>;
  gameState: SharedValue<string>;
  bottleColor?: string;
  capColor?: string;
}

function RunnerBottle({
  bottleX,
  bottleY,
  isJumping,
  isDoubleJumping: _isDoubleJumping,
  landingTrigger,
  gameState,
  bottleColor = '#6C3ED9',
  capColor = '#D4A960',
}: Props) {
  const bottleStyle = useAnimatedStyle(() => ({
    transform: [
      { translateX: bottleX },
      { translateY: bottleY.value - BOTTLE_HEIGHT },
    ],
  }));

  const sqX = useSharedValue(1);
  const sqY = useSharedValue(1);
  const bottleOpacity = useSharedValue(1);
  const flashOpacity = useSharedValue(0);

  useAnimatedReaction(
    () => landingTrigger.value,
    () => {
      sqY.value = 0.78;
      sqX.value = 1.25;
      sqY.value = withSpring(1, { damping: 10, stiffness: 300 });
      sqX.value = withSpring(1, { damping: 10, stiffness: 300 });
    },
  );

  useAnimatedReaction(
    () => gameState.value,
    (state) => {
      if (state === 'dying') {
        flashOpacity.value = 1;
        flashOpacity.value = withSpring(0, { damping: 12, stiffness: 200 });
        bottleOpacity.value = 0.35;
      }
      if (state === 'idle' || state === 'playing') {
        bottleOpacity.value = 1;
        flashOpacity.value = 0;
        sqX.value = 1;
        sqY.value = 1;
      }
    },
  );

  const bodyStyle = useAnimatedStyle(() => {
    const airStretch = isJumping.value
      ? 1 + Math.abs(bottleY.value) * 0.0001
      : 1;
    return {
      transform: [
        { scaleX: Math.min(1.12, airStretch * 0.95 + 0.05) * sqX.value },
        { scaleY: Math.min(1.12, airStretch) * sqY.value },
      ],
      opacity: bottleOpacity.value,
    };
  });

  const flashStyle = useAnimatedStyle(() => ({
    position: 'absolute' as const,
    top: 0, left: 0, right: 0, bottom: 0,
    backgroundColor: '#FFFFFF',
    opacity: flashOpacity.value,
    borderRadius: 4,
  }));

  return (
    <Animated.View
      style={[
        {
          position: 'absolute',
          left: 0,
          top: 0,
          width: BOTTLE_WIDTH,
          height: BOTTLE_HEIGHT,
        },
        bottleStyle,
      ]}
    >
      <Animated.View style={[{ width: BOTTLE_WIDTH, height: BOTTLE_HEIGHT }, bodyStyle]}>
        <View style={{ width: 14, height: 10, backgroundColor: capColor, borderRadius: 3, alignSelf: 'center' }} />
        <View style={{ width: 8, height: 8, backgroundColor: bottleColor, alignSelf: 'center' }} />
        <View style={{ flex: 1, backgroundColor: bottleColor, borderBottomLeftRadius: 8, borderBottomRightRadius: 8, alignItems: 'center' }}>
          <View style={{ width: 14, height: 12, backgroundColor: capColor, borderRadius: 2, marginTop: 6 }} />
        </View>
      </Animated.View>
      <Animated.View style={flashStyle} pointerEvents="none" />
    </Animated.View>
  );
}

export default memo(RunnerBottle);
