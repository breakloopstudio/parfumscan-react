// app/admin.tsx — Administration (seed + upload image)
// ⚠️  L'upload nécessite un development build (pas Expo Go) car Firebase Storage
//     utilise du code natif. En Expo Go, l'erreur est bien gérée.

import { useState, useEffect } from 'react';
import {
  View, Text, ScrollView, Pressable, ActivityIndicator,
  StyleSheet, Image, Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useAuthContext } from '../src/contexts/AuthContext';
import { onParfums, seedCatalog, updateParfum, resetCache } from '../src/services/firestore';
import { PERFUMES_SEED } from '../src/models';
import { theme } from '../src/theme/theme';
import type { Parfum } from '../src/models';
import { uploadParfumImage } from '../src/services/storage';

// Lazy: expo-image-picker optionnel → l'upload est désactivé si non installé
let ImagePicker: any = null;
try { ImagePicker = require('expo-image-picker'); } catch {}

export default function AdminPage() {
  const { isAuthenticated, isAdmin } = useAuthContext();
  const [parfums, setParfums] = useState<Parfum[]>([]);
  const [seeding, setSeeding] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);
  const [resetting, setResetting] = useState(false);

  // ─── Upload state ────────────────────────────────────────
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [selectedUri, setSelectedUri] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const [uploadMsg, setUploadMsg] = useState<string | null>(null);
  const [uploadErr, setUploadErr] = useState(false);

  useEffect(() => onParfums(setParfums), []);

  const selectedParfum = parfums.find(p => p.id === selectedId) ?? null;

  if (!isAuthenticated) return <View style={s.center}><Text style={{color:theme.colors.textMuted}}>Connectez-vous en tant qu'admin.</Text></View>;
  if (!isAdmin) return <View style={s.center}><Text style={{color:theme.colors.textMuted}}>Accès réservé aux administrateurs.</Text></View>;

  // ─── Seed ────────────────────────────────────────────────
  const doSeed = async () => {
    setSeeding(true); setMsg(null);
    try { const c = await seedCatalog(PERFUMES_SEED); setMsg(`${c} parfums insérés.`); }
    catch (e: unknown) { setMsg(e instanceof Error ? e.message : 'Erreur seed.'); }
    finally { setSeeding(false); }
  };

  // ─── Reset Cache ─────────────────────────────────────────
  const doReset = async () => {
    Alert.alert(
      'Reset du cache',
      `Supprimer tous les parfums (${parfums.length}) et re-seed ?\nLes favoris/scans utilisateurs ne sont pas affectés.`,
      [
        { text: 'Annuler', style: 'cancel' },
        {
          text: 'Reset',
          style: 'destructive',
          onPress: async () => {
            setResetting(true); setMsg(null);
            try {
              const deleted = await resetCache();
              const seeded = await seedCatalog(PERFUMES_SEED);
              setMsg(`${deleted} parfums supprimés, ${seeded} re-seedés.`);
            } catch (e: unknown) {
              setMsg(e instanceof Error ? e.message : 'Erreur reset.');
            } finally {
              setResetting(false);
            }
          },
        },
      ]
    );
  };

  // ─── Pick image ──────────────────────────────────────────
  const pickImage = async () => {
    if (!ImagePicker) { Alert.alert('Non disponible', 'Installe expo-image-picker pour uploader des images.'); return; }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      quality: 0.8,
    });
    if (!result.canceled && result.assets.length > 0) {
      setSelectedUri(result.assets[0].uri);
      setUploadMsg(null);
      setUploadErr(false);
    }
  };

  // ─── Upload ──────────────────────────────────────────────
  const doUpload = async () => {
    if (!selectedId || !selectedUri) return;
    setUploading(true); setUploadMsg(null); setUploadErr(false);
    try {
      const url = await uploadParfumImage(selectedId, selectedUri);
      await updateParfum(selectedId, { imageUrl: url });
      setUploadMsg(`✅ Image uploadée ! ${selectedParfum?.marque} – ${selectedParfum?.nom}`);
      setSelectedUri(null); setSelectedId(null);
    } catch (e: unknown) {
      const message = e instanceof Error ? e.message : "Erreur d'upload.";
      setUploadMsg(message);
      setUploadErr(true);
    } finally {
      setUploading(false);
    }
  };

  return (
    <SafeAreaView style={s.container}>
      <ScrollView contentContainerStyle={s.scroll}>
        <Text style={s.title}>Administration</Text>
        <Text style={s.sub}>Seed du catalogue</Text>
        <Text style={s.desc}>Insère {PERFUMES_SEED.length} parfums iconiques dans Firestore.</Text>
        <Pressable style={[s.btn, seeding && s.btnOff]} onPress={doSeed} disabled={seeding}>
          {seeding ? <ActivityIndicator size="small" color="#FFF"/> : <Text style={s.btnText}>Lancer le seed ({PERFUMES_SEED.length} parfums)</Text>}
        </Pressable>
        <Pressable style={[s.btnDanger, resetting && s.btnOff]} onPress={doReset} disabled={resetting}>
          {resetting ? <ActivityIndicator size="small" color="#FFF"/> : <Text style={s.btnText}>Reset cache + re-seed</Text>}
        </Pressable>
        {msg && <Text style={[s.msg, msg.includes('Erreur') && s.msgErr]}>{msg}</Text>}
        <View style={s.hr}/>

        {/* ── Upload ────────────────────────────── */}
        <Text style={s.sub}>Upload image parfum</Text>
        <Text style={s.desc}>
          Attribue une photo à un parfum existant. Sélectionne d'abord un parfum, puis choisis une image.
        </Text>

        {/* Sélecteur de parfum */}
        <Text style={s.fieldLabel}>Parfum cible</Text>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={s.pickerRow}>
          {parfums.length === 0 && <Text style={{color:theme.colors.textMuted,fontSize:13}}>Aucun parfum dans la base.</Text>}
          {parfums.slice(0, 50).map(p => (
            <Pressable
              key={p.id}
              style={[s.pickItem, selectedId === p.id && s.pickActive]}
              onPress={() => setSelectedId(p.id)}
            >
              <Text style={[s.pickText, selectedId === p.id && s.pickTextActive]}>
                {p.marque} – {p.nom}
              </Text>
            </Pressable>
          ))}
        </ScrollView>

        {selectedParfum?.imageUrl && (
          <View style={s.currentImgWrap}>
            <Text style={s.fieldLabel}>Image actuelle</Text>
            <Image source={{ uri: selectedParfum.imageUrl }} style={s.currentImg} />
          </View>
        )}

        {/* Sélecteur image */}
        <Pressable style={s.btnOutline} onPress={pickImage} disabled={uploading}>
          <Text style={s.btnOutlineText}>{selectedUri ? "📸 Changer l'image" : '📸 Choisir une image'}</Text>
        </Pressable>

        {selectedUri && (
          <View style={s.previewWrap}>
            <Image source={{ uri: selectedUri }} style={s.preview} />
            <Pressable style={s.clearPreview} onPress={() => setSelectedUri(null)}>
              <Text style={{color:theme.colors.danger,fontSize:13}}>✕ Retirer</Text>
            </Pressable>
          </View>
        )}

        {/* Bouton upload */}
        {selectedUri && selectedId && (
          <Pressable style={[s.btn, uploading && s.btnOff]} onPress={doUpload} disabled={uploading}>
            {uploading
              ? <ActivityIndicator size="small" color="#FFF"/>
              : <Text style={s.btnText}>⬆️ Uploader pour {selectedParfum?.marque} – {selectedParfum?.nom}</Text>
            }
          </Pressable>
        )}

        {uploadMsg && <Text style={[s.msg, uploadErr && s.msgErr]}>{uploadMsg}</Text>}
        <Text style={{fontSize:12,color:theme.colors.textMuted,marginTop:8}}>Parfums dans la base : {parfums.length}</Text>
      </ScrollView>
    </SafeAreaView>
  );
}


const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: theme.colors.background },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 32 },
  scroll: { padding: 24 },
  title: { fontFamily: 'PlayfairDisplay_700Bold', fontSize: 24, color: theme.colors.text, marginBottom: 24 },
  sub: { fontSize: 16, fontWeight: '600', color: theme.colors.text, marginBottom: 8 },
  desc: { fontSize: 14, color: theme.colors.textMuted, marginBottom: 16, lineHeight: 20 },

  // Seed
  btn: { backgroundColor: theme.colors.primary, borderRadius: theme.radius.base, height: 48, justifyContent: 'center', alignItems: 'center', marginTop: 12, ...theme.shadow.button },
  btnDanger: { backgroundColor: theme.colors.danger, borderRadius: theme.radius.base, height: 48, justifyContent: 'center', alignItems: 'center', marginTop: 12, ...theme.shadow.button },
  btnOff: { opacity: 0.5 },
  btnText: { color: '#FFF', fontWeight: '600', fontSize: 15 },
  btnOutline: { borderWidth: 1, borderColor: theme.colors.primary, borderRadius: theme.radius.base, height: 48, justifyContent: 'center', alignItems: 'center', marginTop: 12 },
  btnOutlineText: { color: theme.colors.primary, fontWeight: '600', fontSize: 15 },
  msg: { marginTop: 12, fontSize: 14, color: theme.colors.success },
  msgErr: { color: theme.colors.danger },
  hr: { height: 1, backgroundColor: theme.colors.border, marginVertical: 32 },

  // Upload — sélecteur parfum
  fieldLabel: { fontSize: 13, fontWeight: '500', color: theme.colors.text, marginBottom: 8, marginTop: 8 },
  pickerRow: { marginBottom: 12, maxHeight: 60 },
  pickItem: { paddingHorizontal: 14, paddingVertical: 8, borderRadius: 20, backgroundColor: theme.colors.surface2, marginRight: 8 },
  pickActive: { backgroundColor: theme.colors.violetSoft, borderWidth: 1, borderColor: theme.colors.primary },
  pickText: { fontSize: 13, color: theme.colors.text },
  pickTextActive: { color: theme.colors.primary, fontWeight: '600' },

  // Upload — image
  currentImgWrap: { marginBottom: 12 },
  currentImg: { width: '100%', height: 160, borderRadius: 12, resizeMode: 'cover' },
  previewWrap: { alignItems: 'center', marginTop: 12 },
  preview: { width: 200, height: 200, borderRadius: 12, resizeMode: 'cover' },
  clearPreview: { marginTop: 6 },
});
