// app/legal.tsx — Mentions légales
import { useMemo } from 'react';
import { View, Text, ScrollView, Pressable } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import Ionicons from '@react-native-vector-icons/ionicons/static';
import { useTheme, type Theme } from '../src/theme/ThemeContext';

export default function LegalPage() {
  const { theme } = useTheme();
  const s = useMemo(() => getStyles(theme), [theme]);
  const router = useRouter();

  return (
    <SafeAreaView edges={['top', 'bottom']} style={s.container}>
      <ScrollView contentContainerStyle={s.scroll}>
        <View style={s.header}>
          <Pressable onPress={() => router.back()} hitSlop={12} style={s.backBtn}>
            <Ionicons name="arrow-back" size={22} color={theme.colors.text} />
          </Pressable>
          <Text style={s.title}>Mentions légales</Text>
          <View style={{ width: 32 }} />
        </View>

        <View style={s.section}>
          <Text style={s.sectionTitle}>Éditeur de l'application</Text>
          <Text style={s.body}>
            L'application ParfumScan est éditée par la société Breakloop Studio.{'\n\n'}
            [Adresse postale]{'\n'}
            France{'\n\n'}
            Email : [email@exemple.com]{'\n'}
            Téléphone : [facultatif]
          </Text>
        </View>

        <View style={s.section}>
          <Text style={s.sectionTitle}>Directeur de la publication</Text>
          <Text style={s.body}>
            Pierre-Louis [NOM], représentant légal de Breakloop Studio
          </Text>
        </View>

        <View style={s.section}>
          <Text style={s.sectionTitle}>Hébergement</Text>
          <Text style={s.body}>
            L'application est hébergée par :{'\n\n'}
            Google Cloud Platform{'\n'}
            Google LLC{'\n'}
            1600 Amphitheatre Parkway{'\n'}
            Mountain View, CA 94043{'\n'}
            États-Unis{'\n\n'}
            Les données sont stockées dans la région europe-west1 (Belgique).
          </Text>
        </View>

        <View style={s.section}>
          <Text style={s.sectionTitle}>Propriété intellectuelle</Text>
          <Text style={s.body}>
            L'ensemble du code source, du design, des textes et des éléments graphiques de l'application ParfumScan est la propriété exclusive de l'éditeur, sauf mention contraire.{'\n\n'}
            Toute reproduction, représentation, modification ou adaptation, partielle ou totale, est interdite sans autorisation préalable.{'\n\n'}
            La base de données de parfums est issue du service Fragella et reste la propriété de ses auteurs respectifs.
          </Text>
        </View>

        <View style={s.section}>
          <Text style={s.sectionTitle}>Contact</Text>
          <Text style={s.body}>
            Pour toute question relative à l'application, vous pouvez contacter l'éditeur à l'adresse email indiquée ci-dessus.
          </Text>
        </View>

        <Text style={s.version}>Dernière mise à jour : juillet 2026</Text>
      </ScrollView>
    </SafeAreaView>
  );
}

function getStyles(t: Theme) {
  return {
    container: { flex: 1, backgroundColor: t.colors.background },
    scroll: { paddingBottom: 60 },
    header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, paddingVertical: 12, marginBottom: 8 },
    backBtn: { width: 32, height: 32, justifyContent: 'center', alignItems: 'center' },
    title: { fontFamily: 'PlayfairDisplay_700Bold', fontSize: 22, color: t.colors.text },
    section: { marginBottom: 24, paddingHorizontal: 16 },
    sectionTitle: { fontFamily: 'PlayfairDisplay_600SemiBold', fontSize: 18, color: t.colors.text, marginBottom: 10 },
    body: { fontFamily: 'Inter_400Regular', fontSize: 14, color: t.colors.text, lineHeight: 22 },
    version: { textAlign: 'center', fontFamily: 'Inter_400Regular', fontSize: 12, color: t.colors.textMuted, marginTop: 16 },
  } as const;
}
