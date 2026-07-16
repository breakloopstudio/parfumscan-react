// src/features/catalog/OlfactoryPyramid.tsx
// Timeline olfactive interactive avec mini-pyramide icon (Approche 2)
// Axe vertical (pastilles differenciees ○/●/◆) + accordeon exclusif
// Coeur ouvert par defaut - animations Reanimated : chevron rotate + contenu fade/slide

import { useState, useEffect } from 'react';
import { View, Text, Pressable, StyleSheet } from 'react-native';
import Animated, { useSharedValue, useAnimatedStyle, withTiming } from 'react-native-reanimated';
import Ionicons from "@react-native-vector-icons/ionicons/static";
import { theme } from '../../theme/theme';
import { translateNote } from '../../utils/translate-note';

// ─── Types ───────────────────────────────────────────────────

interface Props {
  topNotes: string[];
  heartNotes: string[];
  baseNotes: string[];
}

type LayerKey = 'top' | 'heart' | 'base';

interface LayerDef {
  key: LayerKey;
  label: string;
  subtitle: string;
  colorToken: 'pyramidTop' | 'pyramidHeart' | 'pyramidBase';
  softToken: 'pyramidTopSoft' | 'pyramidHeartSoft' | 'pyramidBaseSoft';
  inkToken: 'pyramidTopInk' | 'pyramidHeartInk' | 'pyramidBaseInk';
  dotShape: 'outline' | 'filled' | 'diamond';
}

// ─── Constantes ───────────────────────────────────────────────

const LAYERS: LayerDef[] = [
  { key: 'top',   label: 'Notes de Tete', subtitle: 'Premiere impression',   colorToken: 'pyramidTop',   softToken: 'pyramidTopSoft',   inkToken: 'pyramidTopInk',   dotShape: 'outline' },
  { key: 'heart', label: 'Notes de Coeur', subtitle: 'Signature du parfum',    colorToken: 'pyramidHeart', softToken: 'pyramidHeartSoft', inkToken: 'pyramidHeartInk', dotShape: 'filled' },
  { key: 'base',  label: 'Notes de Fond', subtitle: 'Empreinte persistante', colorToken: 'pyramidBase',  softToken: 'pyramidBaseSoft',  inkToken: 'pyramidBaseInk',  dotShape: 'diamond' },
];

// ─── Composant ────────────────────────────────────────────────

export default function OlfactoryPyramid({ topNotes, heartNotes, baseNotes }: Props) {
  const colors = theme.colors;
  const [activeLayer, setActiveLayer] = useState<LayerKey | null>('heart');

  const notesMap: Record<LayerKey, string[]> = { top: topNotes, heart: heartNotes, base: baseNotes };
  const visibleLayers = LAYERS.filter(l => notesMap[l.key].length > 0);
  if (visibleLayers.length === 0) return null;

  const topOpen   = useSharedValue(activeLayer === 'top' ? 1 : 0);
  const heartOpen = useSharedValue(activeLayer === 'heart' ? 1 : 0);
  const baseOpen  = useSharedValue(activeLayer === 'base' ? 1 : 0);

  useEffect(() => {
    topOpen.value   = withTiming(activeLayer === 'top' ? 1 : 0, { duration: 200 });
    heartOpen.value = withTiming(activeLayer === 'heart' ? 1 : 0, { duration: 200 });
    baseOpen.value  = withTiming(activeLayer === 'base' ? 1 : 0, { duration: 200 });
  }, [activeLayer]);

  const topChevron   = useAnimatedStyle(() => ({ transform: [{ rotate: `${topOpen.value * 180}deg` }] }));
  const heartChevron = useAnimatedStyle(() => ({ transform: [{ rotate: `${heartOpen.value * 180}deg` }] }));
  const baseChevron  = useAnimatedStyle(() => ({ transform: [{ rotate: `${baseOpen.value * 180}deg` }] }));

  const topContent   = useAnimatedStyle(() => ({ opacity: topOpen.value,   transform: [{ translateY: (1 - topOpen.value) * 4 }] }));
  const heartContent = useAnimatedStyle(() => ({ opacity: heartOpen.value, transform: [{ translateY: (1 - heartOpen.value) * 4 }] }));
  const baseContent  = useAnimatedStyle(() => ({ opacity: baseOpen.value,  transform: [{ translateY: (1 - baseOpen.value) * 4 }] }));

  const chevronMap: Record<LayerKey, typeof topChevron> = { top: topChevron, heart: heartChevron, base: baseChevron };
  const contentMap: Record<LayerKey, typeof topContent> = { top: topContent, heart: heartContent, base: baseContent };

  const handlePress = (key: LayerKey) => setActiveLayer(prev => (prev === key ? null : key));

  return (
    <View style={s.root}>
      <View style={s.headerRow}>
        <View style={s.miniPyramid}>
          {/* Base — violet (fond) */}
          <View style={[s.pyrLayer, {
            top: 18, left: 1,
            borderLeftWidth: 24, borderRightWidth: 24, borderBottomWidth: 16,
            borderLeftColor: 'transparent', borderRightColor: 'transparent',
            borderBottomColor: colors.pyramidBase,
          }]} />
          {/* Cœur — ambré (milieu) */}
          <View style={[s.pyrLayer, {
            top: 8, left: 8,
            borderLeftWidth: 17, borderRightWidth: 17, borderBottomWidth: 14,
            borderLeftColor: 'transparent', borderRightColor: 'transparent',
            borderBottomColor: colors.pyramidHeart,
          }]} />
          {/* Tête — vert (dessus) */}
          <View style={[s.pyrLayer, {
            top: 0, left: 16,
            borderLeftWidth: 9, borderRightWidth: 9, borderBottomWidth: 12,
            borderLeftColor: 'transparent', borderRightColor: 'transparent',
            borderBottomColor: colors.pyramidTop,
          }]} />
        </View>
        <View style={s.headerTextWrap}>
          <Text style={[s.title, { color: colors.text }]}>Pyramide olfactive</Text>
          <Text style={[s.subtitle, { color: colors.textMuted }]}>Decouvrez son evolution sur la peau</Text>
        </View>
      </View>

      <View style={s.timeline}>
        {visibleLayers.map((layer, i) => {
          const notes = notesMap[layer.key];
          const isActive = activeLayer === layer.key;
          const mc = colors[layer.colorToken];
          const sc = colors[layer.softToken];
          const ic = colors[layer.inkToken];
          const isLast = i === visibleLayers.length - 1;

          return (
            <View key={layer.key}>
              <View style={s.timelineItem}>
                <View style={s.track}>
                  {layer.dotShape === 'diamond' ? (
                    <View style={[s.dotDiamond, { backgroundColor: mc }]} />
                  ) : layer.dotShape === 'outline' ? (
                    <View style={[s.dotOutline, { borderColor: mc }]} />
                  ) : (
                    <View style={[s.dotFilled, { backgroundColor: mc }]} />
                  )}
                  {!isLast && <View style={[s.line, { backgroundColor: mc }]} />}
                </View>
                <Pressable
                  style={s.layerBtn}
                  onPress={() => handlePress(layer.key)}
                  accessibilityRole="button"
                  accessibilityState={{ expanded: isActive }}
                  accessibilityLabel={`${layer.label}, ${notes.length} notes`}
                >
                  <View style={s.layerHeader}>
                    <View style={s.layerInfo}>
                      <Text style={[s.layerLabel, { color: mc }]}>{layer.label}</Text>
                      <View style={[s.badge, { backgroundColor: sc }]}>
                        <Text style={[s.badgeText, { color: ic }]}>{notes.length}</Text>
                      </View>
                    </View>
                    <Animated.View style={chevronMap[layer.key]}>
                      <Ionicons name="chevron-down" size={18} color={colors.textMuted} />
                    </Animated.View>
                  </View>
                  <Text style={[s.layerSub, { color: colors.textMuted }]}>{layer.subtitle}</Text>
                </Pressable>
              </View>
              {isActive && (
                <Animated.View style={contentMap[layer.key]}>
                  <View style={s.contentInner}>
                    <View style={s.track} />
                    <View style={s.notesWrap}>
                      {notes.map((note, idx) => (
                        <View key={`${layer.key}-${idx}`} style={[s.chip, { backgroundColor: sc }]}>
                          <Text style={[s.chipText, { color: ic }]}>{translateNote(note)}</Text>
                        </View>
                      ))}
                    </View>
                  </View>
                </Animated.View>
              )}
            </View>
          );
        })}
      </View>
    </View>
  );
}

// ─── Styles ───────────────────────────────────────────────────

const DOT_BASE = { width: 10, height: 10, marginTop: 4 };

const s = StyleSheet.create({
  root: { marginTop: 24, marginBottom: 4 },
  headerRow:      { flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 16 },
  miniPyramid:    { width: 50, height: 36, marginTop: 2, overflow: 'hidden' },
  pyrLayer:       { position: 'absolute', width: 0, height: 0 },
  headerTextWrap: { flex: 1 },
  title:          { fontFamily: 'PlayfairDisplay_600SemiBold', fontSize: 15 },
  subtitle:       { fontSize: 12, marginTop: 1 },
  timeline:       { paddingLeft: 2 },
  timelineItem:   { flexDirection: 'row' },
  track:          { width: 22, alignItems: 'center' },
  dotFilled:      { ...DOT_BASE, borderRadius: 5 },
  dotOutline:     { ...DOT_BASE, borderRadius: 5, borderWidth: 2, backgroundColor: 'transparent' },
  dotDiamond:     { width: 9, height: 9, marginTop: 5, transform: [{ rotate: '45deg' }], borderRadius: 1.5 },
  line:           { width: 2, flex: 1, marginTop: 4 },
  layerBtn:       { flex: 1, paddingVertical: 10, minHeight: 48 },
  layerHeader:    { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  layerInfo:      { flexDirection: 'row', alignItems: 'center', gap: 8 },
  layerLabel:     { fontSize: 14, fontWeight: '700' },
  badge:          { paddingHorizontal: 7, paddingVertical: 2, borderRadius: 10 },
  badgeText:      { fontSize: 11, fontWeight: '700' },
  layerSub:       { fontSize: 12, marginTop: 2 },
  contentInner:   { flexDirection: 'row', paddingBottom: 14 },
  notesWrap:      { flex: 1, flexDirection: 'row', flexWrap: 'wrap', gap: 6, paddingTop: 2 },
  chip:           { paddingHorizontal: 12, paddingVertical: 5, borderRadius: 14 },
  chipText:       { fontSize: 12, fontWeight: '500' },
});
