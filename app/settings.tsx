// app/settings.tsx — Page de paramètres

import { useState, useEffect, useMemo } from 'react';
import { View, Text, ScrollView, Switch, Pressable, Alert, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import Ionicons from '@react-native-vector-icons/ionicons/static';
import { useAuthContext } from '../src/contexts/AuthContext';
import { getUserSettings, updateUserSetting } from '../src/services/user-data';
import { requestFcmPermission, deleteFcmToken } from '../src/services/fcm';
import { useTheme, type Theme } from '../src/theme/ThemeContext';
import type { ThemeMode } from '../src/services/theme-storage';

export default function SettingsPage() {
  const { user, logout } = useAuthContext();
  const router = useRouter();
  const { theme, mode, setMode } = useTheme();
  const s = useMemo(() => getStyles(theme), [theme]);
  const [priceAlerts, setPriceAlerts] = useState(false);
  const [pushNotifs, setPushNotifs] = useState(true);

  const handleThemeChange = (m: ThemeMode) => {
    setMode(m);
  };

  useEffect(() => {
    if (user?.uid) {
      getUserSettings(user.uid).then(s => {
        setPriceAlerts(s.priceAlerts);
        setPushNotifs(s.pushNotifs);
      });
    }
  }, [user?.uid]);

  const handlePushNotifs = async (val: boolean) => {
    setPushNotifs(val);
    if (user?.uid) await updateUserSetting(user.uid, 'pushNotifs', val);
    if (val) {
      requestFcmPermission().catch(() => {});
    } else {
      deleteFcmToken().catch(() => {});
    }
  };

  const handlePriceAlerts = async (val: boolean) => {
    setPriceAlerts(val);
    if (user?.uid) await updateUserSetting(user.uid, 'priceAlerts', val);
  };

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
            <Switch value={priceAlerts} onValueChange={handlePriceAlerts} trackColor={{ false: theme.colors.border, true: theme.colors.primarySoft }} thumbColor={priceAlerts ? theme.colors.primary : theme.colors.textMuted} />
          </View>

          <View style={s.row}>
            <View style={s.rowLeft}>
              <Ionicons name="push-outline" size={20} color={theme.colors.text} />
              <View>
                <Text style={s.rowLabel}>Notifications push</Text>
                <Text style={s.rowDesc}>Autoriser les notifications sur cet appareil</Text>
              </View>
            </View>
            <Switch value={pushNotifs} onValueChange={handlePushNotifs} trackColor={{ false: theme.colors.border, true: theme.colors.primarySoft }} thumbColor={pushNotifs ? theme.colors.primary : theme.colors.textMuted} />
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
          <Text style={s.sectionTitle}>Apparence</Text>

          <View style={s.segmentedControl}>
            {(['light', 'system', 'dark'] as ThemeMode[]).map(m => {
              const active = mode === m;
              const icons: Record<ThemeMode, string> = { light: 'sunny', system: 'invert-mode', dark: 'moon' };
              const labels: Record<ThemeMode, string> = { light: 'Clair', system: 'Système', dark: 'Sombre' };
              return (
                <Pressable
                  key={m}
                  style={[s.segment, active && s.segmentActive]}
                  onPress={() => handleThemeChange(m)}
                >
                  <Ionicons name={icons[m] as never} size={16} color={active ? theme.colors.primary : theme.colors.textMuted} />
                  <Text style={[s.segmentLabel, active && s.segmentLabelActive]}>{labels[m]}</Text>
                </Pressable>
              );
            })}
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

function getStyles(t: Theme) {
  return {
    container: { flex: 1, backgroundColor: t.colors.background },
    scroll: { paddingBottom: 40 },
    header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, paddingVertical: 12, marginBottom: 8 },
    backBtn: { width: 32, height: 32, justifyContent: 'center', alignItems: 'center' },
    title: { fontFamily: 'PlayfairDisplay_700Bold', fontSize: 22, color: t.colors.text },
    section: { marginBottom: 24, paddingHorizontal: 16 },
    sectionTitle: { fontFamily: 'Inter_700Bold', fontSize: 11, textTransform: 'uppercase', letterSpacing: 1.5, color: t.colors.textMuted, marginBottom: 12 },
    row: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingVertical: 12, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: t.colors.border },
    rowLeft: { flexDirection: 'row', alignItems: 'center', gap: 12, flex: 1 },
    rowLabel: { fontFamily: 'Inter_500Medium', fontSize: 15, color: t.colors.text },
    rowDesc: { fontFamily: 'Inter_400Regular', fontSize: 12, color: t.colors.textMuted, marginTop: 2 },
    version: { textAlign: 'center', fontFamily: 'Inter_400Regular', fontSize: 12, color: t.colors.textMuted, marginTop: 16 },
    segmentedControl: { flexDirection: 'row', backgroundColor: t.colors.surface2, borderRadius: t.radius.base, padding: 4 },
    segment: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, paddingVertical: 10, borderRadius: t.radius.sm },
    segmentActive: { backgroundColor: t.colors.primarySoft },
    segmentLabel: { fontFamily: 'Inter_500Medium', fontSize: 13, color: t.colors.textMuted },
    segmentLabelActive: { color: t.colors.primary, fontFamily: 'Inter_700Bold' },
  } as const;
}
