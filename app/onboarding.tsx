// app/onboarding.tsx — 3 slides d'onboarding avec swipe + persistance

import { useState, useEffect } from 'react';
import { View, Text, Pressable, StyleSheet, useWindowDimensions } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  runOnJS,
} from 'react-native-reanimated';
import AsyncStorage from '@react-native-async-storage/async-storage';
import Ionicons from '@react-native-vector-icons/ionicons/static';
import { theme } from '../src/theme/theme';

const ONBOARDING_KEY = '@parfumscan_onboarding_done';
const SPRING = { damping: 28, stiffness: 300, mass: 0.8 };

const SLIDES = [
  {
    icon: 'camera-outline',
    title: 'Photographie un flacon',
    desc: "Pointe ton téléphone vers un parfum. L'IA l'identifie en quelques secondes et trouve son prix sur le web.",
  },
  {
    icon: 'pricetags-outline',
    title: "L'IA trouve le meilleur prix",
    desc: 'Compare les offres de tous les marchands. Tu sais en un coup d\'œil si tu fais une bonne affaire.',
  },
  {
    icon: 'heart-outline',
    title: 'Ton univers parfumé',
    desc: 'Collectionne tes parfums, crée ta wishlist et garde tes coups de cœur. Ton profil olfactif évolue avec tes goûts.',
  },
];

export default function OnboardingPage() {
  const { width: windowWidth } = useWindowDimensions();
  const router = useRouter();
  const [current, setCurrent] = useState(0);
  const [ready, setReady] = useState(false);
  const translateX = useSharedValue(0);

  useEffect(() => {
    AsyncStorage.getItem(ONBOARDING_KEY)
      .then(val => {
        if (val === 'true') {
          router.replace('/(tabs)');
        } else {
          setReady(true);
        }
      })
      .catch(() => setReady(true));
  }, []);

  const finish = () => {
    AsyncStorage.setItem(ONBOARDING_KEY, 'true').catch(() => {});
    router.replace('/(tabs)');
  };

  const goTo = (index: number) => {
    'worklet';
    translateX.value = withSpring(-index * windowWidth, SPRING);
    runOnJS(setCurrent)(index);
  };

  const gesture = Gesture.Pan()
    .activeOffsetX([-15, 15])
    .failOffsetY([-15, 15])
    .onEnd((e) => {
      if (e.translationX < -40 && current < SLIDES.length - 1) {
        goTo(current + 1);
      } else if (e.translationX > 40 && current > 0) {
        goTo(current - 1);
      }
    });

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: translateX.value }],
  }));

  if (!ready) return null;

  return (
    <SafeAreaView edges={['top', 'bottom']} style={s.container}>
      <View style={s.skipRow}>
        <Pressable onPress={finish}>
          <Text style={s.skipText}>Passer</Text>
        </Pressable>
      </View>

      <GestureDetector gesture={gesture}>
        <Animated.View style={[s.slidesWrapper, animatedStyle]}>
          {SLIDES.map((_, i) => (
            <View key={i} style={[s.slide, { width: windowWidth }]}>
              <View style={s.iconCircle}>
                <Ionicons name={SLIDES[i].icon as never} size={48} color={theme.colors.primary} />
              </View>
              <Text style={s.slideTitle}>{SLIDES[i].title}</Text>
              <Text style={s.slideDesc}>{SLIDES[i].desc}</Text>
            </View>
          ))}
        </Animated.View>
      </GestureDetector>

      <View style={s.bottom}>
        <View style={s.dots}>
          {SLIDES.map((_, i) => (
            <View key={i} style={[s.dot, i === current && s.dotActive]} />
          ))}
        </View>

        {current < SLIDES.length - 1 ? (
          <Pressable style={s.cta} onPress={() => goTo(current + 1)}>
            <Text style={s.ctaText}>Suivant</Text>
          </Pressable>
        ) : (
          <Pressable style={s.cta} onPress={finish}>
            <Text style={s.ctaText}>Commencer</Text>
          </Pressable>
        )}
      </View>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: theme.colors.background },
  skipRow: { alignItems: 'flex-end', paddingHorizontal: 20, paddingTop: 8 },
  skipText: { fontFamily: 'Inter_500Medium', fontSize: 15, color: theme.colors.textMuted },
  slidesWrapper: { flex: 1, flexDirection: 'row', alignItems: 'center' },
  slide: { alignItems: 'center', paddingHorizontal: 32 },
  iconCircle: { width: 120, height: 120, borderRadius: 60, backgroundColor: theme.colors.primarySoft, justifyContent: 'center', alignItems: 'center', marginBottom: 32 },
  slideTitle: { fontFamily: 'PlayfairDisplay_700Bold', fontSize: 28, color: theme.colors.text, textAlign: 'center', marginBottom: 12 },
  slideDesc: { fontFamily: 'Inter_400Regular', fontSize: 15, color: theme.colors.textMuted, textAlign: 'center', lineHeight: 22, maxWidth: 320 },
  bottom: { alignItems: 'center', paddingBottom: 24, gap: 20 },
  dots: { flexDirection: 'row', gap: 8 },
  dot: { width: 8, height: 8, borderRadius: 4, backgroundColor: theme.colors.border },
  dotActive: { backgroundColor: theme.colors.primary, width: 24 },
  cta: { backgroundColor: theme.colors.primary, borderRadius: theme.radius.base, height: 50, width: '80%', maxWidth: 320, justifyContent: 'center', alignItems: 'center', ...theme.shadow.button },
  ctaText: { color: '#FFFFFF', fontFamily: 'Inter_600SemiBold', fontSize: 17 },
});
