// src/features/runner/runner-storage.ts — High score AsyncStorage

import AsyncStorage from '@react-native-async-storage/async-storage';

const HIGH_SCORE_KEY = '@parfumscan/runner-highscore';

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
