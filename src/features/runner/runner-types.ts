// src/features/runner/runner-types.ts — Types, config, constantes du mini-jeu Flacon Runner

export interface GameDimensions {
  width: number;
  height: number;
  groundY: number;
  bottleX: number;
}

export interface ObstacleDef {
  width: number;
  height: number;
}

export interface PickupDef {
  discount: number;
  label: string;
  altitude: 'low' | 'medium' | 'high' | 'very_high';
  scoreBonus: number;
}

export type GameStateValue = 'entering' | 'idle' | 'playing' | 'dying' | 'gameover' | 'exiting';

export const GRAVITY = 1850;
export const JUMP_VELOCITY = -720;
export const DOUBLE_JUMP_VELOCITY = -610;
export const BASE_SPEED = 300;
export const MAX_SPEED = 780;
export const SPEED_INCREMENT_PER_POINT = 0.12;

export const BOTTLE_WIDTH = 30;
export const BOTTLE_HEIGHT = 56;

export const OBSTACLE_POOL_SIZE = 8;
export const PICKUP_POOL_SIZE = 4;

export const OBSTACLE_DEFS: ObstacleDef[] = [
  { width: 28, height: 40 },
  { width: 28, height: 56 },
  { width: 55, height: 28 },
  { width: 33, height: 48 },
];

export const PICKUP_DEFS: PickupDef[] = [
  { discount: 10, label: '−10%', altitude: 'low', scoreBonus: 25 },
  { discount: 20, label: '−20%', altitude: 'medium', scoreBonus: 50 },
  { discount: 30, label: '−30%', altitude: 'high', scoreBonus: 100 },
  { discount: 50, label: '−50%', altitude: 'very_high', scoreBonus: 200 },
];

export function getSpawnDistance(score: number): number {
  'worklet';
  const baseMin = 300;
  const baseMax = 450;
  const reduction = Math.min(score * 0.04, 150);
  const min = baseMin - reduction;
  const max = baseMax - reduction * 1.3;
  return Math.max(180, min + Math.random() * Math.max(40, max - min));
}

export function getPickupSpawnDistance(score: number): number {
  'worklet';
  const base = 600 + Math.random() * 500;
  return Math.max(350, base - score * 0.06);
}

export function getAltitudes(altitude: PickupDef['altitude'], groundY: number): number {
  switch (altitude) {
    case 'low': return groundY - 85;
    case 'medium': return groundY - 130;
    case 'high': return groundY - 180;
    case 'very_high': return groundY - 230;
  }
}

export function getDoubleObstacleChance(score: number): number {
  'worklet';
  if (score < 500) return 0;
  if (score < 1000) return 0.15;
  if (score < 1500) return 0.3;
  if (score < 2000) return 0.45;
  return 0.55;
}

export function checkAABB(
  ax: number, ay: number, aw: number, ah: number,
  bx: number, by: number, bw: number, bh: number,
): boolean {
  'worklet';
  return ax < bx + bw && ax + aw > bx && ay < by + bh && ay + ah > by;
}
