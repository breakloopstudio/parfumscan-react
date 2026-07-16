// src/features/profile/ProfilePage.tsx — Profil (3 listes : Collection, Wishlist, Favoris + Historique)

import { useState } from 'react';
import { View, Text, ScrollView, Pressable, ActivityIndicator, Alert, StyleSheet } from 'react-native';
import { Image } from 'expo-image';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Link, useRouter } from 'expo-router';
import Ionicons from '@react-native-vector-icons/ionicons/static';
import { useAuthContext } from '../../contexts/AuthContext';
import { useFavoris } from '../../hooks/useFavoris';
import { useScans } from '../../hooks/useScans';
import { useCollection } from '../../hooks/useCollection';
import { useWishlist } from '../../hooks/useWishlist';
import { getParfumById } from '../../services/firestore';
import { moveToCollection, moveToWishlist, moveFavori } from '../../services/user-data';
import { setPendingParfum } from '../../services/catalog-bridge';
import { theme } from '../../theme/theme';
import EmptyState from '../../components/EmptyState';

function formatScanDate(d: Date | { toDate: () => Date } | undefined): string {
  if (!d) return '';
  const date = 'toDate' in (d as object) ? (d as { toDate: () => Date }).toDate() : new Date(d as Date);
  return date.toLocaleString([], { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' });
}

function ListItemImage({ imageUrl }: { imageUrl?: string }) {
  const [failed, setFailed] = useState(false);
  if (!imageUrl || failed) {
    return <Ionicons name="scan-outline" size={20} color={theme.colors.primary} />;
  }
  return (
    <Image source={{ uri: imageUrl }} style={s.itemImage} contentFit="cover" transition={200} onError={() => setFailed(true)} />
  );
}

type Tab = 'collection' | 'wishlist' | 'favoris' | 'scans';

interface Props { onGoToCatalog: () => void }

export default function ProfilePage({ onGoToCatalog }: Props) {
  const { user, authReady, isAuthenticated, logout } = useAuthContext();
  const router = useRouter();
  const [tab, setTab] = useState<Tab>('favoris');
  const [showHistory, setShowHistory] = useState(false);
  const uid = user?.uid ?? null;

  const { favoris, loading: favLoading, removeFavori } = useFavoris(uid);
  const { scans, loading: scanLoading, removeScan } = useScans(uid);
  const { items: collection, loading: collLoading, remove: removeCollection } = useCollection(uid);
  const { items: wishlist, loading: wishLoading, remove: removeWishlist } = useWishlist(uid);
  const [imgFailed, setImgFailed] = useState(false);

  const goToDetail = async (parfumId: string) => {
    try {
      const p = await getParfumById(parfumId);
      if (p) setPendingParfum(p);
    } catch {}
    router.push(`/catalog/${parfumId}`);
  };

  const initial = user?.email?.charAt(0).toUpperCase() ?? '?';

  // ─── Menu contextuel "Déplacer vers..." ───
  const showContextMenu = (itemId: string, currentTab: Tab, nom: string | null, marque: string | null, imageUrl: string | null, parfumId: string, familleOlactive?: string | null) => {
    const otherTabs: { label: string; tab: Tab }[] = [];
    if (currentTab !== 'collection') otherTabs.push({ label: 'Collection', tab: 'collection' });
    if (currentTab !== 'wishlist') otherTabs.push({ label: 'Wishlist', tab: 'wishlist' });
    if (currentTab !== 'favoris') otherTabs.push({ label: 'Favoris', tab: 'favoris' });

    const buttons: { text: string; style?: 'destructive' | 'cancel'; onPress?: () => void }[] = [
      ...otherTabs.map(t => ({
        text: `Déplacer vers ${t.label}`,
        onPress: () => {
          if (t.tab === 'collection') moveToCollection(uid!, currentTab, itemId, parfumId, nom, marque, imageUrl);
          else if (t.tab === 'wishlist') moveToWishlist(uid!, currentTab, itemId, parfumId, nom, marque, imageUrl, familleOlactive);
          else if (t.tab === 'favoris') moveFavori(uid!, currentTab, itemId, parfumId, nom, marque, imageUrl, familleOlactive);
        },
      })),
      { text: 'Retirer', style: 'destructive' as const, onPress: () => {
        if (currentTab === 'collection') removeCollection(itemId);
        else if (currentTab === 'wishlist') removeWishlist(itemId);
        else if (currentTab === 'favoris') removeFavori(itemId);
      }},
      { text: 'Annuler', style: 'cancel' as const },
    ];
    Alert.alert('Actions', undefined, buttons);
  };

  const scanDel = (id: string) => Alert.alert('Supprimer', "Supprimer de l'historique ?", [{ text: 'Annuler', style: 'cancel' }, { text: 'Supprimer', style: 'destructive', onPress: () => removeScan(id) }]);

  // ─── Profil olfactif synthétique ───
  const allFamilles: string[] = [];
  favoris.forEach(f => { if (f.familleOlactive) allFamilles.push(f.familleOlactive); });
  collection.forEach(c => {}); // les items de collection n'ont pas de familleOlactive pour l'instant
  wishlist.forEach(w => { if (w.familleOlactive) allFamilles.push(w.familleOlactive); });
  const hasProfile = allFamilles.length >= 3;

  if (!authReady) return <View style={s.center}><ActivityIndicator size="large" color={theme.colors.primary} /></View>;
  if (!isAuthenticated) {
    return (
      <SafeAreaView edges={['top', 'bottom']} style={s.container}>
        <View style={s.center}>
          <Ionicons name="person-outline" size={64} color={theme.colors.textMuted} />
          <Text style={s.emptyTitle}>Connectez-vous</Text>
          <Text style={s.emptyDesc}>Accédez à votre collection, vos favoris et votre historique.</Text>
          <Link href="/auth/login" style={s.loginBtn}>
            <Text style={s.loginBtnText}>Se connecter</Text>
          </Link>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView edges={['top', 'bottom']} style={s.container}>
      <ScrollView contentContainerStyle={s.scroll}>
        {/* Header */}
        <View style={s.header}>
          <View style={s.headerTop}>
            <Pressable onPress={async () => { await logout(); router.replace('/auth/login'); }} hitSlop={8} style={s.logoutBtn}>
              <Ionicons name="log-out-outline" size={18} color={theme.colors.textMuted} />
            </Pressable>
            <Pressable onPress={() => router.push('/settings')} hitSlop={8} style={s.settingsBtn}>
              <Ionicons name="settings-outline" size={18} color={theme.colors.textMuted} />
            </Pressable>
          </View>
          {user?.photoURL && !imgFailed ? (
            <Image source={{ uri: user.photoURL }} style={s.avatar} contentFit="cover" transition={200} onError={() => setImgFailed(true)} />
          ) : (
            <View style={s.avatarFb}><Text style={s.avatarTxt}>{initial}</Text></View>
          )}
          <Text style={s.email}>{user?.email ?? 'Utilisateur'}</Text>
        </View>

        {/* Profil olfactif */}
        {hasProfile ? (
          <View style={s.olfactiveCard}>
            <Text style={s.olfactiveTitle}>Ton univers olfactif</Text>
            <View style={s.olfactiveBars}>
              {(() => {
                const counts: Record<string, number> = {};
                allFamilles.forEach(f => { counts[f] = (counts[f] || 0) + 1; });
                const sorted = Object.entries(counts).sort(([, a], [, b]) => b - a).slice(0, 3);
                const total = sorted.reduce((s, [, c]) => s + c, 0);
                const colors = [theme.colors.secondary, theme.colors.primary, theme.colors.deal];
                return sorted.map(([fam, count], i) => {
                  const pct = Math.round((count / total) * 100);
                  return (
                    <View key={fam} style={s.olfactiveBar}>
                      <View style={[s.olfactiveFill, { flex: pct, backgroundColor: colors[i % colors.length] }]} />
                      <Text style={s.olfactiveLabel}>{pct}% {fam}</Text>
                    </View>
                  );
                });
              })()}
            </View>
          </View>
        ) : (
          <View style={s.olfactiveEmpty}>
            <Text style={s.olfactiveEmptyText}>Ajoute des parfums à ta collection pour débloquer ton profil olfactif</Text>
            <Pressable onPress={onGoToCatalog}>
              <Text style={s.olfactiveEmptyCta}>Explorer le catalogue</Text>
            </Pressable>
          </View>
        )}

        {/* Onglets */}
        <View style={s.tabs}>
          {(['collection', 'wishlist', 'favoris'] as const).map(t => {
            const count = t === 'collection' ? collection.length : t === 'wishlist' ? wishlist.length : favoris.length;
            const icons = { collection: 'flask-outline', wishlist: 'bookmark-outline', favoris: 'heart-outline' };
            const labels = { collection: 'Collection', wishlist: 'Wishlist', favoris: 'Favoris' };
            return (
              <Pressable
                key={t}
                style={[s.tab, tab === t && s.tabActive]}
                onPress={() => setTab(t)}
              >
                <Ionicons name={icons[t] as never} size={16} color={tab === t ? theme.colors.primary : theme.colors.textMuted} />
                <Text style={[s.tabText, tab === t && s.tabTextActive]}>
                  {labels[t]} ({count})
                </Text>
              </Pressable>
            );
          })}
        </View>

        {/* Historique */}
        <Pressable onPress={() => setShowHistory(!showHistory)} style={s.historyToggle}>
          <Ionicons name="scan-outline" size={16} color={theme.colors.textMuted} />
          <Text style={s.historyToggleText}>Historique des scans ({scans.length})</Text>
          <Ionicons name={showHistory ? 'chevron-up' : 'chevron-down'} size={14} color={theme.colors.textMuted} />
        </Pressable>

        {/* Contenu des onglets */}
        {tab === 'collection' && (
          collLoading ? <ActivityIndicator style={{ marginTop: 24 }} color={theme.colors.primary} /> :
          collection.length === 0 ? <EmptyState variant="collection" onAction={onGoToCatalog} /> :
          collection.map(c => (
            <Pressable key={c.id} style={s.listItem} onPress={() => goToDetail(c.parfumId)}>
              <View style={s.itemLeft}><ListItemImage imageUrl={c.imageUrl ?? undefined} /><View><Text style={s.itemName}>{c.nom ?? c.parfumId.replace(/_/g, ' ')}</Text>{c.marque ? <Text style={s.itemBrand}>{c.marque}</Text> : null}</View></View>
              <Pressable onPress={() => showContextMenu(c.id, 'collection', c.nom ?? null, c.marque ?? null, c.imageUrl ?? null, c.parfumId)} hitSlop={12}><Ionicons name="ellipsis-horizontal" size={20} color={theme.colors.textMuted} /></Pressable>
            </Pressable>
          ))
        )}

        {tab === 'wishlist' && (
          wishLoading ? <ActivityIndicator style={{ marginTop: 24 }} color={theme.colors.primary} /> :
          wishlist.length === 0 ? <EmptyState variant="wishlist" onAction={onGoToCatalog} /> :
          wishlist.map(w => (
            <Pressable key={w.id} style={s.listItem} onPress={() => goToDetail(w.parfumId)}>
              <View style={s.itemLeft}><ListItemImage imageUrl={w.imageUrl ?? undefined} /><View><Text style={s.itemName}>{w.nom ?? w.parfumId.replace(/_/g, ' ')}</Text>{w.marque ? <Text style={s.itemBrand}>{w.marque}</Text> : null}</View></View>
              <Pressable onPress={() => showContextMenu(w.id, 'wishlist', w.nom ?? null, w.marque ?? null, w.imageUrl ?? null, w.parfumId, w.familleOlactive ?? null)} hitSlop={12}><Ionicons name="ellipsis-horizontal" size={20} color={theme.colors.textMuted} /></Pressable>
            </Pressable>
          ))
        )}

        {tab === 'favoris' && (
          favLoading ? <ActivityIndicator style={{ marginTop: 24 }} color={theme.colors.primary} /> :
          favoris.length === 0 ? <EmptyState variant="favoris" onAction={onGoToCatalog} /> :
          favoris.map(f => (
            <Pressable key={f.id} style={s.listItem} onPress={() => goToDetail(f.parfumId)}>
              <View style={s.itemLeft}><ListItemImage imageUrl={f.imageUrl ?? undefined} /><View><Text style={s.itemName}>{f.nom ?? f.parfumId.replace(/_/g, ' ')}</Text>{f.marque ? <Text style={s.itemBrand}>{f.marque}</Text> : null}</View></View>
              <Pressable onPress={() => showContextMenu(f.id, 'favoris', f.nom ?? null, f.marque ?? null, f.imageUrl ?? null, f.parfumId, f.familleOlactive ?? null)} hitSlop={12}><Ionicons name="ellipsis-horizontal" size={20} color={theme.colors.textMuted} /></Pressable>
            </Pressable>
          ))
        )}

        {showHistory && (
          scanLoading ? <ActivityIndicator style={{ marginTop: 24 }} color={theme.colors.primary} /> :
          scans.length === 0 ? <EmptyState variant="historique" onAction={() => router.push('/(tabs)/scan')} /> :
          scans.map(scan => (
            <Pressable key={scan.id} style={s.listItem} onPress={() => scan.parfumId && goToDetail(scan.parfumId)}>
              <View style={s.itemLeft}>
                <ListItemImage imageUrl={scan.imageUrl} />
                <View>
                  {scan.marque ? <Text style={s.itemName}>{scan.marque}</Text> : null}
                  <Text style={scan.marque ? s.itemSubName : s.itemName}>{scan.nom ?? (!scan.marque ? 'Scan' : '')}{scan.typeParfum && scan.nom ? ' · ' + scan.typeParfum : ''}</Text>
                  <Text style={s.itemBrand}>{formatScanDate(scan.scannedAt)}</Text>
                </View>
              </View>
              <Pressable onPress={() => scanDel(scan.id)} hitSlop={12}><Ionicons name="trash-outline" size={18} color={theme.colors.textMuted} /></Pressable>
            </Pressable>
          ))
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: theme.colors.background },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 32 },
  scroll: { paddingBottom: 40 },
  // ─── Header ───
  header: { alignItems: 'center', paddingTop: 24, paddingBottom: 12 },
  headerTop: { flexDirection: 'row', justifyContent: 'space-between', width: '100%', paddingHorizontal: 16, marginBottom: 8 },
  logoutBtn: { width: 32, height: 32, justifyContent: 'center', alignItems: 'center' },
  settingsBtn: { width: 32, height: 32, justifyContent: 'center', alignItems: 'center' },
  avatar: { width: 64, height: 64, borderRadius: 32 },
  avatarFb: { width: 64, height: 64, borderRadius: 32, backgroundColor: theme.colors.primarySoft, justifyContent: 'center', alignItems: 'center' },
  avatarTxt: { fontFamily: 'Inter_700Bold', fontSize: 24, color: theme.colors.primaryInk },
  email: { fontFamily: 'Inter_600SemiBold', fontSize: 16, color: theme.colors.text, marginTop: 8 },
  // ─── Profil olfactif ───
  olfactiveCard: { backgroundColor: theme.colors.surface, borderRadius: theme.radius.card, marginHorizontal: 16, padding: 16, marginBottom: 16, ...theme.shadow.card },
  olfactiveTitle: { fontFamily: 'PlayfairDisplay_700Bold', fontSize: 14, color: theme.colors.text, marginBottom: 10 },
  olfactiveBars: { gap: 6 },
  olfactiveBar: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  olfactiveFill: { height: 8, borderRadius: 4, minWidth: 4 },
  olfactiveLabel: { fontFamily: 'Inter_500Medium', fontSize: 12, color: theme.colors.textMuted },
  olfactiveEmpty: { backgroundColor: theme.colors.surface2, borderRadius: theme.radius.card, marginHorizontal: 16, padding: 16, marginBottom: 16, alignItems: 'center', borderWidth: 1, borderColor: theme.colors.border },
  olfactiveEmptyText: { fontFamily: 'Inter_400Regular', fontSize: 13, color: theme.colors.textMuted, textAlign: 'center', marginBottom: 8 },
  olfactiveEmptyCta: { fontFamily: 'Inter_600SemiBold', fontSize: 14, color: theme.colors.primary },
  // ─── Tabs ───
  tabs: { flexDirection: 'row', paddingHorizontal: 16, gap: 8, marginBottom: 12 },
  tab: { flex: 1, flexDirection: 'row', justifyContent: 'center', alignItems: 'center', gap: 4, paddingVertical: 10, borderRadius: theme.radius.base, backgroundColor: theme.colors.surface2 },
  tabActive: { backgroundColor: theme.colors.primarySoft },
  tabText: { fontFamily: 'Inter_500Medium', fontSize: 13, color: theme.colors.textMuted },
  tabTextActive: { color: theme.colors.primary },
  // ─── Historique ───
  historyToggle: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, paddingVertical: 10, marginBottom: 4 },
  historyToggleText: { fontFamily: 'Inter_500Medium', fontSize: 13, color: theme.colors.textMuted },
  // ─── Été vide auth ───
  emptyTitle: { fontFamily: 'PlayfairDisplay_600SemiBold', fontSize: 20, color: theme.colors.text, marginTop: 12 },
  emptyDesc: { fontFamily: 'Inter_400Regular', fontSize: 14, color: theme.colors.textMuted, textAlign: 'center', lineHeight: 20, marginTop: 6 },
  loginBtn: { marginTop: 20, backgroundColor: theme.colors.primary, paddingHorizontal: 24, paddingVertical: 12, borderRadius: theme.radius.base, ...theme.shadow.button },
  loginBtnText: { color: '#FFFFFF', fontFamily: 'Inter_600SemiBold', fontSize: 16 },
  // ─── Liste ───
  listItem: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingVertical: 14, paddingHorizontal: 16, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: theme.colors.border },
  itemLeft: { flexDirection: 'row', alignItems: 'center', gap: 12, flex: 1 },
  itemImage: { width: 44, height: 44, borderRadius: 8, backgroundColor: theme.colors.surface2 },
  itemName: { fontFamily: 'Inter_600SemiBold', fontSize: 15, color: theme.colors.text },
  itemSubName: { fontFamily: 'Inter_400Regular', fontSize: 14, color: theme.colors.text, marginTop: 1 },
  itemBrand: { fontFamily: 'Inter_400Regular', fontSize: 12, color: theme.colors.textMuted, marginTop: 1 },
});
