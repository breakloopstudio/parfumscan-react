// app/auth/login.tsx — Connexion (email + Google)

import { useState } from 'react';
import {
  View, Text, TextInput, Pressable, ActivityIndicator,
  KeyboardAvoidingView, Platform, ScrollView, StyleSheet,
} from 'react-native';
import { Link, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useAuthContext } from '../../src/contexts/AuthContext';
import { theme } from '../../src/theme/theme';

export default function LoginPage() {
  const { login, loginWithGoogle } = useAuthContext();
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState<'email' | 'google' | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const canSubmit = email.trim().length > 0 && password.length > 0;

  const handleEmailLogin = async () => {
    if (!canSubmit) return;
    setLoading('email'); setErrorMessage(null);
    try { await login(email.trim(), password); router.replace('/(tabs)'); }
    catch (e: unknown) { setErrorMessage(e instanceof Error ? e.message : 'Erreur de connexion.'); }
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
          <Text style={s.logo}>✨</Text>
          <View style={s.header}>
            <Text style={s.title}>ParfumScan</Text>
            <Text style={s.subtitle}>Découvrez l'univers des parfums</Text>
          </View>

          <Pressable style={[s.googleBtn, isLoading && s.submitBtnDisabled]} onPress={handleGoogle} disabled={isLoading}>
            {loading === 'google' ? (
              <ActivityIndicator size="small" color="#1F1A2E" style={{ marginRight: 8 }} />
            ) : (
              <Ionicons name="logo-google" size={20} color="#1F1A2E" style={{ marginRight: 8 }} />
            )}
            <Text style={s.googleText}>Continuer avec Google</Text>
          </Pressable>

          <View style={s.divider}>
            <View style={s.dividerLine} /><Text style={s.dividerText}>ou par email</Text><View style={s.dividerLine} />
          </View>

          <View style={s.inputGroup}>
            <TextInput style={s.input} placeholder="votre@email.com" placeholderTextColor={theme.colors.medium}
              value={email} onChangeText={setEmail} keyboardType="email-address" autoCapitalize="none" autoComplete="email" />
          </View>
          <View style={s.inputGroup}>
            <TextInput style={s.input} placeholder="••••••" placeholderTextColor={theme.colors.medium}
              value={password} onChangeText={setPassword} secureTextEntry autoComplete="current-password" />
          </View>

          {errorMessage && <View style={s.errorBox}><Text style={s.errorText}>{errorMessage}</Text></View>}

          <Pressable style={[s.submitBtn, (!canSubmit || isLoading) && s.submitBtnDisabled]}
            onPress={handleEmailLogin} disabled={!canSubmit || isLoading}>
            {loading === 'email' ? <ActivityIndicator size="small" color="#FFFFFF" /> : <Text style={s.submitText}>Se connecter</Text>}
          </Pressable>

          <Link href="/auth/register" style={s.link}>
            <Text style={s.linkText}>Pas encore de compte ? <Text style={s.linkBold}>S'inscrire</Text></Text>
          </Link>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const s = StyleSheet.create({
  bg: { flex: 1, backgroundColor: theme.colors.background },
  scroll: { flexGrow: 1, justifyContent: 'center', paddingHorizontal: 24 },
  form: { maxWidth: 400, alignSelf: 'center', width: '100%', paddingVertical: 24, paddingHorizontal: 4 },
  logo: { fontSize: 48, textAlign: 'center', marginBottom: 4 },
  header: { alignItems: 'center', marginBottom: 28 },
  title: { fontFamily: 'PlayfairDisplay_700Bold', fontSize: 32, color: theme.colors.text, letterSpacing: -0.5 },
  subtitle: { color: theme.colors.medium, fontSize: 15, marginTop: 4 },
  googleBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: theme.colors.border, borderRadius: theme.radius.base, height: 48, marginBottom: 20 },
  googleText: { fontWeight: '500', fontSize: 15, color: theme.colors.text },
  divider: { flexDirection: 'row', alignItems: 'center', marginBottom: 20 },
  dividerLine: { flex: 1, height: 1, backgroundColor: theme.colors.border },
  dividerText: { paddingHorizontal: 16, fontSize: 13, color: theme.colors.medium },
  inputGroup: { marginBottom: 12 },
  input: { borderRadius: theme.radius.base, backgroundColor: theme.colors.surface, borderWidth: 1, borderColor: theme.colors.border, paddingHorizontal: 12, height: 48, fontSize: 15, color: theme.colors.text },
  errorBox: { backgroundColor: '#FEF2F2', borderRadius: 10, padding: 10, marginTop: -4, marginBottom: 8 },
  errorText: { color: theme.colors.danger, fontSize: 13 },
  submitBtn: { backgroundColor: theme.colors.primary, borderRadius: theme.radius.base, height: 48, justifyContent: 'center', alignItems: 'center', marginTop: 12, ...theme.shadow.button },
  submitBtnDisabled: { opacity: 0.5 },
  submitText: { color: '#FFFFFF', fontWeight: '600', fontSize: 16, letterSpacing: 0.3 },
  link: { alignSelf: 'center', marginTop: 24 },
  linkText: { color: theme.colors.medium, fontSize: 14 },
  linkBold: { color: theme.colors.primary, fontWeight: '600' },
});
