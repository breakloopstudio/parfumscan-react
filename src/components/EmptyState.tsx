// src/components/EmptyState.tsx — État vide pour les 4 listes du profil

import { View, Text, StyleSheet, type ViewStyle } from 'react-native';
import Ionicons from '@react-native-vector-icons/ionicons/static';
import { theme } from '../theme/theme';
import Button from './Button';

type Variant = 'collection' | 'wishlist' | 'favoris' | 'historique';

const CONFIG: Record<Variant, { icon: string; title: string; desc: string; cta: string }> = {
  collection: {
    icon: 'flask-outline',
    title: 'Ta collection est vide',
    desc: 'Ajoute les parfums que tu possèdes pour constituer ton inventaire personnel.',
    cta: 'Explorer le catalogue',
  },
  wishlist: {
    icon: 'bookmark-outline',
    title: 'Ta liste d\'envies est vide',
    desc: 'Ajoute les parfums que tu aimerais t\'offrir ou te faire offrir. Active une alerte prix pour être prévenu quand le tarif baisse.',
    cta: 'Explorer le catalogue',
  },
  favoris: {
    icon: 'heart-outline',
    title: 'Ton nez n\'a pas encore de coup de cœur',
    desc: 'Parcourt le catalogue et garde tes parfums préférés à portée de main. Pas d\'obligation d\'achat, juste l\'émotion.',
    cta: 'Explorer le catalogue',
  },
  historique: {
    icon: 'scan-outline',
    title: 'Aucun scan pour l\'instant',
    desc: 'Photographie un flacon de parfum pour commencer ton historique. Chaque scan te rapproche du meilleur prix.',
    cta: 'Scanner un flacon',
  },
};

interface Props {
  variant: Variant;
  onAction: () => void;
  style?: ViewStyle;
}

export default function EmptyState({ variant, onAction, style }: Props) {
  const { icon, title, desc, cta } = CONFIG[variant];

  return (
    <View style={[s.container, style]}>
      <View style={s.iconCircle}>
        <Ionicons name={icon as never} size={32} color={theme.colors.primary} />
      </View>
      <Text style={s.title}>{title}</Text>
      <Text style={s.desc}>{desc}</Text>
      <Button variant="primary" onPress={onAction} style={s.cta}>
        {cta}
      </Button>
    </View>
  );
}

const s = StyleSheet.create({
  container: {
    alignItems: 'center',
    paddingTop: 40,
    paddingHorizontal: 24,
  },
  iconCircle: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: theme.colors.primarySoft,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
  },
  title: {
    fontFamily: 'PlayfairDisplay_700Bold',
    fontSize: 20,
    color: theme.colors.text,
    textAlign: 'center',
    marginBottom: 8,
  },
  desc: {
    fontFamily: 'Inter_400Regular',
    fontSize: 14,
    color: theme.colors.textMuted,
    textAlign: 'center',
    lineHeight: 21,
    marginBottom: 24,
    maxWidth: 300,
  },
  cta: {
    minWidth: 220,
  },
});
