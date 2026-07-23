// src/features/wardrobe/WeatherWidget.tsx — Pastille météo compacte

import { useMemo } from 'react';
import { View, Text, ActivityIndicator } from 'react-native';
import Ionicons from '@react-native-vector-icons/ionicons/static';
import { useTheme, type Theme } from '../../theme/ThemeContext';
import { getWmoMeta } from '../../utils/weather-codes';
import type { WeatherData } from '../../services/weather';

const NIGHT_ICON: Record<string, string> = {
  sunny: 'moon',
  'partly-sunny': 'cloudy-night',
};

interface Props {
  weather: WeatherData | null;
  loading: boolean;
  error?: string | null;
  sotdName?: string;
  sotdScore?: number;
}

export default function WeatherWidget({ weather, loading, error, sotdName, sotdScore }: Props) {
  const { theme } = useTheme();
  const s = useMemo(() => getStyles(theme), [theme]);

  if (loading) {
    return (
      <View style={s.container}>
        <ActivityIndicator size="small" color={theme.colors.primary} />
      </View>
    );
  }

  if (!weather) return null;

  const wmo = getWmoMeta(weather.weatherCode);
  const iconName = weather.isDay ? wmo.icon : NIGHT_ICON[wmo.icon] ?? wmo.icon;

  const showMatch = sotdName && (sotdScore ?? 0) >= 50;

  return (
    <View style={s.container}>
      <Ionicons name={iconName as never} size={14} color={theme.colors.primary} />
      <Text allowFontScaling={false} style={s.temp}>{Math.round(weather.temperature)}<Text style={s.degree}>°C</Text></Text>
      <Text style={s.label}>{wmo.label}</Text>
      {showMatch && (
        <>
          <View style={s.dot} />
          <Text style={s.match} numberOfLines={1}>Parfait pour {sotdName}</Text>
        </>
      )}
      {error && !weather && (
        <>
          <View style={s.dot} />
          <Text style={s.error} numberOfLines={1}>{error}</Text>
        </>
      )}
    </View>
  );
}

function getStyles(t: Theme) {
  return {
    container: {
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: t.colors.primarySoft,
      borderRadius: t.radius.base,
      paddingVertical: 7,
      paddingHorizontal: 10,
      marginHorizontal: 16,
      marginTop: 2,
      marginBottom: 4,
      gap: 6,
    },
    temp: {
      fontFamily: 'Inter_700Bold',
      fontSize: 13,
      color: t.colors.primaryInk,
    },
    degree: {
      fontFamily: 'Inter_400Regular',
      fontSize: 11,
      color: t.colors.primaryInk,
    },
    label: {
      fontFamily: 'Inter_400Regular',
      fontSize: 12,
      color: t.colors.primaryInk,
    },
    dot: {
      width: 3,
      height: 3,
      borderRadius: 2,
      backgroundColor: t.colors.primaryInk,
      opacity: 0.4,
    },
    match: {
      fontFamily: 'Inter_500Medium',
      fontSize: 11,
      color: t.colors.primary,
      flexShrink: 1,
    },
    error: {
      fontFamily: 'Inter_400Regular',
      fontSize: 11,
      color: t.colors.textMuted,
      flexShrink: 1,
    },
  } as const;
}
