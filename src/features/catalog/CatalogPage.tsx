// app/(tabs)/catalog.tsx — Catalogue (utilisé par le TabPager index.tsx)

import { useState, useEffect } from 'react';
import { View, Text, TextInput, FlatList, ActivityIndicator, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Link, useLocalSearchParams } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useAuthContext } from '../../contexts/AuthContext';
import { useCatalog } from '../../hooks/useCatalog';
import ParfumCard from '../../components/ParfumCard';
import { getPopularParfums } from '../../services/firestore';
import { theme } from '../../theme/theme';
import type { ParfumSearchResult } from '../../services/fragella';

import { consumePendingCatalogQuery } from '../../services/catalog-bridge';

export default function CatalogPage() {
  const { authReady, isAuthenticated } = useAuthContext();
  const { q: routeQuery } = useLocalSearchParams<{ q?: string }>();
  const initialQuery = routeQuery ?? consumePendingCatalogQuery();
  const [searchText, setSearchText] = useState(initialQuery ?? '');
  const { parfums, searching, search, clear } = useCatalog();
  const [popularParfums, setPopularParfums] = useState<ParfumSearchResult[]>([]);
  const [popularLoading, setPopularLoading] = useState(true);
  const handleSearch = (t: string) => { setSearchText(t); t.trim().length >= 3 ? search(t) : clear(); };

  useEffect(() => {
    getPopularParfums(6).then(p => { setPopularParfums(p); setPopularLoading(false); });
  }, []);

  // Recherche auto quand on arrive depuis le scan avec ?q=...
  useEffect(() => {
    if (initialQuery && initialQuery.trim().length >= 3) {
      setSearchText(initialQuery);
      search(initialQuery.trim());
    }
  }, [initialQuery]);

  return (
    <SafeAreaView edges={['top', 'bottom']} style={s.container}>
      {authReady && !isAuthenticated && (
        <View style={s.banner}><Ionicons name="heart-outline" size={20} color={theme.colors.primary}/><Text style={s.bannerText}>Connectez-vous pour sauvegarder vos parfums préférés</Text><Link href="/auth/login" style={s.bannerLink}><Text style={s.bannerLinkText}>Connexion</Text></Link></View>
      )}
      {!searchText && <View style={s.hero}><Ionicons name="sparkles-outline" size={32} color={theme.colors.primary}/><Text style={s.heroTitle}>ParfumScan</Text><Text style={s.heroSub}>Trouve ton parfum au meilleur prix</Text></View>}
      <View style={s.searchWrap}><TextInput style={s.searchInput} placeholder="Rechercher un parfum..." placeholderTextColor={theme.colors.textMuted} value={searchText} onChangeText={handleSearch} autoCapitalize="none" autoCorrect={false}/></View>
      {!searchText ? (
        <View style={s.ghostSection}><Text style={s.ghostLabel}>Parfums populaires</Text>
          {popularLoading ? <ActivityIndicator style={{ marginTop: 20 }} color={theme.colors.primary} /> :
            <View style={s.popularGrid}>
              {popularParfums.map(p => <ParfumCard key={p.id} parfum={p} />)}
            </View>
          }
        </View>
      ) : (
        <><Text style={s.resultsCount}>{parfums.length} parfum(s)</Text>{searching && <ActivityIndicator style={{marginTop:12}} color={theme.colors.primary}/>}
        <FlatList data={parfums} keyExtractor={(p, i) => `${p.id}_${i}`} renderItem={({item})=><ParfumCard parfum={item} showDeal/>} contentContainerStyle={{paddingBottom:16}} showsVerticalScrollIndicator={false}
          ListEmptyComponent={!searching?<View style={s.empty}><Ionicons name="search-outline" size={64} color={theme.colors.primary} style={{opacity:.5}}/><Text style={s.emptyTitle}>Aucun résultat</Text><Text style={s.emptyDesc}>Essaie une autre orthographe{'\n'}ou scanne un flacon !</Text><Link href="/(tabs)/scan" style={s.emptyScanBtn}><Text style={s.emptyScanText}>Scanner un flacon</Text></Link></View>:null}/>
        </>
      )}
    </SafeAreaView>
  );
}


const s = StyleSheet.create({
  container:{flex:1,backgroundColor:theme.colors.background},
  banner:{flexDirection:'row',alignItems:'center',backgroundColor:theme.colors.violetSoft,padding:12,gap:8},
  bannerText:{flex:1,fontSize:13,color:theme.colors.violetInk},
  bannerLink:{backgroundColor:theme.colors.primary,paddingHorizontal:12,paddingVertical:6,borderRadius:theme.radius.sm},
  bannerLinkText:{color:'#FFF',fontWeight:'600',fontSize:13},
  hero:{alignItems:'center',paddingTop:20,paddingBottom:12},
  heroTitle:{fontFamily:'PlayfairDisplay_700Bold',fontSize:28,color:theme.colors.text},
  heroSub:{fontSize:14,color:theme.colors.textMuted,marginTop:4},
  searchWrap:{paddingHorizontal:16,paddingBottom:8},
  searchInput:{borderRadius:theme.radius.base,backgroundColor:theme.colors.surface,borderWidth:1,borderColor:theme.colors.border,paddingHorizontal:14,height:44,fontSize:15,color:theme.colors.text},
  resultsCount:{paddingHorizontal:16,paddingTop:4,fontSize:13,color:theme.colors.textMuted},
  ghostSection:{padding:16},
  ghostLabel:{fontSize:13,fontWeight:'600',textTransform:'uppercase',letterSpacing:1.5,color:theme.colors.textMuted,marginBottom:12},
  empty:{alignItems:'center',paddingTop:48},
  emptyTitle:{fontFamily:'PlayfairDisplay_600SemiBold',fontSize:20,color:theme.colors.text,marginTop:12},
  emptyDesc:{fontSize:14,color:theme.colors.textMuted,textAlign:'center',lineHeight:20,marginTop:8},
  emptyScanBtn:{marginTop:20,backgroundColor:theme.colors.primary,paddingHorizontal:20,paddingVertical:12,borderRadius:theme.radius.base,...theme.shadow.button},
  emptyScanText:{color:'#FFF',fontWeight:'600',fontSize:16},
  popularGrid:{gap:4},
});
