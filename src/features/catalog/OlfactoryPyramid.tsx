// src/features/catalog/OlfactoryPyramid.tsx — Pyramide olfactive v5 (SVG unifié, design premium)

import { useState, useEffect, useMemo } from 'react';
import { View, Text, Pressable, useWindowDimensions } from 'react-native';
import Svg, { Polygon, G } from 'react-native-svg';
import Animated, { useSharedValue, useAnimatedStyle, withTiming } from 'react-native-reanimated';
import { useTheme, type Theme } from '../../theme/ThemeContext';
import { translateNote } from '../../utils/translate-note';
import { hapticsLight } from '../../services/haptics';

interface Props {
  topNotes: string[];
  heartNotes: string[];
  baseNotes: string[];
  onNotePress?: (note: string) => void;
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

interface Geo {
  w: number;
  h: number;
  bh: number;
  cx: number;
  outline: string;
  bandPoly(k: number): string;
}

export default function OlfactoryPyramid({ topNotes, heartNotes, baseNotes, onNotePress }: Props) {
  const { theme } = useTheme();
  const c = theme.colors;
  const { width: screenWidth } = useWindowDimensions();

  const layers: LayerDef[] = useMemo(
    () => [
      { key: 'top', label: 'Tête', notes: topNotes, color: c.pyramidTop, soft: c.pyramidTopSoft, ink: c.pyramidTopInk },
      { key: 'heart', label: 'Cœur', notes: heartNotes, color: c.pyramidHeart, soft: c.pyramidHeartSoft, ink: c.pyramidHeartInk },
      { key: 'base', label: 'Fond', notes: baseNotes, color: c.pyramidBase, soft: c.pyramidBaseSoft, ink: c.pyramidBaseInk },
    ],
    [topNotes, heartNotes, baseNotes, c],
  );

  const geo: Geo = useMemo(() => {
    const w = Math.min(270, screenWidth - 60);
    const h = Math.round(w * 0.85);
    const bh = h / 3;
    const cx = w / 2;
    const outline = `${cx},0 0,${h} ${w},${h}`;
    const bandPoly = (k: number) => {
      const y0 = k * bh;
      const y1 = (k + 1) * bh;
      const w0 = w * k / 3;
      const w1 = w * (k + 1) / 3;
      return `${cx - w0 / 2},${y0} ${cx + w0 / 2},${y0} ${cx + w1 / 2},${y1} ${cx - w1 / 2},${y1}`;
    };
    return { w, h, bh, cx, outline, bandPoly };
  }, [screenWidth]);

  const [active, setActive] = useState<LayerKey | null>('heart');

  const entryOpacity = useSharedValue(0);
  useEffect(() => {
    entryOpacity.value = withTiming(1, { duration: 500 });
  }, []);

  const fadeIn = useAnimatedStyle(() => ({ opacity: entryOpacity.value }));

  const hasAnyNotes = layers.some(l => l.notes.length > 0);
  if (!hasAnyNotes) return null;

  const s = useMemo(() => getStyles(theme), [theme]);

  const activeLayer = layers.find(l => l.key === active);
  const activeNotesBlock = activeLayer && (
    <View style={[s.notesWrap, { backgroundColor: activeLayer.soft }]}>
      {activeLayer.notes.length === 0 ? (
        <Text style={[s.emptyText, { color: activeLayer.ink }]}>
          Aucune note de {activeLayer.label.toLowerCase()} renseignée
        </Text>
      ) : (
        <>
          <Text style={[s.notesLabel, { color: activeLayer.ink }]}>
            Notes de {activeLayer.label.toLowerCase()}
          </Text>
          <View style={s.chipRow}>
            {activeLayer.notes.map((note, idx) => (
              <Pressable
                key={`${activeLayer.key}-${idx}`}
                style={({ pressed }) => [
                  s.chip,
                  { backgroundColor: activeLayer.color },
                  pressed && { opacity: 0.75, transform: [{ scale: 0.96 }] },
                ]}
                onPress={() => {
                  hapticsLight();
                  onNotePress?.(note);
                }}
              >
                <Text style={s.chipText}>{translateNote(note)}</Text>
              </Pressable>
            ))}
          </View>
        </>
      )}
    </View>
  );

  return (
    <Animated.View style={[s.root, fadeIn]}>
      <Text style={s.title}>Pyramide olfactive</Text>
      <Text style={s.subtitle}>Touchez une section pour explorer les notes</Text>

      <Pressable
        onPress={(e) => {
          const { locationX, locationY } = e.nativeEvent;
          if (locationY == null || locationX == null) return;
          if (locationY < 0 || locationY > geo.h) return;
          const halfW = (geo.w / 2) * (locationY / geo.h);
          if (Math.abs(locationX - geo.cx) > halfW) return;
          const idx = Math.min(2, Math.floor(locationY / geo.bh));
          const key = layers[idx]?.key;
          if (key) setActive(prev => (prev === key ? null : key));
        }}
        style={s.triangleStage}
      >
        <View pointerEvents="none">
          <Svg width={geo.w} height={geo.h} viewBox={`0 0 ${geo.w} ${geo.h}`}>
            <Polygon points={geo.outline} fill={c.text} opacity={0.04} transform="translate(0, 3)" />

            {layers.map((layer, i) => {
              const hasActive = active !== null;
              const isActive = active === layer.key;
              const isDimmed = hasActive && !isActive;
              const fill = isActive ? layer.color : isDimmed ? layer.soft : layer.color;
              const alpha = isActive ? 1 : isDimmed ? 0.38 : 0.88;

              return (
                <G key={layer.key}>
                  <Polygon points={geo.bandPoly(i)} fill={fill} opacity={alpha} />
                </G>
              );
            })}

            <Polygon
              points={geo.outline}
              fill="none"
              stroke={c.border}
              strokeWidth={2}
              strokeLinejoin="round"
            />
          </Svg>
        </View>
      </Pressable>

      {/* Légende interactive */}
      <View style={s.legend}>
        {layers.map(layer => {
          const isActive = active === layer.key;
          return (
            <Pressable
              key={layer.key}
              style={[
                s.legendItem,
                isActive && { backgroundColor: layer.soft, borderColor: layer.color },
              ]}
              onPress={() => setActive(prev => (prev === layer.key ? null : layer.key))}
            >
              <View style={[s.legendDot, { backgroundColor: layer.color }]} />
              <Text
                style={[
                  s.legendLabel,
                  isActive && { color: layer.ink, fontFamily: 'Inter_700Bold' },
                ]}
              >
                {layer.label}
              </Text>
              <View
                style={[
                  s.legendCount,
                  { backgroundColor: isActive ? layer.color : layer.soft },
                ]}
              >
                <Text
                  style={[
                    s.legendCountText,
                    { color: isActive ? '#FFFFFF' : layer.ink },
                  ]}
                >
                  {layer.notes.length}
                </Text>
              </View>
            </Pressable>
          );
        })}
      </View>

      {/* Notes de la couche active */}
      {activeNotesBlock}
    </Animated.View>
  );
}

function getStyles(t: Theme) {
  const c = t.colors;
  return {
    root: { marginTop: 24, marginBottom: 4, alignItems: 'center' as const },
    title: { fontFamily: 'PlayfairDisplay_600SemiBold', fontSize: 15, color: c.text, marginBottom: 2 },
    subtitle: { fontFamily: 'Inter_400Regular', fontSize: 12, color: c.textMuted, marginBottom: 22 },
    triangleStage: { alignItems: 'center' as const, marginBottom: 18 },
    legend: { flexDirection: 'row' as const, gap: 8, marginBottom: 14, width: '100%' as const },
    legendItem: {
      flex: 1,
      flexDirection: 'row' as const,
      alignItems: 'center' as const,
      justifyContent: 'center' as const,
      gap: 6,
      paddingVertical: 10,
      paddingHorizontal: 8,
      borderRadius: t.radius.base,
      borderWidth: 1.5,
      borderColor: 'transparent',
      backgroundColor: c.surface2,
    },
    legendDot: { width: 10, height: 10, borderRadius: 5 },
    legendLabel: { fontFamily: 'Inter_500Medium', fontSize: 13, color: c.textMuted },
    legendCount: { minWidth: 22, paddingHorizontal: 7, paddingVertical: 3, borderRadius: 10, alignItems: 'center' as const },
    legendCountText: { fontFamily: 'Inter_700Bold', fontSize: 11 },
    notesWrap: {
      width: '100%' as const,
      paddingHorizontal: 16,
      paddingVertical: 16,
      borderRadius: t.radius.card,
      alignItems: 'center' as const,
    },
    notesLabel: { fontFamily: 'Inter_600SemiBold', fontSize: 12, letterSpacing: 0.3, marginBottom: 10 },
    chipRow: { flexDirection: 'row' as const, flexWrap: 'wrap' as const, gap: 6, justifyContent: 'center' as const },
    emptyText: { fontFamily: 'Inter_400Regular', fontSize: 13, fontStyle: 'italic' as const },
    chip: { paddingHorizontal: 12, paddingVertical: 6, borderRadius: 14 },
    chipText: { fontSize: 12, fontFamily: 'Inter_500Medium', color: '#FFFFFF' },
  } as const;
}
