// src/features/catalog/OlfactoryPyramid.tsx — Pyramide olfactive v2 (cercles concentriques)

import { useState, useEffect, useMemo } from 'react';
import { View, Text, Pressable } from 'react-native';
import Animated, { useSharedValue, useAnimatedStyle, withTiming, withSequence, withDelay } from 'react-native-reanimated';
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
  ringSize: number;
}

export default function OlfactoryPyramid({ topNotes, heartNotes, baseNotes }: Props) {
  const { theme } = useTheme();
  const s = useMemo(() => getStyles(theme), [theme]);
  const colors = theme.colors;
  const [activeLayer, setActiveLayer] = useState<LayerKey | null>('heart');

  const layers: LayerDef[] = [
    { key: 'top' as LayerKey, label: 'Tête', notes: topNotes, color: colors.pyramidTop, soft: colors.pyramidTopSoft, ink: colors.pyramidTopInk, ringSize: 100 },
    { key: 'heart' as LayerKey, label: 'Cœur', notes: heartNotes, color: colors.pyramidHeart, soft: colors.pyramidHeartSoft, ink: colors.pyramidHeartInk, ringSize: 160 },
    { key: 'base' as LayerKey, label: 'Fond', notes: baseNotes, color: colors.pyramidBase, soft: colors.pyramidBaseSoft, ink: colors.pyramidBaseInk, ringSize: 220 },
  ].filter(l => l.notes.length > 0);

  const ringScales = [
    useSharedValue(0),
    useSharedValue(0),
    useSharedValue(0),
  ];

  useEffect(() => {
    ringScales.forEach((sv, i) => {
      sv.value = withDelay(i * 150, withSequence(
        withTiming(1.1, { duration: 200 }),
        withTiming(1, { duration: 150 }),
      ));
    });
  }, []);

  const ringStyles = [
    useAnimatedStyle(() => ({ transform: [{ scale: ringScales[0].value }], opacity: ringScales[0].value })),
    useAnimatedStyle(() => ({ transform: [{ scale: ringScales[1].value }], opacity: ringScales[1].value })),
    useAnimatedStyle(() => ({ transform: [{ scale: ringScales[2].value }], opacity: ringScales[2].value })),
  ];

  if (layers.length === 0) return null;

  return (
    <View style={s.root}>
      <Text style={s.title}>Pyramide olfactive</Text>
      <Text style={s.subtitle}>Découvrez son évolution sur la peau</Text>

      <View style={s.ringsContainer}>
        {layers.map((layer, i) => {
          const isActive = activeLayer === layer.key;
          const ringStyle = ringStyles[i];
          return (
            <Animated.View
              key={layer.key}
              style={[
                s.ring,
                {
                  width: layer.ringSize,
                  height: layer.ringSize,
                  borderRadius: layer.ringSize / 2,
                  borderColor: layer.color,
                  backgroundColor: isActive ? layer.soft : 'transparent',
                  borderWidth: isActive ? 3 : 2,
                  opacity: isActive ? 1 : 0.5,
                },
                ringStyle,
              ]}
            />
          );
        })}
        <View style={s.center}>
          <Text style={s.centerLabel}>{activeLayer ? layers.find(l => l.key === activeLayer)?.label ?? 'Pyramide' : 'Pyramide'}</Text>
        </View>
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
  return {
    root: { marginTop: 24, marginBottom: 4, alignItems: 'center' },
    title: { fontFamily: 'PlayfairDisplay_600SemiBold', fontSize: 15, color: t.colors.text, marginBottom: 2 },
    subtitle: { fontFamily: 'Inter_400Regular', fontSize: 12, color: t.colors.textMuted, marginBottom: 16 },
    ringsContainer: {
      width: 220,
      height: 220,
      justifyContent: 'center',
      alignItems: 'center',
      marginBottom: 20,
    },
    ring: {
      position: 'absolute',
    },
    center: {
      width: 56,
      height: 56,
      borderRadius: 28,
      backgroundColor: t.colors.surface,
      borderWidth: 1,
      borderColor: t.colors.border,
      justifyContent: 'center',
      alignItems: 'center',
      ...t.shadow.card,
    },
    centerLabel: {
      fontFamily: 'Inter_700Bold',
      fontSize: 11,
      color: t.colors.primaryInk,
      textAlign: 'center',
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
      backgroundColor: t.colors.surface2,
      borderWidth: 1,
      borderColor: 'transparent',
    },
    selectorDot: { width: 8, height: 8, borderRadius: 4 },
    selectorLabel: { fontFamily: 'Inter_500Medium', fontSize: 13, color: t.colors.textMuted },
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