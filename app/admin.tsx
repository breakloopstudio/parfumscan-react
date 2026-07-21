// app/admin.tsx — Administration (upload images parfum)

import { useState, useEffect, useMemo, useCallback } from 'react';
import {
  View, Text, ScrollView, Pressable, ActivityIndicator,
  Alert,
} from 'react-native';
import { Image } from 'expo-image';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useAuthContext } from '../src/contexts/AuthContext';
import { onParfums, updateParfum } from '../src/services/firestore';
import { useTheme, type Theme } from '../src/theme/ThemeContext';
import type { Parfum } from '../src/models';
import { uploadParfumImage } from '../src/services/storage';

let ImagePicker: typeof import('expo-image-picker') | null = null;
import('expo-image-picker').then(m => { ImagePicker = m; }).catch(() => {});

export default function AdminPage() {
  const { theme } = useTheme();
  const s = useMemo(() => getStyles(theme), [theme]);
  const { isAuthenticated, isAdmin } = useAuthContext();
  const [parfums, setParfums] = useState<Parfum[]>([]);

  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [selectedUri, setSelectedUri] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const [uploadMsg, setUploadMsg] = useState<string | null>(null);
  const [uploadErr, setUploadErr] = useState(false);

  useEffect(() => onParfums(setParfums), []);

  const selectedParfum = parfums.find(p => p.id === selectedId) ?? null;

  if (!isAuthenticated) return <View style={s.center}><Text style={{fontFamily:'Inter_400Regular',color:theme.colors.textMuted}}>Connectez-vous en tant qu'admin.</Text></View>;
  if (!isAdmin) return <View style={s.center}><Text style={{fontFamily:'Inter_400Regular',color:theme.colors.textMuted}}>Accès réservé aux administrateurs.</Text></View>;

  const pickImage = useCallback(async () => {
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
  }, []);

  const doUpload = useCallback(async () => {
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
  }, [selectedId, selectedUri, selectedParfum]);

  return (
    <SafeAreaView style={s.container}>
      <ScrollView contentContainerStyle={s.scroll}>
        <Text style={s.title}>Administration</Text>

        <Text style={s.sub}>Upload image parfum</Text>
        <Text style={s.desc}>
          Attribue une photo à un parfum existant. Sélectionne d'abord un parfum, puis choisis une image.
        </Text>

        <Text style={s.fieldLabel}>Parfum cible</Text>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={s.pickerRow}>
          {parfums.length === 0 && <Text style={{fontFamily:'Inter_400Regular',color:theme.colors.textMuted,fontSize:13}}>Aucun parfum dans la base.</Text>}
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
            <Image source={{ uri: selectedParfum.imageUrl }} style={s.currentImg} contentFit="cover" transition={200} />
          </View>
        )}

        <Pressable style={s.btnOutline} onPress={pickImage} disabled={uploading}>
          <Text style={s.btnOutlineText}>{selectedUri ? "📸 Changer l'image" : '📸 Choisir une image'}</Text>
        </Pressable>

        {selectedUri && (
          <View style={s.previewWrap}>
            <Image source={{ uri: selectedUri }} style={s.preview} contentFit="cover" transition={200} />
            <Pressable style={s.clearPreview} onPress={() => setSelectedUri(null)}>
              <Text style={{fontFamily:'Inter_400Regular',color:theme.colors.danger,fontSize:13}}>✕ Retirer</Text>
            </Pressable>
          </View>
        )}

        {selectedUri && selectedId && (
          <Pressable style={[s.btnUpload, uploading && { opacity: 0.5 }]} onPress={doUpload} disabled={uploading}>
            {uploading
              ? <ActivityIndicator size="small" color="#FFF"/>
              : <Text style={s.btnUploadText}>⬆️ Uploader pour {selectedParfum?.marque} – {selectedParfum?.nom}</Text>
            }
          </Pressable>
        )}

        {uploadMsg && <Text style={{fontFamily:'Inter_400Regular',marginTop:12,fontSize:14,color:uploadErr?theme.colors.danger:theme.colors.success}}>{uploadMsg}</Text>}
        <Text style={{fontFamily:'Inter_400Regular',fontSize:12,color:theme.colors.textMuted,marginTop:8}}>Parfums dans la base : {parfums.length}</Text>
      </ScrollView>
    </SafeAreaView>
  );
}

function getStyles(t: Theme) {
  return {
    container: { flex: 1, backgroundColor: t.colors.background },
    center: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 32 },
    scroll: { padding: 24 },
    title: { fontFamily: 'PlayfairDisplay_700Bold', fontSize: 24, color: t.colors.text, marginBottom: 24 },
    sub: { fontSize: 16, fontFamily: 'Inter_600SemiBold', color: t.colors.text, marginBottom: 8 },
    desc: { fontSize: 14, fontFamily: 'Inter_400Regular', color: t.colors.textMuted, marginBottom: 16, lineHeight: 20 },
    btnUpload: { backgroundColor: t.colors.primary, borderRadius: t.radius.base, height: 48, justifyContent: 'center', alignItems: 'center', marginTop: 12, ...t.shadow.button },
    btnUploadText: { color: '#FFF', fontFamily: 'Inter_600SemiBold', fontSize: 15 },
    btnOutline: { borderWidth: 1, borderColor: t.colors.primary, borderRadius: t.radius.base, height: 48, justifyContent: 'center', alignItems: 'center', marginTop: 12 },
    btnOutlineText: { color: t.colors.primary, fontFamily: 'Inter_600SemiBold', fontSize: 15 },
    fieldLabel: { fontSize: 13, fontFamily: 'Inter_500Medium', color: t.colors.text, marginBottom: 8, marginTop: 8 },
    pickerRow: { marginBottom: 12, maxHeight: 60 },
    pickItem: { paddingHorizontal: 14, paddingVertical: 8, borderRadius: 20, backgroundColor: t.colors.surface2, marginRight: 8 },
    pickActive: { backgroundColor: t.colors.violetSoft, borderWidth: 1, borderColor: t.colors.primary },
    pickText: { fontSize: 13, fontFamily: 'Inter_500Medium', color: t.colors.text },
    pickTextActive: { color: t.colors.primary, fontFamily: 'Inter_600SemiBold' },
    currentImgWrap: { marginBottom: 12 },
    currentImg: { width: '100%', height: 160, borderRadius: 12, resizeMode: 'cover' },
    previewWrap: { alignItems: 'center', marginTop: 12 },
    preview: { width: 200, height: 200, borderRadius: 12, resizeMode: 'cover' },
    clearPreview: { marginTop: 6 },
  } as const;
}