// app/settings.tsx — Page de paramètres

import { useState } from 'react';
import { View, Text, ScrollView, Switch, Pressable, Alert, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import Ionicons from '@react-native-vector-icons/ionicons/static';
import { useAuthContext } from '../src/contexts/AuthContext';
import { theme } from '../src/theme/theme';

export default function SettingsPage() {
  const { logout } = useAuthContext();
  const router = useRouter();
  const [priceAlerts, setPriceAlerts] = useState(false);
  const [pushNotifs, setPushNotifs] = useState(true);

  return (
    <SafeAreaView edges={['top', 'bottom']} style={s.container}>
      <ScrollView contentContainerStyle={s.scroll}>
        <View style={s.header}>
          <Pressable onPress={() => router.back()} hitSlop={12} style={s.backBtn}>
            <Ionicons name="arrow-back" size={22} color={theme.colors.text} />
          </Pressable>
          <Text style={s.title}>Paramètres</Text>
          <View style={{ width: 32 }} />
        </View>

        <View style={s.section}>
          <Text style={s.sectionTitle}>Notifications</Text>

          <View style={s.row}>
            <View style={s.rowLeft}>
              <Ionicons name="notifications-outline" size={20} color={theme.colors.text} />
              <View>
                <Text style={s.rowLabel}>Alertes prix</Text>
                <Text style={s.rowDesc}>Recevoir une notification quand un parfum de ta wishlist baisse de prix</Text>
              </View>
            </View>
            <Switch value={priceAlerts} onValueChange={setPriceAlerts} trackColor={{ false: theme.colors.border, true: theme.colors.primarySoft }} thumbColor={priceAlerts ? theme.colors.primary : theme.colors.textMuted} />
          </View>

          <View style={s.row}>
            <View style={s.rowLeft}>
              <Ionicons name="push-outline" size={20} color={theme.colors.text} />
              <View>
                <Text style={s.rowLabel}>Notifications push</Text>
                <Text style={s.rowDesc}>Autoriser les notifications sur cet appareil</Text>
              </View>
            </View>
            <Switch value={pushNotifs} onValueChange={setPushNotifs} trackColor={{ false: theme.colors.border, true: theme.colors.primarySoft }} thumbColor={pushNotifs ? theme.colors.primary : theme.colors.textMuted} />
          </View>
        </View>

        <View style={s.section}>
          <Text style={s.sectionTitle}>Prix</Text>

          <View style={s.row}>
            <View style={s.rowLeft}>
              <Ionicons name="cash-outline" size={20} color={theme.colors.text} />
              <View>
                <Text style={s.rowLabel}>Devise</Text>
                <Text style={s.rowDesc}>EUR — Euro (multi-devise en V2)</Text>
              </View>
            </View>
            <Ionicons name="chevron-forward" size={16} color={theme.colors.textMuted} />
          </View>
        </View>

        <View style={s.section}>
          <Text style={s.sectionTitle}>Compte</Text>

          <Pressable style={s.row} onPress={() => { logout(); router.replace('/auth/login'); }}>
            <View style={s.rowLeft}>
              <Ionicons name="log-out-outline" size={20} color={theme.colors.overpriced} />
              <Text style={[s.rowLabel, { color: theme.colors.overpriced }]}>Déconnexion</Text>
            </View>
          </Pressable>

          <Pressable style={s.row} onPress={() => Alert.alert('Supprimer le compte', 'Cette action est irréversible. Toutes tes données seront effacées.', [{ text: 'Annuler', style: 'cancel' }, { text: 'Supprimer', style: 'destructive' }])}>
            <View style={s.rowLeft}>
              <Ionicons name="trash-outline" size={20} color={theme.colors.overpriced} />
              <Text style={[s.rowLabel, { color: theme.colors.overpriced }]}>Supprimer le compte</Text>
            </View>
          </Pressable>
        </View>

        <View style={s.section}>
          <Text style={s.sectionTitle}>Légal</Text>

          <Pressable style={s.row} onPress={() => {}}>
            <View style={s.rowLeft}>
              <Ionicons name="document-text-outline" size={20} color={theme.colors.text} />
              <Text style={s.rowLabel}>Mentions légales</Text>
            </View>
            <Ionicons name="chevron-forward" size={16} color={theme.colors.textMuted} />
          </Pressable>

          <Pressable style={s.row} onPress={() => {}}>
            <View style={s.rowLeft}>
              <Ionicons name="shield-outline" size={20} color={theme.colors.text} />
              <Text style={s.rowLabel}>Politique de confidentialité</Text>
            </View>
            <Ionicons name="chevron-forward" size={16} color={theme.colors.textMuted} />
          </Pressable>
        </View>

        <Text style={s.version}>ParfumScan v1.0.0</Text>
      </ScrollView>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: theme.colors.background },
  scroll: { paddingBottom: 40 },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, paddingVertical: 12, marginBottom: 8 },
  backBtn: { width: 32, height: 32, justifyContent: 'center', alignItems: 'center' },
  title: { fontFamily: 'PlayfairDisplay_700Bold', fontSize: 22, color: theme.colors.text },
  section: { marginBottom: 24, paddingHorizontal: 16 },
  sectionTitle: { fontFamily: 'Inter_700Bold', fontSize: 11, textTransform: 'uppercase', letterSpacing: 1.5, color: theme.colors.textMuted, marginBottom: 12 },
  row: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingVertical: 12, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: theme.colors.border },
  rowLeft: { flexDirection: 'row', alignItems: 'center', gap: 12, flex: 1 },
  rowLabel: { fontFamily: 'Inter_500Medium', fontSize: 15, color: theme.colors.text },
  rowDesc: { fontFamily: 'Inter_400Regular', fontSize: 12, color: theme.colors.textMuted, marginTop: 2 },
  version: { textAlign: 'center', fontFamily: 'Inter_400Regular', fontSize: 12, color: theme.colors.textMuted, marginTop: 16 },
});
