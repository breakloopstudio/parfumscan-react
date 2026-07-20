// src/features/catalog/HeroPriceOverlay.tsx — Hero image + overlay prix flottant (v3 prix-first)

import { useEffect, useMemo } from 'react';
import { View, Text, Pressable } from 'react-native';
import { Image } from 'expo-image';
import Animated, { useSharedValue, useAnimatedStyle, withSpring } from 'react-native-reanimated';
import Ionicons from '@react-native-vector-icons/ionicons/static';
import { useTheme, type Theme } from '../../theme/ThemeContext';

const PALETTE = ['#5B21B6', '#1E40AF', '#065F46', '#92400E', '#991B1B', '#9D174D', '#3730A3', '#854D0E'];

function brandColor(brand: string): string {
  let hash = 0;
  for (let i = 0; i < brand.length; i++) hash = brand.charCodeAt(i) + ((hash << 5) - hash);
  return PALETTE[Math.abs(hash) % PALETTE.length];
}

interface Props {
  imageUrl: string | null;
  brand: string;
  bestPrice: number | undefined;
  referencePrice: number | undefined;
  purchaseUrl: string | null | undefined;
  imgFailed: boolean;
  onImageError: () => void;
  onPurchasePress: () => void;
  onImagePress: () => void;
}

export default function HeroPriceOverlay({
  imageUrl, brand, bestPrice, referencePrice, purchaseUrl,
  imgFailed, onImageError, onPurchasePress, onImagePress,
}: Props) {
  const { theme } = useTheme();
  const s = useMemo(() => getStyles(theme), [theme]);

  const discountPct =
    referencePrice && bestPrice && referencePrice > 0 && bestPrice < referencePrice
      ? Math.round((1 - bestPrice / referencePrice) * 100)
      : null;

  const priceOpacity = useSharedValue(bestPrice ? 1 : 0.6);
  useEffect(() => {
    priceOpacity.value = withSpring(bestPrice ? 1 : 0.6, { stiffness: 200, damping: 12 });
  }, [bestPrice]);

  const overlayStyle = useAnimatedStyle(() => ({ opacity: priceOpacity.value }));

  const hasImage = imageUrl && !imgFailed;

  return (
    <View style={s.container}>
      {hasImage ? (
        <Pressable onPress={onImagePress}>
          <Image
            source={{ uri: imageUrl }}
            style={s.image}
            contentFit="contain"
            transition={300}
            onError={onImageError}
          />
        </Pressable>
      ) : (
        <View style={[s.placeholder, { backgroundColor: brandColor(brand) }]}>
          <Text style={s.placeholderText}>
            {brand.charAt(0).toUpperCase()}
          </Text>
        </View>
      )}

      <Animated.View style={[s.overlay, overlayStyle]}>
        {bestPrice !== undefined && bestPrice > 0 ? (
          <>
            <View style={s.priceRow}>
              <Text style={s.price}>{bestPrice.toFixed(2)} €</Text>
              {discountPct !== null && discountPct > 0 && discountPct <= 95 && (
                <View style={[s.discountBadge, { backgroundColor: theme.colors.deal }]}>
                  <Text style={s.discountText}>-{discountPct}%</Text>
                </View>
              )}
            </View>

            {referencePrice && referencePrice > 0 && referencePrice > bestPrice && (
              <Text style={s.refPrice}>{referencePrice.toFixed(2)} €</Text>
            )}

            {purchaseUrl ? (
              <Pressable onPress={onPurchasePress} style={s.ctaRow} hitSlop={6}>
                <Text style={s.ctaText}>Voir l'offre</Text>
                <Ionicons name="chevron-forward" size={14} color={theme.colors.primary} />
              </Pressable>
            ) : null}
          </>
        ) : (
          <Text style={s.placeholderLabel}>Prix non disponible</Text>
        )}
      </Animated.View>
    </View>
  );
}

function getStyles(t: Theme) {
  return {
    container: { position: 'relative' as const, width: '100%', height: 320, backgroundColor: t.colors.surface },
    image: { width: '100%', height: 320, backgroundColor: t.colors.surface },
    placeholder: { width: '100%', height: 320, justifyContent: 'center' as const, alignItems: 'center' as const },
    placeholderText: { fontSize: 72, fontFamily: 'Inter_700Bold', color: '#FFFFFF', opacity: 0.5 },

    overlay: {
      position: 'absolute' as const,
      bottom: 16,
      left: 16,
      backgroundColor: t.colors.surface,
      borderRadius: t.radius.card,
      paddingHorizontal: 16,
      paddingVertical: 14,
      minWidth: 140,
      ...t.shadow.elevated,
    },
    priceRow: { flexDirection: 'row' as const, alignItems: 'baseline' as const, gap: 8 },
    price: {
      fontFamily: 'Inter_800ExtraBold',
      fontSize: 28,
      color: t.colors.text,
    },
    discountBadge: {
      paddingHorizontal: 8,
      paddingVertical: 3,
      borderRadius: 10,
    },
    discountText: {
      fontSize: 13,
      fontFamily: 'Inter_700Bold',
      color: '#FFFFFF',
    },
    refPrice: {
      fontSize: 14,
      color: t.colors.textMuted,
      textDecorationLine: 'line-through' as const,
      marginTop: 2,
    },
    ctaRow: {
      flexDirection: 'row' as const,
      alignItems: 'center' as const,
      gap: 2,
      marginTop: 8,
    },
    ctaText: {
      fontSize: 13,
      fontFamily: 'Inter_700Bold',
      color: t.colors.primary,
    },
    placeholderLabel: {
      fontSize: 14,
      fontFamily: 'Inter_400Regular',
      color: t.colors.textMuted,
    },
  } as const;
}
