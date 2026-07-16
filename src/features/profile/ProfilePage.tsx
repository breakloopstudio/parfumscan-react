// app/(tabs)/profile.tsx — Profil (utilisé par le TabPager index.tsx)

import { useState } from 'react';
import { View, Text, ScrollView, Pressable, ActivityIndicator, Alert, StyleSheet } from 'react-native';
import { Image } from 'expo-image';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Link, useRouter } from 'expo-router';
import Ionicons from "@react-native-vector-icons/ionicons/static";
import Animated, { useSharedValue, useAnimatedStyle, withTiming, runOnJS } from 'react-native-reanimated';
import { useAuthContext } from '../../contexts/AuthContext';
import { useFavoris } from '../../hooks/useFavoris';
import { useScans } from '../../hooks/useScans';
import type { FirestoreDate } from '../../models/user-scan.interface';
import { theme } from '../../theme/theme';
import { getParfumById } from '../../services/firestore';
import { setPendingParfum } from '../../services/catalog-bridge';

function formatScanDate(d: Date | FirestoreDate | undefined): string {
  if (!d) return '';
  const date = 'toDate' in (d as object) ? (d as FirestoreDate).toDate() : new Date(d as Date);
  return date.toLocaleString([], { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' });
}

function ScanItemImage({ imageUrl }: { imageUrl?: string }) {
  const [failed, setFailed] = useState(false);
  if (!imageUrl || failed) {
    return <Ionicons name="scan-outline" size={20} color={theme.colors.primary} />;
  }
  return (
    <Image
      source={{ uri: imageUrl }}
      style={s.itemImage}
      contentFit="cover"
      transition={200}
      onError={() => setFailed(true)}
    />
  );
}

function FavHeart({ onPress }: { onPress: () => void }) {
  const scale = useSharedValue(1);
  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));
  const handlePress = () => {
    scale.value = withTiming(1.3, { duration: 100 }, (finished) => {
      if (finished) {
        scale.value = withTiming(1, { duration: 150 }, (finished) => {
          if (finished) runOnJS(onPress)();
        });
      }
    });
  };
  return (
    <Pressable onPress={handlePress} hitSlop={12}>
      <Animated.View style={animatedStyle}>
        <Ionicons name="heart" size={20} color={theme.colors.danger} />
      </Animated.View>
    </Pressable>
  );
}

function getLevel(count: number): string {
  if (count >= 20) return 'Expert du bon plan';
  if (count >= 5) return 'Chasseur de bonnes affaires';
  return 'Nez novice';
}

type Tab = 'favoris' | 'scans';

interface Props { onGoToCatalog: () => void }

export default function ProfilePage({ onGoToCatalog }: Props) {
  const { user, authReady, isAuthenticated, logout } = useAuthContext();
  const router = useRouter();
  const [tab, setTab] = useState<Tab>('favoris');
  const uid = user?.uid ?? null;
  const { favoris, loading: favLoading, removeFavori } = useFavoris(uid);
  const { scans, loading: scanLoading, removeScan } = useScans(uid);
  const [imgFailed, setImgFailed] = useState(false);

  const goToDetail = async (parfumId: string) => {
    // Pre-fetch Firestore pour un affichage instantane sur la fiche detail
    try {
      const p = await getParfumById(parfumId);
      if (p) setPendingParfum(p);
    } catch {}
    router.push(`/catalog/${parfumId}`);
  };

  const scanCount = scans.length;
  const level = getLevel(scanCount);
  const initial = user?.email?.charAt(0).toUpperCase() ?? '?';
  const savings = scanCount * 18;

  const favDel = (id:string) => Alert.alert('Supprimer','Retirer des favoris ?',[{text:'Annuler',style:'cancel'},{text:'Supprimer',style:'destructive',onPress:()=>removeFavori(id)}]);
  const scanDel = (id:string) => Alert.alert('Supprimer',"Supprimer de l'historique ?",[{text:'Annuler',style:'cancel'},{text:'Supprimer',style:'destructive',onPress:()=>removeScan(id)}]);

  if (!authReady) return <View style={s.center}><ActivityIndicator size="large" color={theme.colors.primary}/></View>;
  if (!isAuthenticated) return <SafeAreaView edges={['top', 'bottom']} style={s.container}><View style={s.center}><Ionicons name="person-outline" size={64} color={theme.colors.textMuted}/><Text style={s.emptyTitle}>Connectez-vous</Text><Text style={s.emptyDesc}>Accédez à vos favoris et votre historique</Text><Link href="/auth/login" style={s.loginBtn}><Text style={s.loginBtnText}>Se connecter</Text></Link></View></SafeAreaView>;

  return (
    <SafeAreaView edges={['top', 'bottom']} style={s.container}>
      <ScrollView contentContainerStyle={s.scroll}>
          <View style={s.hero}>
            <Pressable style={s.logoutIcon} onPress={async()=>{await logout();router.replace('/auth/login');}} hitSlop={8}>
              <Ionicons name="log-out-outline" size={18} color={theme.colors.textMuted}/>
            </Pressable>
            {user?.photoURL && !imgFailed ? <Image source={{uri:user.photoURL}} style={s.avatar} contentFit="cover" transition={200} onError={()=>setImgFailed(true)}/> : <View style={s.avatarFb}><Text style={s.avatarTxt}>{initial}</Text></View>}
            <Text style={s.email}>{user?.email??'Utilisateur'}</Text>
            <View style={s.levelBadge}><Ionicons name="ribbon-outline" size={16} color={theme.colors.reward}/><Text style={s.levelText}> {level}</Text></View>
          </View>
          <View style={s.stats}>
            <View style={s.statCard}><Ionicons name="scan-outline" size={24} color={theme.colors.primary}/><Text style={s.statVal}>{scanCount}</Text><Text style={s.statLabel}>parfum(s) scanné(s)</Text></View>
            <View style={[s.statCard,s.statCardReward]}><Ionicons name="wallet-outline" size={24} color={theme.colors.reward}/><Text style={[s.statVal,{color:theme.colors.reward}]}>{savings} €</Text><Text style={s.statLabel}>économies potentielles</Text></View>
          </View>
          <View style={s.tabs}>
            <Pressable style={[s.tab,tab==='favoris'&&s.tabActive]} onPress={()=>setTab('favoris')}><Ionicons name="heart-outline" size={18} color={tab==='favoris'?theme.colors.primary:theme.colors.textMuted}/><Text style={[s.tabText,tab==='favoris'&&s.tabTextActive]}>Favoris</Text></Pressable>
            <Pressable style={[s.tab,tab==='scans'&&s.tabActive]} onPress={()=>setTab('scans')}><Ionicons name="scan-outline" size={18} color={tab==='scans'?theme.colors.primary:theme.colors.textMuted}/><Text style={[s.tabText,tab==='scans'&&s.tabTextActive]}>Historique</Text></Pressable>
          </View>
          <View style={tab !== 'favoris' && s.hidden}>
            {favLoading ? <ActivityIndicator style={{marginTop:32}} color={theme.colors.primary} /> :
             favoris.length === 0 ? <View style={s.emp}><Ionicons name="heart-outline" size={48} color={theme.colors.textMuted} /><Text style={s.emptyTitle}>Ton nez n'a pas encore de coup de cœur</Text><Text style={s.emptyDesc}>Explore le catalogue et garde tes parfums préférés à portée de main.</Text><Pressable style={s.emptyBtn} onPress={onGoToCatalog}><Text style={s.emptyBtnText}>Explorer le catalogue</Text></Pressable></View> :
             favoris.map(f => (<Pressable key={f.id} style={s.listItem} onPress={() => goToDetail(f.parfumId)}><View style={s.itemLeft}><ScanItemImage imageUrl={f.imageUrl} /><View><Text style={s.itemName}>{f.nom ?? f.parfumId.replace(/_/g, ' ')}</Text>{f.marque ? <Text style={s.itemBrand}>{f.marque}</Text> : null}</View></View><FavHeart onPress={() => favDel(f.id)} /></Pressable>))}
          </View>
          <View style={tab !== 'scans' && s.hidden}>
            {scanLoading ? <ActivityIndicator style={{marginTop:32}} color={theme.colors.primary} /> :
             scans.length === 0 ? <View style={s.emp}><Ionicons name="scan-outline" size={48} color={theme.colors.textMuted} /><Text style={s.emptyTitle}>Aucun scan</Text><Text style={s.emptyDesc}>Scanne ton premier flacon !</Text></View> :
             scans.map(scan => (<Pressable key={scan.id} style={s.listItem} onPress={() => scan.parfumId && goToDetail(scan.parfumId)}><View style={s.itemLeft}><ScanItemImage imageUrl={scan.imageUrl} /><View>{scan.marque ? <Text style={s.itemName}>{scan.marque}</Text> : null}<Text style={scan.marque ? s.itemSubName : s.itemName}>{scan.nom ?? (!scan.marque ? 'Scan' : '')}{scan.typeParfum && scan.nom ? ' · ' + scan.typeParfum : ''}</Text><Text style={s.itemBrand}>{formatScanDate(scan.scannedAt)}</Text></View></View><Pressable onPress={() => scanDel(scan.id)} hitSlop={12}><Ionicons name="trash-outline" size={20} color={theme.colors.textMuted} /></Pressable></Pressable>))}
          </View>
        </ScrollView>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  container:{flex:1,backgroundColor:theme.colors.background}, center:{flex:1,justifyContent:'center',alignItems:'center',padding:32},
  scroll:{paddingBottom:40}, hero:{alignItems:'center',paddingTop:24,paddingBottom:16},
  avatar:{width:72,height:72,borderRadius:36}, avatarFb:{width:72,height:72,borderRadius:36,backgroundColor:theme.colors.violetSoft,justifyContent:'center',alignItems:'center'},
  avatarTxt:{fontSize:28,fontWeight:'700',color:theme.colors.violetInk}, email:{fontFamily:'Inter_600SemiBold',fontSize:16,color:theme.colors.text,marginTop:8},
  levelBadge:{flexDirection:'row',alignItems:'center',marginTop:4}, levelText:{fontSize:13,color:theme.colors.reward,fontWeight:'500'},
  stats:{flexDirection:'row',paddingHorizontal:16,gap:12,marginBottom:20},
  statCard:{flex:1,borderRadius:theme.radius.card,padding:16,alignItems:'center',borderWidth:1,borderColor:theme.colors.primaryTint},
  statCardReward:{borderColor:theme.colors.reward,borderWidth:1}, statVal:{fontSize:22,fontWeight:'800',color:theme.colors.primary,marginTop:6},
  statLabel:{fontSize:11,color:theme.colors.textMuted,textAlign:'center',marginTop:2},
  tabs:{flexDirection:'row',paddingHorizontal:16,gap:8,marginBottom:16},
  tab:{flex:1,flexDirection:'row',justifyContent:'center',alignItems:'center',gap:6,paddingVertical:10,borderRadius:theme.radius.base,backgroundColor:theme.colors.surface2},
  tabActive:{backgroundColor:theme.colors.violetSoft}, tabText:{fontSize:14,fontWeight:'500',color:theme.colors.textMuted}, tabTextActive:{color:theme.colors.primary},
  emp:{alignItems:'center',paddingTop:32}, emptyTitle:{fontFamily:'PlayfairDisplay_600SemiBold',fontSize:18,color:theme.colors.text,marginTop:12},
  emptyDesc:{fontSize:14,color:theme.colors.textMuted,textAlign:'center',lineHeight:20,marginTop:6},
  emptyBtn:{marginTop:16,backgroundColor:theme.colors.primary,paddingHorizontal:20,paddingVertical:10,borderRadius:theme.radius.base},
  emptyBtnText:{color:'#FFF',fontWeight:'600',fontSize:15},
  loginBtn:{marginTop:20,backgroundColor:theme.colors.primary,paddingHorizontal:24,paddingVertical:12,borderRadius:theme.radius.base,...theme.shadow.button},
  loginBtnText:{color:'#FFF',fontWeight:'600',fontSize:16},
  listItem:{flexDirection:'row',alignItems:'center',justifyContent:'space-between',paddingVertical:14,paddingHorizontal:16,borderBottomWidth:StyleSheet.hairlineWidth,borderBottomColor:theme.colors.border},
  itemLeft:{flexDirection:'row',alignItems:'center',gap:12,flex:1},
  itemImage:{width:44,height:44,borderRadius:8,backgroundColor:theme.colors.surface2,resizeMode:'cover'},
  itemName:{fontSize:15,fontWeight:'600',color:theme.colors.text},
  itemSubName:{fontSize:14,color:theme.colors.text,marginTop:1},
  itemBrand:{fontSize:12,color:theme.colors.textMuted,marginTop:1},
  logoutIcon:{position:'absolute',top:8,right:16},
  hidden:{display:'none'},
});
