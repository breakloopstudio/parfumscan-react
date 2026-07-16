// src/components/ErrorBoundary.tsx — Barrière d'erreur React

import React from 'react';
import { View, Text, Pressable } from 'react-native';
import Ionicons from "@react-native-vector-icons/ionicons/static";
import { lightTheme, type Theme } from '../theme/theme';

interface Props { children: React.ReactNode; }
interface State { hasError: boolean; error: Error | null; }

function getStyles(t: Theme) {
  return {
    container: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 32, backgroundColor: t.colors.background },
    title: { fontFamily: 'PlayfairDisplay_700Bold', fontSize: 24, color: t.colors.text, marginTop: 16 },
    desc: { fontSize: 15, color: t.colors.textMuted, textAlign: 'center', marginTop: 8, lineHeight: 22 },
    btn: { marginTop: 24, backgroundColor: t.colors.primary, paddingHorizontal: 24, paddingVertical: 12, borderRadius: t.radius.base, ...t.shadow.button },
    btnText: { color: '#FFF', fontFamily: 'Inter_600SemiBold', fontSize: 16 },
  } as const;
}

const s = getStyles(lightTheme);

export class ErrorBoundary extends React.Component<Props, State> {
  state: State = { hasError: false, error: null };

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, info: React.ErrorInfo) {
    console.error('[ErrorBoundary]', error, info.componentStack);
  }

  handleReset = () => this.setState({ hasError: false, error: null });

  render() {
    if (this.state.hasError) {
      return (
        <View style={s.container}>
          <Ionicons name="alert-circle-outline" size={64} color={lightTheme.colors.danger} />
          <Text style={s.title}>Oups !</Text>
          <Text style={s.desc}>Une erreur inattendue est survenue.{'\n'}Veuillez redémarrer l'application.</Text>
          <Pressable style={s.btn} onPress={this.handleReset}>
            <Text style={s.btnText}>Réessayer</Text>
          </Pressable>
        </View>
      );
    }
    return this.props.children;
  }
}