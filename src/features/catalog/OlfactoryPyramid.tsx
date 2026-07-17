// src/features/catalog/OlfactoryPyramid.tsx — Pyramide olfactive v4 (SVG, vrai triangle)

import { useState, useEffect, useMemo } from 'react';
import { View, Text, Pressable } from 'react-native';
import Svg, { Polygon, G } from 'react-native-svg';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  withSequence,
  withDelay,
  withSpring,
  withRepeat,
} from 'react-native-reanimated';
import { useTheme, type Theme } from '../../theme/ThemeContext';
import { translateNote } from '../../utils/translate-note';

interface Props {
  topNotes: string[];
  heartNotes: string[];
  baseNotes: string[];
}

type LayerKey = 'top' | 'heart' | 'base';

interface LayerDef {
  key: LayerKey;
  label: string;
  notes: string[];
  color: string;
  soft: string;
  ink: string;
}

const TRI_W = 180;
const TRI_H = 156;
const CONTAINER_TOP = 22;

function bandPoints(k: number, N: number, bandH: number): string {
  const hw0 = TRI_W / 2 * k / N;
  const hw1 = TRI_W / 2 * (k + 1) / N;
  const cx = TRI_W / 2;
  return [
    `${cx - hw0},0`,
    `${cx + hw0},0`,
    `${cx + hw1},${bandH}`,
    `${cx - hw1},${bandH}`,
  ].join(' ');
}

export default function OlfactoryPyramid({ topNotes, heartNotes, baseNotes }: Props) {
  const { theme } = useTheme();
  const colors = theme.colors;
  const [activeLayer, setActiveLayer] = useState<LayerKey | null>('heart');

  const layers: LayerDef[] = useMemo(() => [
    { key: 'base' as LayerKey, label: 'Fond', notes: baseNotes, color: colors.pyramidBase, soft: colors.pyramidBaseSoft, ink: colors.pyramidBaseInk },
    { key: 'heart' as LayerKey, label: 'Cœur', notes: heartNotes, color: colors.pyramidHeart, soft: colors.pyramidHeartSoft, ink: colors.pyramidHeartInk },
    { key: 'top' as LayerKey, label: 'Tête', notes: topNotes, color: colors.pyramidTop, soft: colors.pyramidTopSoft, ink: colors.pyramidTopInk },
  ].filter(l => l.notes.length > 0), [baseNotes, heartNotes, topNotes, colors]);

  const entryScales = [useSharedValue(0), useSharedValue(0), useSharedValue(0)];
  const activeScales = [useSharedValue(1), useSharedValue(1), useSharedValue(1)];
  const activeOpacities = [useSharedValue(0.3), useSharedValue(0.3), useSharedValue(0.3)];
  const pulseAnims = [useSharedValue(1), useSharedValue(1), useSharedValue(1)];

  useEffect(() => {
    entryScales.forEach((sv, i) => {
      sv.value = withDelay(i * 140, withSequence(
        withTiming(1.08, { duration: 180 }),
        withTiming(1, { duration: 240 }),
      ));
    });
  }, []);

  useEffect(() => {
    layers.forEach((layer, i) => {
      const isActive = activeLayer === layer.key;
      activeScales[i].value = withSpring(isActive ? 1.04 : 1, { damping: 14, stiffness: 160 });
      activeOpacities[i].value = withTiming(isActive ? 1 : 0.3, { duration: 280 });
    });
  }, [activeLayer, layers]);

  useEffect(() => {
    layers.forEach((layer, i) => {
      const isActive = activeLayer === layer.key;
      if (isActive) {
        pulseAnims[i].value = withRepeat(
          withSequence(
            withTiming(0.93, { duration: 1600 }),
            withTiming(1, { duration: 1600 }),
          ),
          -1,
          true,
        );
      } else {
        pulseAnims[i].value = withTiming(1, { duration: 250 });
      }
    });
  }, [activeLayer, layers]);

  const animatedStyles = [
    useAnimatedStyle(() => ({
      transform: [{ scale: entryScales[0].value * activeScales[0].value }],
      opacity: activeOpacities[0].value * pulseAnims[0].value,
    })),
    useAnimatedStyle(() => ({
      transform: [{ scale: entryScales[1].value * activeScales[1].value }],
      opacity: activeOpacities[1].value * pulseAnims[1].value,
    })),
    useAnimatedStyle(() => ({
      transform: [{ scale: entryScales[2].value * activeScales[2].value }],
      opacity: activeOpacities[2].value * pulseAnims[2].value,
    })),
  ];

  const s = useMemo(() => getStyles(theme), [theme]);
  const N = layers.length;
  const bandH = N > 0 ? TRI_H / N : 0;

  if (N === 0) return null;

  const activeDef = activeLayer ? layers.find(l => l.key === activeLayer) : null;

  return (
    <View style={s.root}>
      <Text style={s.title}>Pyramide olfactive</Text>
      <Text style={s.subtitle}>Découvrez son évolution sur la peau</Text>

      <View style={s.triangleStage}>
        <View style={s.pyramid}>
          {layers.map((layer, i) => {
            const bandIdx = N - 1 - i;
            const points = bandPoints(bandIdx, N, bandH);
            const bandTop = CONTAINER_TOP + bandIdx * bandH;

            return (
              <Animated.View
                key={`vis-${layer.key}`}
                style={[
                  { width: TRI_W, height: bandH, marginTop: bandIdx === 0 ? CONTAINER_TOP : 0 },
                  animatedStyles[i],
                ]}
              >
                <Svg width={TRI_W} height={bandH} viewBox={`0 0 ${TRI_W} ${bandH}`}>
                  <G onPress={() => setActiveLayer(prev => prev === layer.key ? null : layer.key)}>
                    <Polygon points={points} fill={layer.color} />
                  </G>
                </Svg>
              </Animated.View>
            );
          })}
        </View>

        {activeDef && (
          <View style={[s.activeBadge, { backgroundColor: activeDef.soft }]}>
            <Text style={[s.activeBadgeText, { color: activeDef.ink }]}>
              Notes de {activeDef.label.toLowerCase()}
            </Text>
          </View>
        )}
      </View>

      <View style={s.selector}>
        {layers.map(layer => {
          const isActive = activeLayer === layer.key;
          return (
            <Pressable
              key={layer.key}
              style={[s.selectorBtn, isActive && { backgroundColor: layer.soft, borderColor: layer.color }]}
              onPress={() => setActiveLayer(prev => prev === layer.key ? null : layer.key)}
            >
              <View style={[s.selectorDot, { backgroundColor: layer.color }]} />
              <Text style={[s.selectorLabel, isActive && { color: layer.ink, fontFamily: 'Inter_700Bold' }]}>
                {layer.label}
              </Text>
              <Text style={[s.selectorCount, { color: layer.ink, backgroundColor: layer.soft }]}>
                {layer.notes.length}
              </Text>
            </Pressable>
          );
        })}
      </View>

      {activeLayer && (() => {
        const layer = layers.find(l => l.key === activeLayer);
        if (!layer) return null;
        return (
          <View style={[s.notesWrap, { backgroundColor: layer.soft }]}>
            {layer.notes.map((note, idx) => (
              <View key={`${layer.key}-${idx}`} style={[s.chip, { backgroundColor: layer.color }]}>
                <Text style={s.chipText}>{translateNote(note)}</Text>
              </View>
            ))}
          </View>
        );
      })()}
    </View>
  );
}

function getStyles(t: Theme) {
  const c = t.colors;
  return {
    root: { marginTop: 24, marginBottom: 4, alignItems: 'center' },
    title: { fontFamily: 'PlayfairDisplay_600SemiBold', fontSize: 15, color: c.text, marginBottom: 2 },
    subtitle: { fontFamily: 'Inter_400Regular', fontSize: 12, color: c.textMuted, marginBottom: 20 },
    triangleStage: {
      alignItems: 'center',
      marginBottom: 16,
    },
    pyramid: {
      width: TRI_W,
    },
    activeBadge: {
      marginTop: 10,
      paddingHorizontal: 12,
      paddingVertical: 4,
      borderRadius: 10,
    },
    activeBadgeText: {
      fontFamily: 'Inter_600SemiBold',
      fontSize: 11,
      letterSpacing: 0.3,
    },
    selector: {
      flexDirection: 'row',
      gap: 8,
      marginBottom: 12,
    },
    selectorBtn: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 6,
      paddingHorizontal: 14,
      paddingVertical: 8,
      borderRadius: 20,
      backgroundColor: c.surface2,
      borderWidth: 1,
      borderColor: 'transparent',
    },
    selectorDot: { width: 8, height: 8, borderRadius: 4 },
    selectorLabel: { fontFamily: 'Inter_500Medium', fontSize: 13, color: c.textMuted },
    selectorCount: { fontFamily: 'Inter_700Bold', fontSize: 11, paddingHorizontal: 6, paddingVertical: 2, borderRadius: 8, overflow: 'hidden' },
    notesWrap: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      gap: 6,
      justifyContent: 'center',
      paddingHorizontal: 16,
      paddingVertical: 14,
      borderRadius: t.radius.card,
      width: '100%',
    },
    chip: { paddingHorizontal: 12, paddingVertical: 5, borderRadius: 14 },
    chipText: { fontSize: 12, fontFamily: 'Inter_500Medium', color: '#FFFFFF' },
  } as const;
}
