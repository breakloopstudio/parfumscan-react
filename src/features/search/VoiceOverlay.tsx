import { useEffect, useMemo, useRef } from 'react';
import {
  View,
  Text,
  Pressable,
  FlatList,
  ActivityIndicator,
  LayoutAnimation,
  type LayoutAnimationConfig,
} from 'react-native';
import Ionicons from '@react-native-vector-icons/ionicons/static';
import { useTheme, type Theme } from '../../theme/ThemeContext';
import ParfumCard from '../../components/ParfumCard';
import type { Parfum } from '../../models';

export interface VoiceOverlayPhase {
  type: 'listening';
  transcript: string;
}

export interface VoiceOverlayPhaseSearching {
  type: 'searching';
}

export interface VoiceOverlayPhaseError {
  type: 'error';
  message: string;
}

export interface VoiceOverlayPhaseResults {
  type: 'results';
  results: Parfum[];
}

export interface VoiceOverlayPhaseEmpty {
  type: 'empty';
}

export type VoicePhase =
  | VoiceOverlayPhase
  | VoiceOverlayPhaseSearching
  | VoiceOverlayPhaseError
  | VoiceOverlayPhaseResults
  | VoiceOverlayPhaseEmpty;

interface Props {
  visible: boolean;
  phase: VoicePhase;
  onResultPress: (id: string) => void;
  onViewAll: () => void;
  onCancel: () => void;
  onRetry: () => void;
}

const ANIM_CONFIG: LayoutAnimationConfig = {
  duration: 220,
  create: { type: 'easeInEaseOut', property: 'opacity' },
  update: { type: 'easeInEaseOut' },
  delete: { type: 'easeInEaseOut', property: 'opacity' },
};

export default function VoiceOverlay({
  visible,
  phase,
  onResultPress,
  onViewAll,
  onCancel,
  onRetry,
}: Props) {
  const { theme } = useTheme();
  const s = useMemo(() => getStyles(theme), [theme]);
  const prevVisible = useRef(false);

  useEffect(() => {
    if (visible !== prevVisible.current) {
      LayoutAnimation.configureNext(ANIM_CONFIG);
      prevVisible.current = visible;
    }
  }, [visible]);

  useEffect(() => {
    if (visible) {
      LayoutAnimation.configureNext(ANIM_CONFIG);
    }
  }, [phase.type, visible]);

  if (!visible) return null;

  return (
    <View style={s.root}>
      <Pressable style={s.backdrop} onPress={onCancel} />
      <View style={s.panel}>
        {phase.type === 'listening' && (
          <View style={s.listeningRow}>
            <Ionicons name="mic" size={20} color={theme.colors.primary} />
            <View style={s.listeningContent}>
              <Text style={s.listeningLabel}>À l'écoute...</Text>
              <Text style={s.transcriptText} numberOfLines={3}>
                {phase.transcript || 'Parlez maintenant...'}
              </Text>
            </View>
          </View>
        )}

        {phase.type === 'searching' && (
          <View style={s.centered}>
            <ActivityIndicator size="small" color={theme.colors.primary} />
            <Text style={s.statusText}>Recherche...</Text>
          </View>
        )}

        {phase.type === 'error' && (
          <View style={s.centered}>
            <Ionicons name="alert-circle-outline" size={24} color={theme.colors.danger} />
            <Text style={s.errorText}>{phase.message}</Text>
            <Pressable style={s.retryBtn} onPress={onRetry} hitSlop={8}>
              <Text style={s.retryText}>Réessayer</Text>
            </Pressable>
          </View>
        )}

        {phase.type === 'empty' && (
          <View style={s.centered}>
            <Ionicons name="search-outline" size={24} color={theme.colors.textMuted} />
            <Text style={s.emptyTitle}>Aucun résultat</Text>
            <Text style={s.emptyDesc}>Essaie une autre formulation.</Text>
            <Pressable style={s.retryBtn} onPress={onRetry} hitSlop={8}>
              <Text style={s.retryText}>Réessayer</Text>
            </Pressable>
          </View>
        )}

        {phase.type === 'results' && (
          <View style={s.resultsWrap}>
            <FlatList
              data={phase.results.slice(0, 5)}
              keyExtractor={(p) => p.id}
              renderItem={({ item }) => (
                  <ParfumCard
                    parfum={item}
                    mode="compact"
                    onPressOverride={() => onResultPress(item.id)}
                  />
                )}
              ItemSeparatorComponent={() => <View style={s.resultSeparator} />}
              scrollEnabled={phase.results.length > 3}
            />
            {phase.results.length > 0 && (
              <Pressable style={s.viewAllRow} onPress={onViewAll}>
                <Text style={s.viewAllText}>Voir tous les résultats</Text>
                <Ionicons name="arrow-forward" size={14} color={theme.colors.primary} />
              </Pressable>
            )}
          </View>
        )}
      </View>
    </View>
  );
}

function getStyles(t: Theme) {
  return {
    root: {
      position: 'absolute' as const,
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      zIndex: 100,
    },
    backdrop: {
      backgroundColor: 'rgba(0,0,0,0.4)',
      flex: 1,
    },
    panel: {
      backgroundColor: t.colors.surface,
      borderBottomLeftRadius: t.radius.card,
      borderBottomRightRadius: t.radius.card,
      ...t.shadow.elevated,
      maxHeight: '50%' as const,
      overflow: 'hidden' as const,
    },
    listeningRow: {
      flexDirection: 'row',
      alignItems: 'flex-start',
      gap: t.spacing.base,
      paddingHorizontal: t.spacing.md,
      paddingVertical: t.spacing.md,
    },
    listeningContent: {
      flex: 1,
    },
    listeningLabel: {
      fontFamily: 'Inter_500Medium',
      fontSize: 12,
      color: t.colors.primary,
      textTransform: 'uppercase' as const,
      letterSpacing: 1,
      marginBottom: 4,
    },
    transcriptText: {
      fontFamily: 'Inter_400Regular',
      fontSize: 16,
      color: t.colors.text,
      lineHeight: 22,
    },
    centered: {
      alignItems: 'center' as const,
      paddingVertical: t.spacing.xl,
      paddingHorizontal: t.spacing.md,
      gap: t.spacing.sm,
    },
    statusText: {
      fontFamily: 'Inter_400Regular',
      fontSize: 14,
      color: t.colors.textMuted,
    },
    errorText: {
      fontFamily: 'Inter_400Regular',
      fontSize: 14,
      color: t.colors.danger,
      textAlign: 'center' as const,
    },
    retryBtn: {
      marginTop: t.spacing.sm,
      paddingHorizontal: t.spacing.md,
      paddingVertical: t.spacing.sm,
      borderRadius: t.radius.base,
      backgroundColor: t.colors.primarySoft,
    },
    retryText: {
      fontFamily: 'Inter_600SemiBold',
      fontSize: 14,
      color: t.colors.primary,
    },
    emptyTitle: {
      fontFamily: 'PlayfairDisplay_600SemiBold',
      fontSize: 16,
      color: t.colors.text,
    },
    emptyDesc: {
      fontFamily: 'Inter_400Regular',
      fontSize: 13,
      color: t.colors.textMuted,
    },
    resultsWrap: {
      paddingTop: t.spacing.sm,
    },
    resultItem: {
      paddingHorizontal: t.spacing.md,
      paddingVertical: t.spacing.xs,
    },
    resultSeparator: {
      height: 1,
      backgroundColor: t.colors.border,
      marginHorizontal: t.spacing.md,
    },
    viewAllRow: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      gap: 6,
      paddingVertical: t.spacing.base,
      borderTopWidth: 1,
      borderTopColor: t.colors.border,
    },
    viewAllText: {
      fontFamily: 'Inter_600SemiBold',
      fontSize: 14,
      color: t.colors.primary,
    },
  } as const;
}
