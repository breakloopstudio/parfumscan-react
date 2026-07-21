// src/features/runner/RunnerBackground.tsx — 3 couches parallaxe

import { useMemo, memo } from 'react';
import { View, useWindowDimensions } from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  type SharedValue,
} from 'react-native-reanimated';

interface Props {
  bgOffset: SharedValue<number>;
  midOffset: SharedValue<number>;
}

const FAR_HILLS_COUNT = 6;
const MID_SHELVES_COUNT = 5;
const FAR_LAYER_W = 1200;
const MID_LAYER_W = 1400;

const SKY_COLORS = ['#0B0712', '#10091C', '#0D0818', '#120A1F', '#0B0712'];

function RunnerBackground({ bgOffset, midOffset }: Props) {
  const { width: screenW, height: screenH } = useWindowDimensions();

  const starPositions = useMemo(() =>
    Array.from({ length: 40 }, () => ({
      x: Math.random() * screenW,
      y: Math.random() * screenH * 0.65,
      size: 1 + Math.random() * 2,
      opacity: 0.2 + Math.random() * 0.6,
    })),
    [screenW, screenH],
  );

  const farStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: -bgOffset.value }],
  }));

  const midStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: -midOffset.value }],
  }));

  return (
    <View style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0 }}>
      {starPositions.map((s, i) => (
        <View
          key={i}
          style={{
            position: 'absolute',
            left: s.x,
            top: s.y,
            width: s.size,
            height: s.size,
            borderRadius: s.size,
            backgroundColor: '#FFFFFF',
            opacity: s.opacity,
          }}
        />
      ))}

      <Animated.View style={[{ position: 'absolute', top: '55%', height: '15%', width: FAR_LAYER_W * 2 }, farStyle]}>
        {Array.from({ length: FAR_HILLS_COUNT }, (_, i) => (
          <View
            key={i}
            style={{
              position: 'absolute',
              left: i * 220 + 40,
              bottom: 0,
              width: 160 + (i % 3) * 40,
              height: 40 + (i % 2) * 30,
              backgroundColor: '#15101E',
              borderTopLeftRadius: 80,
              borderTopRightRadius: 80,
              opacity: 0.6,
            }}
          />
        ))}
      </Animated.View>

      <Animated.View style={[{ position: 'absolute', top: '62%', height: '12%', width: MID_LAYER_W * 2 }, midStyle]}>
        {Array.from({ length: MID_SHELVES_COUNT }, (_, i) => (
          <View
            key={i}
            style={{
              position: 'absolute',
              left: i * 280 + 60,
              bottom: 0,
              width: 200 + (i % 3) * 60,
              height: 6,
              backgroundColor: '#2A2238',
              opacity: 0.4,
            }}
          />
        ))}
        {Array.from({ length: 8 }, (_, i) => (
          <View
            key={`b${i}`}
            style={{
              position: 'absolute',
              left: i * 180 + 30 + (i % 3) * 40,
              bottom: 6,
              width: 14 + (i % 2) * 6,
              height: 28 + (i % 3) * 12,
              backgroundColor: '#1D1728',
              borderTopLeftRadius: 3,
              borderTopRightRadius: 3,
              opacity: 0.35,
            }}
          />
        ))}
      </Animated.View>

      <View style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0 }}>
        {Array.from({ length: 5 }, (_, i) => (
          <View
            key={`sky${i}`}
            style={{
              position: 'absolute',
              top: `${i * 20}%`,
              left: 0,
              right: 0,
              height: '22%',
              backgroundColor: SKY_COLORS[i],
              opacity: 0.3,
            }}
          />
        ))}
      </View>
    </View>
  );
}

export default memo(RunnerBackground);
