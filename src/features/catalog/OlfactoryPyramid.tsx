// src/features/catalog/OlfactoryPyramid.tsx
import { useState, useEffect } from "react";
import { View, Text, Pressable, StyleSheet } from "react-native";
import Animated, { useSharedValue, useAnimatedStyle, withTiming, Easing, type SharedValue } from "react-native-reanimated";
import { Ionicons } from "@expo/vector-icons";
import { useAppTheme } from "../../hooks/useAppTheme";
import { translateNote } from "../../utils/translate-note";

interface Props { topNotes: string[]; heartNotes: string[]; baseNotes: string[]; }
type LayerKey = "top" | "heart" | "base";

interface LayerDef {
  key: LayerKey; label: string; subtitle: string; notes: string[]; widthPct: number;
  colorToken: "pyramidTop" | "pyramidHeart" | "pyramidBase";
  softToken: "pyramidTopSoft" | "pyramidHeartSoft" | "pyramidBaseSoft";
  inkToken: "pyramidTopInk" | "pyramidHeartInk" | "pyramidBaseInk";
}

const ANIM = { duration: 200, easing: Easing.out(Easing.ease) };

export default function OlfactoryPyramid({ topNotes, heartNotes, baseNotes }: Props) {
  const { colors } = useAppTheme();

  const layers: LayerDef[] = ([
    { key: "top",   label: "Notes de Tete", subtitle: "Premiere impression",   notes: topNotes,   widthPct: 84, colorToken: "pyramidTop",   softToken: "pyramidTopSoft",   inkToken: "pyramidTopInk" },
    { key: "heart", label: "Notes de Coeur", subtitle: "Signature du parfum",   notes: heartNotes, widthPct: 92, colorToken: "pyramidHeart", softToken: "pyramidHeartSoft", inkToken: "pyramidHeartInk" },
    { key: "base",  label: "Notes de Fond", subtitle: "Empreinte persistante", notes: baseNotes,  widthPct: 100,colorToken: "pyramidBase",  softToken: "pyramidBaseSoft",  inkToken: "pyramidBaseInk" },
  ] as const).filter(l => l.notes.length > 0);

  const firstKey = layers[0]?.key ?? null;
  const defaultKey = layers.find(l => l.key === "heart")?.key ?? firstKey;
  const [active, setActive] = useState<LayerKey | null>(defaultKey);

  const topP   = useSharedValue(active === "top"   ? 1 : 0);
  const heartP = useSharedValue(active === "heart" ? 1 : 0);
  const baseP  = useSharedValue(active === "base"  ? 1 : 0);
  const pmap: Record<LayerKey, SharedValue<number>> = { top: topP, heart: heartP, base: baseP };

  useEffect(() => {
    for (const l of layers) pmap[l.key].value = withTiming(l.key === active ? 1 : 0, ANIM);
  }, [active]);

  const chevronTop   = useAnimatedStyle(() => ({ transform: [{ rotate: `${topP.value * 180}deg` }] }));
  const chevronHeart = useAnimatedStyle(() => ({ transform: [{ rotate: `${heartP.value * 180}deg` }] }));
  const chevronBase  = useAnimatedStyle(() => ({ transform: [{ rotate: `${baseP.value * 180}deg` }] }));

  const contentTop   = useAnimatedStyle(() => ({ opacity: topP.value,   transform: [{ translateY: (1 - topP.value)   * 6 }] }));
  const contentHeart = useAnimatedStyle(() => ({ opacity: heartP.value, transform: [{ translateY: (1 - heartP.value) * 6 }] }));
  const contentBase  = useAnimatedStyle(() => ({ opacity: baseP.value,  transform: [{ translateY: (1 - baseP.value)  * 6 }] }));

  const chevronStyles: Record<LayerKey, ReturnType<typeof useAnimatedStyle>> = { top: chevronTop, heart: chevronHeart, base: chevronBase };
  const contentStyles: Record<LayerKey, ReturnType<typeof useAnimatedStyle>> = { top: contentTop, heart: contentHeart, base: contentBase };

  const toggle = (k: LayerKey) => setActive(prev => (prev === k ? null : k));
  if (layers.length === 0) return null;

  return (
    <View style={s.root}>
      {layers.map((layer, i) => {
        const isActive = active === layer.key;
        const mc = colors[layer.colorToken];
        const sc = colors[layer.softToken];
        const ic = colors[layer.inkToken];
        const isLast = i === layers.length - 1;

        return (
          <View key={layer.key}>
            <Pressable
              onPress={() => toggle(layer.key)}
              accessibilityRole="button"
              accessibilityState={{ expanded: isActive }}
              accessibilityLabel={`${layer.label}, ${layer.subtitle}, ${layer.notes.length} notes`}
              style={({ pressed }) => [
                s.header,
                { width: `${layer.widthPct}%`, alignSelf: "center" as const },
                pressed && { opacity: 0.7 },
              ]}
            >
              <View style={[s.dot, { backgroundColor: mc }]} />
              <View style={s.headerText}>
                <View style={s.headerTitleRow}>
                  <Text style={[s.headerLabel, { color: mc }]}>{layer.label}</Text>
                  <View style={[s.noteBadge, { backgroundColor: sc }]}>
                    <Text style={[s.noteBadgeText, { color: ic }]}>{layer.notes.length}</Text>
                  </View>
                </View>
                <Text style={[s.headerSub, { color: colors.textMuted }]}>{layer.subtitle}</Text>
              </View>
              <Animated.View style={chevronStyles[layer.key]}>
                <Ionicons name="chevron-down" size={16} color={mc} />
              </Animated.View>
            </Pressable>
            <Animated.View
              style={[s.content, contentStyles[layer.key], !isActive && s.contentHidden, { borderLeftColor: isLast ? "transparent" : mc }]}
              pointerEvents={isActive ? "auto" : "none"}
            >
              <View style={s.notesWrap}>
                {layer.notes.map((note, idx) => (
                  <View key={`${layer.key}-${idx}`} style={[s.chip, { backgroundColor: sc }]}>
                    <Text style={[s.chipText, { color: ic }]}>{translateNote(note)}</Text>
                  </View>
                ))}
              </View>
            </Animated.View>
          </View>
        );
      })}
    </View>
  );
}

const s = StyleSheet.create({
  root: { marginTop: 24, marginBottom: 4 },
  header: { flexDirection: "row", alignItems: "center", paddingVertical: 14, paddingHorizontal: 12, minHeight: 52, gap: 10 },
  dot: { width: 10, height: 10, borderRadius: 5, flexShrink: 0 },
  headerText: { flex: 1 },
  headerTitleRow: { flexDirection: "row", alignItems: "center", gap: 8 },
  headerLabel: { fontSize: 14, fontWeight: "700" },
  noteBadge: { paddingHorizontal: 7, paddingVertical: 2, borderRadius: 10 },
  noteBadgeText: { fontSize: 11, fontWeight: "700" },
  headerSub: { fontSize: 12, marginTop: 1 },
  content: { paddingLeft: 22, paddingRight: 16, paddingBottom: 12, borderLeftWidth: 2 },
  contentHidden: { position: "absolute", top: 0, left: 0, right: 0, opacity: 0 },
  notesWrap: { flexDirection: "row", flexWrap: "wrap", gap: 6, paddingLeft: 10 },
  chip: { paddingHorizontal: 12, paddingVertical: 5, borderRadius: 14 },
  chipText: { fontSize: 12, fontWeight: "500" },
});