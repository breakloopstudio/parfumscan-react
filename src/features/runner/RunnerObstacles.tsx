// src/features/runner/RunnerObstacles.tsx — Pool d'obstacles

import { memo } from 'react';
import { View } from 'react-native';
import Animated, { useAnimatedStyle, type SharedValue } from 'react-native-reanimated';
import { OBSTACLE_DEFS, OBSTACLE_POOL_SIZE, FLYING_OBSTACLE_Y_OFFSET } from './runner-types';

interface ObsSlot { active: SharedValue<boolean>; x: SharedValue<number>; type: SharedValue<number>; }

interface Props { obs: ObsSlot[]; groundY: number; }

const C = ['#1D1728', '#221930', '#2A2238', '#1A1420'];

function Crystal({ defIndex }: { defIndex: number }) {
  const d = OBSTACLE_DEFS[defIndex] ?? OBSTACLE_DEFS[0];
  return <View style={{ width: d.width, height: d.height, backgroundColor: C[defIndex % 4], borderTopLeftRadius: 6, borderTopRightRadius: 6, borderBottomLeftRadius: 3, borderBottomRightRadius: 3, opacity: 0.85 }}>
    <View style={{ position: 'absolute', top: 3, left: 3, right: 3, height: 2, backgroundColor: 'rgba(255,255,255,0.08)', borderRadius: 1 }} />
  </View>;
}

function Slot({ slot, groundY }: { slot: ObsSlot; groundY: number }) {
  const a = slot.active; const x = slot.x; const t = slot.type;

  const pos = useAnimatedStyle(() => {
    const d = OBSTACLE_DEFS[t.value] ?? OBSTACLE_DEFS[0];
    const y = d.airborne ? groundY - FLYING_OBSTACLE_Y_OFFSET : groundY - d.height;
    return { transform: [{ translateX: x.value }, { translateY: y }], opacity: a.value ? 1 : 0 };
  });

  const s0 = useAnimatedStyle(() => ({ opacity: t.value === 0 ? 1 : 0 }));
  const s1 = useAnimatedStyle(() => ({ opacity: t.value === 1 ? 1 : 0 }));
  const s2 = useAnimatedStyle(() => ({ opacity: t.value === 2 ? 1 : 0 }));
  const s3 = useAnimatedStyle(() => ({ opacity: t.value === 3 ? 1 : 0 }));
  const s4 = useAnimatedStyle(() => ({ opacity: t.value === 4 ? 1 : 0 }));

  return <Animated.View style={[{ position: 'absolute', left: 0, top: 0 }, pos]}>
    <Animated.View style={[{ position: 'absolute', left: 0, top: 0 }, s0]}><Crystal defIndex={0} /></Animated.View>
    <Animated.View style={[{ position: 'absolute', left: 0, top: 0 }, s1]}><Crystal defIndex={1} /></Animated.View>
    <Animated.View style={[{ position: 'absolute', left: 0, top: 0 }, s2]}><Crystal defIndex={2} /></Animated.View>
    <Animated.View style={[{ position: 'absolute', left: 0, top: 0 }, s3]}><Crystal defIndex={3} /></Animated.View>
    <Animated.View style={[{ position: 'absolute', left: 0, top: 0 }, s4]}><Crystal defIndex={4} /></Animated.View>
  </Animated.View>;
}

function RunnerObstaclesImpl({ obs, groundY }: Props) {
  return <View style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0 }} pointerEvents="none">
    {obs.slice(0, OBSTACLE_POOL_SIZE).map((s, i) => <Slot key={i} slot={s} groundY={groundY} />)}
  </View>;
}

export default memo(RunnerObstaclesImpl);
