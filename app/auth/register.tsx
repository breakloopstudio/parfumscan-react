// app/auth/register.tsx — Inscription (email + Google)

import { useState, useMemo } from 'react';
import {
  View, Text, TextInput, Pressable, ActivityIndicator,
  KeyboardAvoidingView, Platform, ScrollView,
} from 'react-native';
import { Link, useRouter } from 'expo-router';
import Ionicons from '@react-native-vector-icons/ionicons/static';
import { useAuthContext } from '../../src/contexts/AuthContext';
import { useTheme, type Theme } from '../../src/theme/ThemeContext';

export default function RegisterPage() {
  const { theme } = useTheme();
  const s = useMemo(() => getStyles(theme), [theme]);
  const { register, loginWithGoogle } = useAuthContext();
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState<'email' | 'google' | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const canSubmit = email.trim().length > 0 && password.length >= 6;

  const handleEmailRegister = async () => {
    if (!canSubmit) return;
    setLoading('email'); setErrorMessage(null);
    try { await register(email.trim(), password); router.replace('/(tabs)'); }
    catch (e: unknown) { setErrorMessage(e instanceof Error ? e.message : "Erreur lors de l'inscription."); }
    finally { setLoading(null); }
  };

  const handleGoogle = async () => {
    setLoading('google'); setErrorMessage(null);
    try { await loginWithGoogle(); router.replace('/(tabs)'); }
    catch (e: unknown) { setErrorMessage(e instanceof Error ? e.message : 'Erreur connexion Google.'); }
    finally { setLoading(null); }
  };

  const isLoading = loading !== null;

  return (
    <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={s.bg}>
      <ScrollView contentContainerStyle={s.scroll} keyboardShouldPersistTaps="handled">
        <View style={s.form}>
          <View style={s.iconCircle}>
            <Ionicons name="person-add-outline" size={36} color={theme.colors.primary} />
          </View>
          <View style={s.header}>
            <Text style={s.title}>Créer un compte</Text>
            <Text style={s.subtitle}>Rejoignez la communauté ParfumScan</Text>
          </View>

          <Pressable style={[s.googleBtn, isLoading && s.submitBtnDisabled]} onPress={handleGoogle} disabled={isLoading}>
            {loading === 'google' ? (
              <ActivityIndicator size="small" color={theme.colors.text} style={{ marginRight: 8 }} />
            ) : (
              <Ionicons name="logo-google" size={20} color={theme.colors.text} style={{ marginRight: 8 }} />
            )}
            <Text style={s.googleText}>S'inscrire avec Google</Text>
          </Pressable>

          <View style={s.divider}>
            <View style={s.dividerLine} />
            <Text style={s.dividerText}>ou par email</Text>
            <View style={s.dividerLine} />
          </View>

          <View style={s.inputGroup}>
            <TextInput
              style={s.input}
              placeholder="votre@email.com"
              placeholderTextColor={theme.colors.textMuted}
              value={email}
              onChangeText={setEmail}
              keyboardType="email-address"
              autoCapitalize="none"
              autoComplete="email"
            />
          </View>
          <View style={s.inputGroup}>
            <TextInput
              style={s.input}
              placeholder="6 caractères minimum"
              placeholderTextColor={theme.colors.textMuted}
              value={password}
              onChangeText={setPassword}
              secureTextEntry
              autoComplete="new-password"
            />
          </View>

          {errorMessage && (
            <View style={s.errorBox}>
              <Text style={s.errorText}>{errorMessage}</Text>
            </View>
          )}

          <Pressable
            style={[s.submitBtn, (!canSubmit || isLoading) && s.submitBtnDisabled]}
            onPress={handleEmailRegister}
            disabled={!canSubmit || isLoading}
          >
            {loading === 'email' ? (
              <ActivityIndicator size="small" color="#FFFFFF" />
            ) : (
              <Text style={s.submitText}>Créer mon compte</Text>
            )}
          </Pressable>

          <Link href="/auth/login" style={s.link}>
            <Text style={s.linkText}>
              Déjà un compte ? <Text style={s.linkBold}>Se connecter</Text>
            </Text>
          </Link>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

function getStyles(t: Theme) {
  return {
    bg: { flex: 1, backgroundColor: t.colors.background },
    scroll: { flexGrow: 1, justifyContent: 'center', paddingHorizontal: 24 },
    form: { maxWidth: 400, alignSelf: 'center', width: '100%', paddingVertical: 24, paddingHorizontal: 4 },
    iconCircle: { width: 72, height: 72, borderRadius: 36, backgroundColor: t.colors.primarySoft, justifyContent: 'center', alignItems: 'center', alignSelf: 'center', marginBottom: 12 },
    header: { alignItems: 'center', marginBottom: 28 },
    title: { fontFamily: 'PlayfairDisplay_700Bold', fontSize: 32, color: t.colors.text, letterSpacing: -0.5 },
    subtitle: { fontFamily: 'Inter_400Regular', fontSize: 15, color: t.colors.textMuted, marginTop: 4 },
    googleBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: t.colors.border, borderRadius: t.radius.base, height: 48, marginBottom: 20 },
    googleText: { fontFamily: 'Inter_500Medium', fontSize: 15, color: t.colors.text },
    divider: { flexDirection: 'row', alignItems: 'center', marginBottom: 20 },
    dividerLine: { flex: 1, height: 1, backgroundColor: t.colors.border },
    dividerText: { paddingHorizontal: 16, fontFamily: 'Inter_400Regular', fontSize: 13, color: t.colors.textMuted },
    inputGroup: { marginBottom: 12 },
    input: { borderRadius: t.radius.base, backgroundColor: t.colors.surface, borderWidth: 1, borderColor: t.colors.border, paddingHorizontal: 12, height: 48, fontFamily: 'Inter_400Regular', fontSize: 15, color: t.colors.text },
    errorBox: { backgroundColor: t.colors.overpricedSoft, borderRadius: 10, padding: 10, marginTop: -4, marginBottom: 8 },
    errorText: { fontFamily: 'Inter_400Regular', fontSize: 13, color: t.colors.overpriced },
    submitBtn: { backgroundColor: t.colors.primary, borderRadius: t.radius.base, height: 48, justifyContent: 'center', alignItems: 'center', marginTop: 12, ...t.shadow.button },
    submitBtnDisabled: { opacity: 0.5 },
    submitText: { color: '#FFFFFF', fontFamily: 'Inter_600SemiBold', fontSize: 16, letterSpacing: 0.3 },
    link: { alignSelf: 'center', marginTop: 24 },
    linkText: { fontFamily: 'Inter_400Regular', fontSize: 14, color: t.colors.textMuted },
    linkBold: { fontFamily: 'Inter_600SemiBold', color: t.colors.primary },
  } as const;
}