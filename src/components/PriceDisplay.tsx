// src/components/PriceDisplay.tsx — Prix animé avec badge d'économie contextuel

import { useEffect } from 'react';
import { View, Text, StyleSheet, type ViewStyle } from 'react-native';
import Animated, { useSharedValue, useAnimatedStyle, withSpring } from 'react-native-reanimated';
import { theme } from '../theme/theme';

type PriceValue = 'deal' | 'fair' | 'overpriced' | 'unknown';

function priceValueFromBestAndRef(bestPrice: number, referencePrice?: number): PriceValue {
  if (!referencePrice || referencePrice <= 0) return 'unknown';
  const ratio = bestPrice / referencePrice;
  if (ratio < 0.8) return 'deal';
  if (ratio < 1.05) return 'fair';
  return 'overpriced';
}

function priceColor(v: PriceValue): string {
  if (v === 'deal') return theme.colors.deal;
  if (v === 'overpriced') return theme.colors.overpriced;
  if (v === 'fair') return theme.colors.fair;
  return theme.colors.text;
}

function priceBg(v: PriceValue): string {
  if (v === 'deal') return theme.colors.dealSoft;
  if (v === 'overpriced') return theme.colors.overpricedSoft;
  if (v === 'fair') return theme.colors.fairSoft;
  return theme.colors.surface2;
}

function valueLabel(v: PriceValue): string | null {
  if (v === 'deal') return 'Bonne affaire';
  if (v === 'overpriced') return 'Trop cher';
  if (v === 'fair') return 'Prix correct';
  return null;
}

interface Props {
  bestPrice: number;
  referencePrice?: number;
  priceValue?: PriceValue;
  large?: boolean;
  animated?: boolean;
  style?: ViewStyle;
}

export default function PriceDisplay({
  bestPrice,
  referencePrice,
  priceValue,
  large = false,
  animated = true,
  style,
}: Props) {
  const val = priceValue ?? priceValueFromBestAndRef(bestPrice, referencePrice);
  const color = priceColor(val);
  const bg = priceBg(val);
  const pct = referencePrice && referencePrice > 0
    ? Math.round((1 - bestPrice / referencePrice) * 100)
    : null;

  const scale = useSharedValue(animated ? 0.5 : 1);
  const opacity = useSharedValue(animated ? 0 : 1);

  useEffect(() => {
    if (!animated) return;
    scale.value = withSpring(1, { stiffness: 200, damping: 10 });
    opacity.value = withSpring(1, { stiffness: 200, damping: 10 });
  }, [bestPrice]);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
    opacity: opacity.value,
  }));

  return (
    <Animated.View style={[s.container, { backgroundColor: bg }, style, animatedStyle]}>
      <View style={s.priceRow}>
        <Text style={[s.bestPrice, { color }, large && s.bestPriceLarge]}>
          {bestPrice.toFixed(2)} €
        </Text>
        {referencePrice && referencePrice > 0 && bestPrice < referencePrice && (
          <Text style={s.refPrice}>{referencePrice.toFixed(2)} €</Text>
        )}
        {pct !== null && pct > 0 && pct <= 95 && (
          <View style={[s.discountBadge, { backgroundColor: color }]}>
            <Text style={s.discountText}>-{pct}%</Text>
          </View>
        )}
      </View>
      {valueLabel(val) && (
        <Text style={[s.valueLabel, { color }]}>{valueLabel(val)}</Text>
      )}
    </Animated.View>
  );
}

const s = StyleSheet.create({
  container: {
    borderRadius: theme.radius.card,
    padding: 16,
  },
  priceRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
    gap: 10,
  },
  bestPrice: {
    fontFamily: 'Inter_700Bold',
    fontSize: 32,
  },
  bestPriceLarge: {
    fontSize: 42,
  },
  refPrice: {
    fontSize: 16,
    color: theme.colors.textMuted,
    textDecorationLine: 'line-through',
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
  valueLabel: {
    fontSize: 13,
    fontFamily: 'Inter_600SemiBold',
    marginTop: 6,
  },
});
