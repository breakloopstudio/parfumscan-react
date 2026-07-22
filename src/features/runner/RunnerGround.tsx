// src/features/runner/RunnerGround.tsx — Sol defilant

import { memo } from 'react';
import { View } from 'react-native';
import Animated, {
  useAnimatedStyle,
  type SharedValue,
} from 'react-native-reanimated';

interface Props {
  groundOffset: SharedValue<number>;
  groundY: number;
  screenW: number;
}

const TILE_W = 80;
const MARK_COUNT = 30;

function RunnerGround({ groundOffset, groundY, screenW }: Props) {
  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: -groundOffset.value }],
  }));

  return (
    <View style={{ position: 'absolute', top: groundY, left: 0, right: 0, height: 60, overflow: 'hidden' }}>
      <View style={{ position: 'absolute', top: 0, left: 0, right: 0, height: 2, backgroundColor: '#2A2238', opacity: 0.5 }} />
      <View style={{ position: 'absolute', top: 2, left: 0, right: 0, bottom: 0, backgroundColor: '#0F0A1A' }} />
      <Animated.View style={[{ flexDirection: 'row', position: 'absolute', top: 8, left: 0, zIndex: 1 }, animatedStyle]}>
        {Array.from({ length: MARK_COUNT }, (_, i) => (
          <View
            key={i}
            style={{ width: TILE_W, alignItems: 'center' }}
          >
            <View style={{ width: 12, height: 3, backgroundColor: '#2A2238', opacity: 0.3 }} />
          </View>
        ))}
      </Animated.View>
    </View>
  );
}

export default memo(RunnerGround);
