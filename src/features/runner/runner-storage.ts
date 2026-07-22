// src/features/runner/runner-storage.ts — High score + skins AsyncStorage

import AsyncStorage from '@react-native-async-storage/async-storage';

const HIGH_SCORE_KEY = '@parfumscan/runner-highscore';
const SKINS_KEY = '@parfumscan/runner-skins';

export const SKINS = [
  { key: 'default', threshold: 0, bottle: '#6C3ED9', cap: '#D4A960', accent: '#8B6CF6' },
  { key: 'amber', threshold: 500, bottle: '#D97706', cap: '#FBBF24', accent: '#F59E0B' },
  { key: 'frost', threshold: 1500, bottle: '#06B6D4', cap: '#67E8F9', accent: '#22D3EE' },
  { key: 'noir', threshold: 3000, bottle: '#2A2238', cap: '#D4A960', accent: '#6C3ED9' },
] as const;

export function getSkinForScore(score: number): typeof SKINS[number] {
  let best: typeof SKINS[number] = SKINS[0];
  for (const s of SKINS) { if (score >= s.threshold) best = s; }
  return best;
}

export async function getUnlockedSkins(): Promise<string[]> {
  try {
    const v = await AsyncStorage.getItem(SKINS_KEY);
    if (v) { const arr = JSON.parse(v); if (Array.isArray(arr)) return arr; }
  } catch {}
  return ['default'];
}

export async function unlockSkin(key: string): Promise<void> {
  try {
    const skins = await getUnlockedSkins();
    if (!skins.includes(key)) { skins.push(key); await AsyncStorage.setItem(SKINS_KEY, JSON.stringify(skins)); }
  } catch {}
}

export async function getHighScore(): Promise<number> {
  try {
    const v = await AsyncStorage.getItem(HIGH_SCORE_KEY);
    const n = v ? parseInt(v, 10) : 0;
    return Number.isFinite(n) ? n : 0;
  } catch {
    return 0;
  }
}

export async function setHighScore(score: number): Promise<void> {
  try {
    await AsyncStorage.setItem(HIGH_SCORE_KEY, Math.floor(score).toString());
  } catch {}
}
