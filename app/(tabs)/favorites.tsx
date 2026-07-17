// app/(tabs)/favorites.tsx — Ecran Favoris (extrait de ProfilePage)

import { useState, useMemo } from 'react';
import { View, Text, ScrollView, Pressable, ActivityIndicator, Alert, StyleSheet } from 'react-native';
import { Image } from 'expo-image';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import Ionicons from '@react-native-vector-icons/ionicons/static';
import { useAuthContext } from '../../src/contexts/AuthContext';
import { useFavoris } from '../../src/hooks/useFavoris';
import { getParfumById } from '../../src/services/firestore';
import { moveToCollection, moveToWishlist } from '../../src/services/user-data';
import { setPendingParfum } from '../../src/services/catalog-bridge';
import { useTheme, type Theme } from '../../src/theme/ThemeContext';
import EmptyState from '../../src/components/EmptyState';

interface Props {
  onScroll?: (y: number) => void;
}

export default function FavoritesPage({ onScroll }: Props) {
  const { theme } = useTheme();
  const s = useMemo(() => getStyles(theme), [theme]);
  const { user, authReady, isAuthenticated } = useAuthContext();
  const router = useRouter();
  const uid = user?.uid ?? null;
  const { favoris, loading, removeFavori } = useFavoris(uid);
  const [imgFailed, setImgFailed] = useState(false);
  const initial = user?.email?.charAt(0).toUpperCase() ?? '?';

  const goToDetail = async (parfumId: string) => {
    try {
      const p = await getParfumById(parfumId);
      if (p) setPendingParfum(p);
    } catch {}
    router.push(`/catalog/${parfumId}`);
  };

  const showContextMenu = (itemId: string, nom: string | null, marque: string | null, imageUrl: string | null, parfumId: string, familleOlactive?: string | null) => {
    Alert.alert('Actions', undefined, [
      { text: 'Deplacer vers Collection', onPress: () => moveToCollection(uid!, 'favoris', itemId, parfumId, nom, marque, imageUrl) },
      { text: 'Deplacer vers Wishlist', onPress: () => moveToWishlist(uid!, 'favoris', itemId, parfumId, nom, marque, imageUrl, familleOlactive) },
      { text: 'Retirer', style: 'destructive', onPress: () => removeFavori(itemId) },
      { text: 'Annuler', style: 'cancel' },
    ]);
  };

  if (!authReady) return <View style={s.center}><ActivityIndicator size="large" color={theme.colors.primary} /></View>;
  if (!isAuthenticated) {
    return (
      <SafeAreaView edges={['top', 'bottom']} style={s.container}>
        <View style={s.center}>
          <Ionicons name="heart-outline" size={64} color={theme.colors.textMuted} />
          <Text style={s.emptyTitle}>Connectez-vous</Text>
          <Text style={s.emptyDesc}>Accedez a vos favoris.</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView edges={['top', 'bottom']} style={s.container}>
      <ScrollView
        contentContainerStyle={s.scroll}
        onScroll={onScroll ? (e) => onScroll(e.nativeEvent.contentOffset.y) : undefined}
        scrollEventThrottle={16}
      >
        <View style={s.headerBar}>
          <Text style={s.title}>Favoris . {favoris.length}</Text>
          <Pressable onPress={() => router.push('/settings')} hitSlop={8} style={s.avatarBtn}>
            {user?.photoURL && !imgFailed ? (
              <Image source={{ uri: user.photoURL }} style={s.avatarImg} contentFit="cover" transition={200} onError={() => setImgFailed(true)} />
            ) : (
              <View style={s.avatarFb}><Text style={s.avatarTxt}>{initial}</Text></View>
            )}
          </Pressable>
        </View>

        {loading ? <ActivityIndicator style={{ marginTop: 24 }} color={theme.colors.primary} /> :
         favoris.length === 0 ? <EmptyState variant="favoris" onAction={() => router.navigate('/(tabs)')} /> :
         favoris.map(f => (
           <Pressable key={f.id} style={s.listItem} onPress={() => goToDetail(f.parfumId)}>
             <View style={s.itemLeft}>
               <ListItemImage imageUrl={f.imageUrl ?? undefined} t={theme} />
               <View>
                 <Text style={s.itemName}>{f.nom ?? f.parfumId.replace(/_/g, ' ')}</Text>
                 {f.marque ? <Text style={s.itemBrand}>{f.marque}</Text> : null}
                 {f.familleOlactive ? <Text style={s.itemFamily}>{f.familleOlactive}</Text> : null}
               </View>
             </View>
             <Pressable onPress={() => showContextMenu(f.id, f.nom ?? null, f.marque ?? null, f.imageUrl ?? null, f.parfumId, f.familleOlactive ?? null)} hitSlop={12}>
               <Ionicons name="ellipsis-horizontal" size={20} color={theme.colors.textMuted} />
             </Pressable>
           </Pressable>
         ))}
      </ScrollView>
    </SafeAreaView>
  );
}

function ListItemImage({ imageUrl, t }: { imageUrl?: string; t: Theme }) {
  const [failed, setFailed] = useState(false);
  if (!imageUrl || failed) {
    return <Ionicons name="heart-outline" size={20} color={t.colors.primary} />;
  }
  return <Image source={{ uri: imageUrl }} style={{ width: 44, height: 44, borderRadius: 8, backgroundColor: t.colors.surface2 }} contentFit="cover" transition={200} onError={() => setFailed(true)} />;
}

function getStyles(t: Theme) {
  return {
    container: { flex: 1, backgroundColor: t.colors.background },
    center: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 32 },
    scroll: { paddingBottom: 40 },
    title: { fontFamily: 'PlayfairDisplay_700Bold', fontSize: 22, color: t.colors.text, flex: 1 },
    headerBar: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, paddingTop: 20, paddingBottom: 8 },
    avatarBtn: { width: 36, height: 36, borderRadius: 18, overflow: 'hidden' },
    avatarImg: { width: 36, height: 36, borderRadius: 18 },
    avatarFb: { width: 36, height: 36, borderRadius: 18, backgroundColor: t.colors.primarySoft, justifyContent: 'center', alignItems: 'center' },
    avatarTxt: { fontFamily: 'Inter_700Bold', fontSize: 14, color: t.colors.primaryInk },
    listItem: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingVertical: 14, paddingHorizontal: 16, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: t.colors.border },
    itemLeft: { flexDirection: 'row', alignItems: 'center', gap: 12, flex: 1 },
    itemName: { fontFamily: 'Inter_600SemiBold', fontSize: 15, color: t.colors.text },
    itemBrand: { fontFamily: 'Inter_400Regular', fontSize: 12, color: t.colors.textMuted, marginTop: 1 },
    itemFamily: { fontFamily: 'Inter_400Regular', fontSize: 11, color: t.colors.primary, marginTop: 2 },
    emptyTitle: { fontFamily: 'PlayfairDisplay_600SemiBold', fontSize: 20, color: t.colors.text, marginTop: 12 },
    emptyDesc: { fontFamily: 'Inter_400Regular', fontSize: 14, color: t.colors.textMuted, textAlign: 'center', lineHeight: 20, marginTop: 6 },
  } as const;
}
