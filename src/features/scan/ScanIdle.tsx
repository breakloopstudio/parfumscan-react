// src/features/scan/ScanIdle.tsx — État idle : viseur + bouton scanner

import { View, Text, Pressable, StyleSheet } from 'react-native';
import Ionicons from "@react-native-vector-icons/ionicons/static";
import { theme } from '../../theme/theme';

interface Props {
  onStartScan: () => void;
  onImportGallery: () => void;
  onOpenManual: () => void;
}

export function ScanIdle({ onStartScan, onImportGallery, onOpenManual }: Props) {
  return (
    <View style={s.container}>
      <View style={s.viewfinder}>
        <View style={s.halo} />
        <View style={[s.corner, s.tl]} /><View style={[s.corner, s.tr]} />
        <View style={[s.corner, s.bl]} /><View style={[s.corner, s.br]} />
        <Ionicons name="scan-outline" size={48} color={theme.colors.primary} style={{ opacity: 0.6 }} />
      </View>
      <Text style={s.title}>Cadre le flacon</Text>
      <Text style={s.desc}>L'IA reconnaît le parfum{'\n'}et trouve le meilleur prix pour toi.</Text>
      <View style={s.actions}>
        <Pressable style={s.cta} onPress={onStartScan}>
          <Ionicons name="camera-outline" size={20} color="#FFF" style={{ marginRight: 8 }} />
          <Text style={s.ctaText}>Scanner un flacon</Text>
        </Pressable>
        <Pressable style={s.galleryBtn} onPress={onImportGallery}>
          <Ionicons name="images-outline" size={20} color={theme.colors.primary} style={{ marginRight: 8 }} />
          <Text style={s.galleryText}>Importer de la galerie</Text>
        </Pressable>
        <Pressable style={s.manualLink} onPress={onOpenManual}>
          <Ionicons name="search-outline" size={18} color={theme.colors.textMuted} style={{ marginRight: 6 }} />
          <Text style={s.manualText}>Rechercher sans scanner</Text>
        </Pressable>
        <View style={s.trust}>
          <Ionicons name="sparkles-outline" size={14} color={theme.colors.textMuted} />
          <Text style={s.trustText}> Reconnaissance IA · ~3 sec · Gratuit</Text>
        </View>
      </View>
      <Text style={s.tip}>Astuce : pour un meilleur résultat, cadre la marque et le nom du parfum</Text>
    </View>
  );
}

const s = StyleSheet.create({
  container: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 32, paddingTop: 60 },
  viewfinder: { width: 200, height: 200, justifyContent: 'center', alignItems: 'center', marginBottom: 28, position: 'relative' },
  halo: { position: 'absolute', width: 160, height: 160, borderRadius: 80, borderWidth: 6, borderColor: theme.colors.glow, opacity: 0.5 },
  corner: { position: 'absolute', width: 28, height: 28, borderColor: theme.colors.primary },
  tl: { top: 0, left: 0, borderTopWidth: 3, borderLeftWidth: 3, borderTopLeftRadius: 8 },
  tr: { top: 0, right: 0, borderTopWidth: 3, borderRightWidth: 3, borderTopRightRadius: 8 },
  bl: { bottom: 0, left: 0, borderBottomWidth: 3, borderLeftWidth: 3, borderBottomLeftRadius: 8 },
  br: { bottom: 0, right: 0, borderBottomWidth: 3, borderRightWidth: 3, borderBottomRightRadius: 8 },
  title: { fontFamily: 'PlayfairDisplay_700Bold', fontSize: 24, color: theme.colors.text, marginBottom: 8 },
  desc: { fontSize: 15, color: theme.colors.textMuted, textAlign: 'center', lineHeight: 22, marginBottom: 32 },
  actions: { width: '100%', maxWidth: 320 },
  cta: { flexDirection: 'row', backgroundColor: theme.colors.primary, borderRadius: theme.radius.base, height: 54, justifyContent: 'center', alignItems: 'center', marginBottom: 12, ...theme.shadow.button },
  ctaText: { color: '#FFF', fontWeight: '600', fontSize: 17 },
  galleryBtn: { flexDirection: 'row', borderRadius: theme.radius.base, height: 48, justifyContent: 'center', alignItems: 'center', marginBottom: 14, borderWidth: 1.5, borderColor: theme.colors.primary },
  galleryText: { color: theme.colors.primary, fontWeight: '600', fontSize: 15 },
  manualLink: { flexDirection: 'row', justifyContent: 'center', alignItems: 'center', marginBottom: 16 },
  manualText: { color: theme.colors.textMuted, fontSize: 14, fontWeight: '500' },
  trust: { flexDirection: 'row', justifyContent: 'center', alignItems: 'center' },
  trustText: { fontSize: 13, color: theme.colors.textMuted },
  tip: { position: 'absolute', bottom: 32, fontSize: 12, color: theme.colors.textMuted, textAlign: 'center', paddingHorizontal: 32 },
});
