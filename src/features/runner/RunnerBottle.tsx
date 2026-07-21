// src/features/runner/RunnerBottle.tsx — Flacon joueur animé

import { View } from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  useAnimatedReaction,
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
}

export default function RunnerBottle({
  bottleX,
  bottleY,
  isJumping,
  isDoubleJumping,
  landingTrigger,
  gameState,
}: Props) {
  const bottleStyle = useAnimatedStyle(() => ({
    transform: [
      { translateX: bottleX },
      { translateY: bottleY.value - BOTTLE_HEIGHT },
    ],
  }));

  const squashScaleX = useSharedValue(1);
  const squashScaleY = useSharedValue(1);
  const bottleRotation = useSharedValue(0);

  useAnimatedReaction(
    () => isDoubleJumping.value,
    (isDouble) => {
      if (isDouble) {
        bottleRotation.value = 0;
      }
    },
  );

  useAnimatedReaction(
    () => landingTrigger.value,
    () => {
      squashScaleX.value = 1;
      squashScaleY.value = 1;
    },
  );

  const bodyStyle = useAnimatedStyle(() => ({
    transform: [
      { scaleX: squashScaleX.value },
      { scaleY: squashScaleY.value },
    ],
  }));

  const flipStyle = useAnimatedStyle(() => {
    const rot = bottleRotation.value;
    return {
      transform: [{ rotateZ: `${rot}deg` }],
    };
  });

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
        flipStyle,
      ]}
    >
      <Animated.View style={[{ width: BOTTLE_WIDTH, height: BOTTLE_HEIGHT }, bodyStyle]}>
        <View
          style={{
            width: 14,
            height: 10,
            backgroundColor: '#D4A960',
            borderRadius: 3,
            alignSelf: 'center',
          }}
        />
        <View
          style={{
            width: 8,
            height: 8,
            backgroundColor: '#6C3ED9',
            alignSelf: 'center',
          }}
        />
        <View
          style={{
            flex: 1,
            backgroundColor: '#6C3ED9',
            borderBottomLeftRadius: 8,
            borderBottomRightRadius: 8,
            alignItems: 'center',
          }}
        >
          <View
            style={{
              width: 14,
              height: 12,
              backgroundColor: '#D4A960',
              borderRadius: 2,
              marginTop: 6,
            }}
          />
        </View>
      </Animated.View>
    </Animated.View>
  );
}
