// app/(tabs)/collection.tsx — Écran Collection + Wishlist (extrait de ProfilePage)

import { useState, useMemo } from 'react';
import { View, Text, ScrollView, Pressable, ActivityIndicator, Alert, StyleSheet } from 'react-native';
import { Image } from 'expo-image';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import Ionicons from '@react-native-vector-icons/ionicons/static';
import { useAuthContext } from '../../src/contexts/AuthContext';
import { useCollection } from '../../src/hooks/useCollection';
import { useWishlist } from '../../src/hooks/useWishlist';
import { getParfumById } from '../../src/services/firestore';
import { moveToWishlist, moveToCollection, moveFavori } from '../../src/services/user-data';
import { setPendingParfum } from '../../src/services/catalog-bridge';
import { useTheme, type Theme } from '../../src/theme/ThemeContext';
import EmptyState from '../../src/components/EmptyState';

export default function CollectionPage() {
  const { theme } = useTheme();
  const s = useMemo(() => getStyles(theme), [theme]);
  const { user, authReady, isAuthenticated } = useAuthContext();
  const router = useRouter();
  const uid = user?.uid ?? null;
  const { items: collection, loading: collLoading, remove: removeCollection } = useCollection(uid);
  const { items: wishlist, loading: wishLoading, remove: removeWishlist } = useWishlist(uid);
  const [imgFailed, setImgFailed] = useState(false);
  const initial = user?.email?.charAt(0).toUpperCase() ?? '?';

  const goToDetail = async (parfumId: string) => {
    try {
      const p = await getParfumById(parfumId);
      if (p) setPendingParfum(p);
    } catch {}
    router.push(`/catalog/${parfumId}`);
  };

  const showCollectionMenu = (itemId: string, nom: string | null, marque: string | null, imageUrl: string | null, parfumId: string, familleOlactive?: string | null) => {
    Alert.alert('Actions', undefined, [
      { text: 'Déplacer vers Wishlist', onPress: () => moveToWishlist(uid!, 'collection', itemId, parfumId, nom, marque, imageUrl, familleOlactive) },
      { text: 'Déplacer vers Favoris', onPress: () => moveFavori(uid!, 'collection', itemId, parfumId, nom, marque, imageUrl, familleOlactive) },
      { text: 'Retirer', style: 'destructive', onPress: () => removeCollection(itemId) },
      { text: 'Annuler', style: 'cancel' },
    ]);
  };

  const showWishlistMenu = (itemId: string, nom: string | null, marque: string | null, imageUrl: string | null, parfumId: string, familleOlactive?: string | null) => {
    Alert.alert('Actions', undefined, [
      { text: 'Déplacer vers Collection', onPress: () => moveToCollection(uid!, 'wishlist', itemId, parfumId, nom, marque, imageUrl) },
      { text: 'Déplacer vers Favoris', onPress: () => moveFavori(uid!, 'wishlist', itemId, parfumId, nom, marque, imageUrl, familleOlactive) },
      { text: 'Retirer', style: 'destructive', onPress: () => removeWishlist(itemId) },
      { text: 'Annuler', style: 'cancel' },
    ]);
  };

  if (!authReady) return <View style={s.center}><ActivityIndicator size="large" color={theme.colors.primary} /></View>;
  if (!isAuthenticated) {
    return (
      <SafeAreaView edges={['top', 'bottom']} style={s.container}>
        <View style={s.center}>
          <Ionicons name="flask-outline" size={64} color={theme.colors.textMuted} />
          <Text style={s.emptyTitle}>Connectez-vous</Text>
          <Text style={s.emptyDesc}>Accédez à votre collection.</Text>
        </View>
      </SafeAreaView>
    );
  }

  const total = collection.length + wishlist.length;

  return (
    <SafeAreaView edges={['top', 'bottom']} style={s.container}>
      <ScrollView contentContainerStyle={s.scroll}>
        <View style={s.headerBar}>
          <Text style={s.title}>Collection · {total}</Text>
          <Pressable onPress={() => router.push('/settings')} hitSlop={8} style={s.avatarBtn}>
            {user?.photoURL && !imgFailed ? (
              <Image source={{ uri: user.photoURL }} style={s.avatarImg} contentFit="cover" transition={200} onError={() => setImgFailed(true)} />
            ) : (
              <View style={s.avatarFb}><Text style={s.avatarTxt}>{initial}</Text></View>
            )}
          </Pressable>
        </View>

        {/* Section Possédés */}
        <Text style={s.sectionTitle}>Possédés · {collection.length}</Text>
        {collLoading ? <ActivityIndicator style={{ marginTop: 12 }} color={theme.colors.primary} /> :
         collection.length === 0 ? <EmptyState variant="collection" onAction={() => router.navigate('/(tabs)')} /> :
         collection.map(c => (
           <Pressable key={c.id} style={s.listItem} onPress={() => goToDetail(c.parfumId)}>
             <View style={s.itemLeft}>
               <ListItemImage imageUrl={c.imageUrl ?? undefined} t={theme} />
               <View style={{ flex: 1 }}>
                 <Text style={s.itemName}>{c.nom ?? c.parfumId.replace(/_/g, ' ')}</Text>
                 {c.marque ? <Text style={s.itemBrand}>{c.marque}</Text> : null}
               </View>
             </View>
             <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
               <View style={s.badgeOwned}><Text style={s.badgeOwnedText}>Possédé</Text></View>
               <Pressable onPress={() => showCollectionMenu(c.id, c.nom ?? null, c.marque ?? null, c.imageUrl ?? null, c.parfumId)} hitSlop={12}>
                 <Ionicons name="ellipsis-horizontal" size={20} color={theme.colors.textMuted} />
               </Pressable>
             </View>
           </Pressable>
         ))}

        {/* Section Wishlist */}
        <Text style={[s.sectionTitle, { marginTop: 20 }]}>Wishlist · {wishlist.length}</Text>
        {wishLoading ? <ActivityIndicator style={{ marginTop: 12 }} color={theme.colors.primary} /> :
         wishlist.length === 0 ? <EmptyState variant="wishlist" onAction={() => router.navigate('/(tabs)')} /> :
         wishlist.map(w => (
           <Pressable key={w.id} style={s.listItem} onPress={() => goToDetail(w.parfumId)}>
             <View style={s.itemLeft}>
               <ListItemImage imageUrl={w.imageUrl ?? undefined} t={theme} />
               <View style={{ flex: 1 }}>
                 <Text style={s.itemName}>{w.nom ?? w.parfumId.replace(/_/g, ' ')}</Text>
                 {w.marque ? <Text style={s.itemBrand}>{w.marque}</Text> : null}
                 {w.familleOlactive ? <Text style={s.itemFamily}>{w.familleOlactive}</Text> : null}
               </View>
             </View>
             <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
               <View style={s.badgeWish}><Text style={s.badgeWishText}>À acheter</Text></View>
               <Pressable onPress={() => showWishlistMenu(w.id, w.nom ?? null, w.marque ?? null, w.imageUrl ?? null, w.parfumId, w.familleOlactive ?? null)} hitSlop={12}>
                 <Ionicons name="ellipsis-horizontal" size={20} color={theme.colors.textMuted} />
               </Pressable>
             </View>
           </Pressable>
         ))}
      </ScrollView>
    </SafeAreaView>
  );
}

function ListItemImage({ imageUrl, t }: { imageUrl?: string; t: Theme }) {
  const [failed, setFailed] = useState(false);
  if (!imageUrl || failed) {
    return <Ionicons name="flask-outline" size={20} color={t.colors.primary} />;
  }
  return <Image source={{ uri: imageUrl }} style={{ width: 44, height: 44, borderRadius: 8, backgroundColor: t.colors.surface2 }} contentFit="cover" transition={200} onError={() => setFailed(true)} />;
}

function getStyles(t: Theme) {
  return {
    container: { flex: 1, backgroundColor: t.colors.background },
    center: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 32 },
    scroll: { paddingBottom: 40 },
    title: { fontFamily: 'PlayfairDisplay_700Bold', fontSize: 22, color: t.colors.text, flex: 1 },
    headerBar: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, paddingTop: 20, paddingBottom: 4 },
    avatarBtn: { width: 36, height: 36, borderRadius: 18, overflow: 'hidden' },
    avatarImg: { width: 36, height: 36, borderRadius: 18 },
    avatarFb: { width: 36, height: 36, borderRadius: 18, backgroundColor: t.colors.primarySoft, justifyContent: 'center', alignItems: 'center' },
    avatarTxt: { fontFamily: 'Inter_700Bold', fontSize: 14, color: t.colors.primaryInk },
    sectionTitle: { fontFamily: 'Inter_600SemiBold', fontSize: 13, textTransform: 'uppercase', letterSpacing: 0.8, color: t.colors.textMuted, paddingHorizontal: 16, paddingTop: 12, paddingBottom: 4 },
    listItem: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingVertical: 14, paddingHorizontal: 16, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: t.colors.border },
    itemLeft: { flexDirection: 'row', alignItems: 'center', gap: 12, flex: 1 },
    itemName: { fontFamily: 'Inter_600SemiBold', fontSize: 15, color: t.colors.text },
    itemBrand: { fontFamily: 'Inter_400Regular', fontSize: 12, color: t.colors.textMuted, marginTop: 1 },
    itemFamily: { fontFamily: 'Inter_400Regular', fontSize: 11, color: t.colors.primary, marginTop: 2 },
    badgeOwned: { backgroundColor: t.colors.primarySoft, paddingHorizontal: 10, paddingVertical: 4, borderRadius: 8 },
    badgeOwnedText: { fontFamily: 'Inter_600SemiBold', fontSize: 11, color: t.colors.primary },
    badgeWish: { backgroundColor: t.colors.secondarySoft, paddingHorizontal: 10, paddingVertical: 4, borderRadius: 8 },
    badgeWishText: { fontFamily: 'Inter_600SemiBold', fontSize: 11, color: t.colors.secondary },
    emptyTitle: { fontFamily: 'PlayfairDisplay_600SemiBold', fontSize: 20, color: t.colors.text, marginTop: 12 },
    emptyDesc: { fontFamily: 'Inter_400Regular', fontSize: 14, color: t.colors.textMuted, textAlign: 'center', lineHeight: 20, marginTop: 6 },
  } as const;
}
