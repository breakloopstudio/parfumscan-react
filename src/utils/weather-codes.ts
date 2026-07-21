// src/utils/weather-codes.ts — Codes météo WMO : icônes, labels, boost saisonniers

export interface WmoMeta {
  label: string;
  icon: string;
  seasonBoost: Record<string, number>;
}

export const WMO_META: Record<number, WmoMeta> = {
  0:  { label: 'Ensoleillé',  icon: 'sunny',             seasonBoost: { spring: 1.1, summer: 1.2, fall: 0.9, winter: 0.8 } },
  1:  { label: 'Clair',       icon: 'partly-sunny',      seasonBoost: { spring: 1.0, summer: 1.1, fall: 1.0, winter: 1.0 } },
  2:  { label: 'Nuageux',     icon: 'cloudy',            seasonBoost: { spring: 0.9, summer: 0.8, fall: 1.1, winter: 1.0 } },
  3:  { label: 'Couvert',     icon: 'cloudy',            seasonBoost: { spring: 0.8, summer: 0.7, fall: 1.2, winter: 1.1 } },
  45: { label: 'Brouillard',  icon: 'cloudy',            seasonBoost: { spring: 0.7, summer: 0.6, fall: 1.3, winter: 1.2 } },
  48: { label: 'Brouillard',  icon: 'cloudy',            seasonBoost: { spring: 0.7, summer: 0.6, fall: 1.3, winter: 1.2 } },
  51: { label: 'Bruine',      icon: 'rainy-outline',     seasonBoost: { spring: 0.8, summer: 0.7, fall: 1.0, winter: 0.9 } },
  53: { label: 'Bruine',      icon: 'rainy-outline',     seasonBoost: { spring: 0.8, summer: 0.7, fall: 1.0, winter: 0.9 } },
  55: { label: 'Bruine',      icon: 'rainy-outline',     seasonBoost: { spring: 0.7, summer: 0.6, fall: 1.0, winter: 0.8 } },
  56: { label: 'Verglas',      icon: 'snow',              seasonBoost: { spring: 0.2, summer: 0.0, fall: 0.5, winter: 1.2 } },
  57: { label: 'Verglas',      icon: 'snow',              seasonBoost: { spring: 0.1, summer: 0.0, fall: 0.4, winter: 1.2 } },
  61: { label: 'Pluie',       icon: 'rainy',             seasonBoost: { spring: 0.8, summer: 0.6, fall: 1.1, winter: 0.9 } },
  63: { label: 'Pluie',       icon: 'rainy',             seasonBoost: { spring: 0.7, summer: 0.5, fall: 1.0, winter: 0.8 } },
  65: { label: 'Pluie forte', icon: 'rainy',             seasonBoost: { spring: 0.6, summer: 0.4, fall: 0.9, winter: 0.7 } },
  66: { label: 'Verglas',      icon: 'snow',              seasonBoost: { spring: 0.2, summer: 0.0, fall: 0.5, winter: 1.2 } },
  67: { label: 'Verglas',      icon: 'snow',              seasonBoost: { spring: 0.1, summer: 0.0, fall: 0.4, winter: 1.2 } },
  71: { label: 'Neige',       icon: 'snow',              seasonBoost: { spring: 0.3, summer: 0.0, fall: 0.7, winter: 1.5 } },
  73: { label: 'Neige',       icon: 'snow',              seasonBoost: { spring: 0.2, summer: 0.0, fall: 0.6, winter: 1.5 } },
  75: { label: 'Neige forte', icon: 'snow',              seasonBoost: { spring: 0.1, summer: 0.0, fall: 0.5, winter: 1.5 } },
  77: { label: 'Neige',       icon: 'snow',              seasonBoost: { spring: 0.1, summer: 0.0, fall: 0.5, winter: 1.5 } },
  80: { label: 'Averses',     icon: 'rainy-outline',     seasonBoost: { spring: 0.7, summer: 0.6, fall: 1.0, winter: 0.8 } },
  81: { label: 'Averses',     icon: 'rainy-outline',     seasonBoost: { spring: 0.6, summer: 0.5, fall: 1.0, winter: 0.7 } },
  82: { label: 'Averses',     icon: 'thunderstorm-outline', seasonBoost: { spring: 0.5, summer: 0.4, fall: 0.9, winter: 0.7 } },
  85: { label: 'Neige',       icon: 'snow',              seasonBoost: { spring: 0.2, summer: 0.0, fall: 0.6, winter: 1.4 } },
  86: { label: 'Neige',       icon: 'snow',              seasonBoost: { spring: 0.1, summer: 0.0, fall: 0.5, winter: 1.4 } },
  95: { label: 'Orage',       icon: 'thunderstorm',      seasonBoost: { spring: 0.6, summer: 0.5, fall: 0.8, winter: 0.7 } },
  96: { label: 'Orage',       icon: 'thunderstorm',      seasonBoost: { spring: 0.5, summer: 0.4, fall: 0.7, winter: 0.6 } },
  99: { label: 'Orage',       icon: 'thunderstorm',      seasonBoost: { spring: 0.4, summer: 0.3, fall: 0.6, winter: 0.5 } },
};

export function getWmoMeta(code: number): WmoMeta {
  return WMO_META[code] ?? WMO_META[1];
}

export function mapTempToSeason(temp: number): 'spring' | 'summer' | 'fall' | 'winter' {
  if (temp > 28) return 'summer';
  if (temp >= 20) return 'spring';
  if (temp >= 10) return 'fall';
  return 'winter';
}
