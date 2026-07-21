// src/features/runner/RunnerPickups.tsx — Badges réduction

import { View, Text } from 'react-native';
import Animated, { useAnimatedStyle, type SharedValue } from 'react-native-reanimated';
import { PICKUP_DEFS, PICKUP_POOL_SIZE } from './runner-types';

interface PkpSlot { active: SharedValue<boolean>; x: SharedValue<number>; type: SharedValue<number>; y: SharedValue<number>; }

interface Props { pkp: PkpSlot[]; }

const S = 38;

function Badge({ label }: { label: string }) {
  return <View style={{ width: S, height: S, borderRadius: S / 2, backgroundColor: '#D4A960', justifyContent: 'center', alignItems: 'center', shadowColor: '#D4A960', shadowOffset: { width: 0, height: 0 }, shadowOpacity: 0.5, shadowRadius: 8, elevation: 4 }}>
    <Text allowFontScaling={false} style={{ fontFamily: 'Inter_800ExtraBold', fontSize: 13, color: '#1F1A2E' }}>{label}</Text>
  </View>;
}

function Slot({ slot }: { slot: PkpSlot }) {
  const a = slot.active; const x = slot.x; const t = slot.type; const y = slot.y;

  const pos = useAnimatedStyle(() => ({ transform: [{ translateX: x.value }, { translateY: y.value }], opacity: a.value ? 1 : 0 }));
  const s0 = useAnimatedStyle(() => ({ opacity: t.value === 0 ? 1 : 0 }));
  const s1 = useAnimatedStyle(() => ({ opacity: t.value === 1 ? 1 : 0 }));
  const s2 = useAnimatedStyle(() => ({ opacity: t.value === 2 ? 1 : 0 }));
  const s3 = useAnimatedStyle(() => ({ opacity: t.value === 3 ? 1 : 0 }));

  return <Animated.View style={[{ position: 'absolute', left: 0, top: 0 }, pos]}>
    <Animated.View style={[{ position: 'absolute', left: 0, top: 0 }, s0]}><Badge label={PICKUP_DEFS[0].label} /></Animated.View>
    <Animated.View style={[{ position: 'absolute', left: 0, top: 0 }, s1]}><Badge label={PICKUP_DEFS[1].label} /></Animated.View>
    <Animated.View style={[{ position: 'absolute', left: 0, top: 0 }, s2]}><Badge label={PICKUP_DEFS[2].label} /></Animated.View>
    <Animated.View style={[{ position: 'absolute', left: 0, top: 0 }, s3]}><Badge label={PICKUP_DEFS[3].label} /></Animated.View>
  </Animated.View>;
}

export default function RunnerPickups({ pkp }: Props) {
  return <View style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0 }} pointerEvents="none">
    {pkp.slice(0, PICKUP_POOL_SIZE).map((s, i) => <Slot key={i} slot={s} />)}
  </View>;
}

