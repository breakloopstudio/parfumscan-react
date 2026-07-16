// src/features/scan/ScanLoading.tsx — Animation signature : particules + texte poétique

import { useEffect, useState, useRef, useMemo } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withRepeat,
  withTiming,
  withDelay,
  Easing,
  cancelAnimation,
} from 'react-native-reanimated';
import { theme } from '../../theme/theme';

const PARTICLES = 8;
const TEXTS = [
  'Analyse des notes...',
  'Comparaison des prix...',
  'Identification en cours...',
  'Recherche du meilleur deal...',
  'Presque...',
];

function Particle({ index }: { index: number }) {
  const translateY = useSharedValue(0);
  const opacity = useSharedValue(0.6);

  const { scale, duration, translateAmount, size, left } = useMemo(() => ({
    scale: 0.6 + (index * 0.07) % 0.4,
    duration: 1000 + (index * 73) % 600,
    translateAmount: -40 - (index * 5) % 30,
    size: 6 + (index * 2) % 8,
    left: 15 + (index * 8) % 70,
  }), [index]);

  useEffect(() => {
    const stagger = index * 120;

    translateY.value = withDelay(
      stagger,
      withRepeat(
        withTiming(translateAmount, { duration, easing: Easing.out(Easing.ease) }),
        -1,
        false,
      ),
    );
    opacity.value = withDelay(
      stagger,
      withRepeat(withTiming(0, { duration, easing: Easing.out(Easing.ease) }), -1, false),
    );

    return () => {
      cancelAnimation(translateY);
      cancelAnimation(opacity);
    };
  }, []);

  const style = useAnimatedStyle(() => ({
    transform: [{ translateY: translateY.value }, { scale }],
    opacity: opacity.value,
  }));

  return (
    <Animated.View
      style={[
        s.particle,
        {
          width: size,
          height: size,
          borderRadius: size / 2,
          left: `${left}%`,
        },
        style,
      ]}
    />
  );
}

function HaloRing() {
  const rotation = useSharedValue(0);

  useEffect(() => {
    rotation.value = withRepeat(
      withTiming(360, { duration: 3000, easing: Easing.linear }),
      -1,
      false,
    );
    return () => cancelAnimation(rotation);
  }, []);

  const style = useAnimatedStyle(() => ({
    transform: [{ rotate: `${rotation.value}deg` }],
  }));

  return (
    <Animated.View style={[s.haloContainer, style]}>
      <View style={s.haloArc} />
    </Animated.View>
  );
}

interface Props {}

export function ScanLoading(_props: Props) {
  const [textIndex, setTextIndex] = useState(0);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    timerRef.current = setInterval(() => {
      setTextIndex(prev => (prev + 1) % TEXTS.length);
    }, 800);
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, []);

  return (
    <View style={s.container}>
      <View style={s.animZone}>
        <HaloRing />
        <View style={s.particlesBox}>
          {Array.from({ length: PARTICLES }, (_, i) => (
            <Particle key={i} index={i} />
          ))}
        </View>
        <View style={s.centerIcon}>
          <View style={s.iconCircle}>
            <View style={s.iconDot} />
          </View>
        </View>
      </View>

      <Text style={s.text}>{TEXTS[textIndex]}</Text>
    </View>
  );
}

const s = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.background,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 32,
  },
  animZone: {
    width: 180,
    height: 180,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 40,
  },
  haloContainer: {
    position: 'absolute',
    width: 160,
    height: 160,
  },
  haloArc: {
    width: 160,
    height: 160,
    borderRadius: 80,
    borderWidth: 2,
    borderColor: theme.colors.glow,
    borderStyle: 'solid',
    opacity: 0.6,
  },
  particlesBox: {
    position: 'absolute',
    width: 180,
    height: 180,
    justifyContent: 'center',
    alignItems: 'center',
  },
  particle: {
    position: 'absolute',
    bottom: '50%',
    backgroundColor: theme.colors.primary,
  },
  centerIcon: {
    width: 60,
    height: 60,
    justifyContent: 'center',
    alignItems: 'center',
  },
  iconCircle: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: theme.colors.primarySoft,
    justifyContent: 'center',
    alignItems: 'center',
  },
  iconDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: theme.colors.primary,
  },
  text: {
    fontFamily: 'PlayfairDisplay_600SemiBold',
    fontSize: 18,
    color: theme.colors.text,
    textAlign: 'center',
  },
});
