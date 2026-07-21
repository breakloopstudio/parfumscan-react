// src/features/runner/useRunnerLoop.ts — Game loop via useFrameCallback

import { useCallback, useMemo } from 'react';
import {
  useSharedValue,
  useFrameCallback,
  type SharedValue,
} from 'react-native-reanimated';
import {
  type GameDimensions,
  GRAVITY,
  JUMP_VELOCITY,
  DOUBLE_JUMP_VELOCITY,
  BASE_SPEED,
  MAX_SPEED,
  SPEED_INCREMENT_PER_POINT,
  BOTTLE_WIDTH,
  BOTTLE_HEIGHT,
  OBSTACLE_POOL_SIZE,
  PICKUP_POOL_SIZE,
  getSpawnDistance,
  getPickupSpawnDistance,
  getDoubleObstacleChance,
  checkAABB,
  OBSTACLE_DEFS,
  PICKUP_DEFS,
} from './runner-types';

const BOTTLE_HITBOX_INSET = 5;

interface ObsData { active: SharedValue<boolean>; x: SharedValue<number>; type: SharedValue<number>; }
interface PkpData { active: SharedValue<boolean>; x: SharedValue<number>; type: SharedValue<number>; y: SharedValue<number>; }

export function useRunnerLoop(dims: GameDimensions) {
  const bottleY = useSharedValue(dims.groundY);
  const jumpVelocity = useSharedValue(0);
  const isJumping = useSharedValue(false);
  const canDoubleJump = useSharedValue(false);
  const isDoubleJumping = useSharedValue(false);
  const landingTrigger = useSharedValue(0);

  const gameState = useSharedValue('idle');
  const score = useSharedValue(0);
  const speed = useSharedValue(BASE_SPEED);

  const oa0=useSharedValue(false); const ox0=useSharedValue(0); const ot0=useSharedValue(0);
  const oa1=useSharedValue(false); const ox1=useSharedValue(0); const ot1=useSharedValue(0);
  const oa2=useSharedValue(false); const ox2=useSharedValue(0); const ot2=useSharedValue(0);
  const oa3=useSharedValue(false); const ox3=useSharedValue(0); const ot3=useSharedValue(0);
  const oa4=useSharedValue(false); const ox4=useSharedValue(0); const ot4=useSharedValue(0);
  const oa5=useSharedValue(false); const ox5=useSharedValue(0); const ot5=useSharedValue(0);
  const oa6=useSharedValue(false); const ox6=useSharedValue(0); const ot6=useSharedValue(0);
  const oa7=useSharedValue(false); const ox7=useSharedValue(0); const ot7=useSharedValue(0);

  const obsActive: SharedValue<boolean>[] = [oa0,oa1,oa2,oa3,oa4,oa5,oa6,oa7];
  const obsX: SharedValue<number>[] = [ox0,ox1,ox2,ox3,ox4,ox5,ox6,ox7];
  const obsType: SharedValue<number>[] = [ot0,ot1,ot2,ot3,ot4,ot5,ot6,ot7];

  const pa0=useSharedValue(false); const px0=useSharedValue(0); const pt0=useSharedValue(0); const py0=useSharedValue(0);
  const pa1=useSharedValue(false); const px1=useSharedValue(0); const pt1=useSharedValue(0); const py1=useSharedValue(0);
  const pa2=useSharedValue(false); const px2=useSharedValue(0); const pt2=useSharedValue(0); const py2=useSharedValue(0);
  const pa3=useSharedValue(false); const px3=useSharedValue(0); const pt3=useSharedValue(0); const py3=useSharedValue(0);

  const pkpActive: SharedValue<boolean>[] = [pa0,pa1,pa2,pa3];
  const pkpX: SharedValue<number>[] = [px0,px1,px2,px3];
  const pkpType: SharedValue<number>[] = [pt0,pt1,pt2,pt3];
  const pkpY: SharedValue<number>[] = [py0,py1,py2,py3];

  const obs = useMemo<ObsData[]>(() => Array.from({length:8},(_,i)=>({active:obsActive[i],x:obsX[i],type:obsType[i]})), []);
  const pkp = useMemo<PkpData[]>(() => Array.from({length:4},(_,i)=>({active:pkpActive[i],x:pkpX[i],type:pkpType[i],y:pkpY[i]})), []);

  const bgOffset = useSharedValue(0);
  const midOffset = useSharedValue(0);
  const groundOffset = useSharedValue(0);

  const spawnAccumulator = useSharedValue(0);
  const nextSpawnDistance = useSharedValue(350);
  const pickupSpawnAccumulator = useSharedValue(0);
  const nextPickupDistance = useSharedValue(700);

  const deathTimer = useSharedValue(0);
  const lastCollectedDiscount = useSharedValue(0);

  const resetGame = useCallback(() => {
    gameState.value = 'idle';
    bottleY.value = dims.groundY;
    jumpVelocity.value = 0;
    isJumping.value = false;
    canDoubleJump.value = false;
    isDoubleJumping.value = false;
    score.value = 0;
    speed.value = BASE_SPEED;
    spawnAccumulator.value = 0;
    nextSpawnDistance.value = 400;
    pickupSpawnAccumulator.value = 0;
    nextPickupDistance.value = 700;
    deathTimer.value = 0;
    lastCollectedDiscount.value = 0;

    for (let i = 0; i < 8; i++) { obsActive[i].value = true; obsX[i].value = 300; obsType[i].value = 0; }
    for (let i = 0; i < 4; i++) { pkpActive[i].value = false; pkpX[i].value = 0; pkpType[i].value = 0; pkpY[i].value = 0; }

    bgOffset.value = 0;
    midOffset.value = 0;
    groundOffset.value = 0;
  }, [dims]);

  const frameCallback = useFrameCallback(({ timeSincePreviousFrame }) => {
    'worklet';
    const dt = Math.min((timeSincePreviousFrame ?? 16) / 1000, 0.05);
    if (dt <= 0) return;

    const state = gameState.value;

    if (state === 'playing' || state === 'dying') {
      const currentSpeed = Math.min(BASE_SPEED + score.value * SPEED_INCREMENT_PER_POINT, MAX_SPEED);
      speed.value = currentSpeed;

      if (state === 'playing') { score.value += currentSpeed * dt * 0.01; }

      if (isJumping.value) {
        bottleY.value += jumpVelocity.value * dt;
        jumpVelocity.value += GRAVITY * dt;
        if (bottleY.value >= dims.groundY) {
          bottleY.value = dims.groundY;
          isJumping.value = false;
          canDoubleJump.value = true;
          isDoubleJumping.value = false;
          landingTrigger.value = landingTrigger.value + 1;
        }
      }

      const scrollDist = currentSpeed * dt;
      bgOffset.value = (bgOffset.value + scrollDist * 0.15) % 1200;
      midOffset.value = (midOffset.value + scrollDist * 0.4) % 1400;
      groundOffset.value = (groundOffset.value + scrollDist) % 80;

      const bx = dims.bottleX + BOTTLE_HITBOX_INSET;
      const by = bottleY.value - BOTTLE_HEIGHT + BOTTLE_HITBOX_INSET;
      const bw = BOTTLE_WIDTH - BOTTLE_HITBOX_INSET * 2;
      const bh = BOTTLE_HEIGHT - BOTTLE_HITBOX_INSET * 2;

      for (let i = 0; i < 8; i++) {
        if (!obsActive[i].value) continue;
        obsX[i].value -= scrollDist;
        if (state === 'playing') {
            const def = { width: 28, height: 40 };
            if (checkAABB(bx, by, bw, bh, obsX[i].value + 6, dims.groundY - def.height + 8, 200, def.height - 10)) {
            gameState.value = 'dying';
            deathTimer.value = 0;
            speed.value = currentSpeed * 0.3;
            break;
          }
        }
        if (obsX[i].value < -100) { /* obsActive[i].value = false; */ obsX[i].value = dims.width + 100; }
      }

      for (let i = 0; i < 4; i++) {
        if (!pkpActive[i].value) continue;
        pkpX[i].value -= scrollDist;
        if (state === 'playing') {
          if (checkAABB(bx, by, bw, bh, pkpX[i].value, pkpY[i].value, 38, 38)) {
            const def = PICKUP_DEFS[pkpType[i].value];
            if (def) { score.value += def.scoreBonus; lastCollectedDiscount.value = def.discount; }
            pkpActive[i].value = false;
          }
        }
        if (pkpX[i].value < -80) { pkpActive[i].value = false; }
      }

      if (state === 'dying') {
        deathTimer.value += dt;
        if (bottleY.value >= dims.groundY && isJumping.value) { bottleY.value = dims.groundY; isJumping.value = false; }
        if (deathTimer.value > 1.2) { gameState.value = 'gameover'; }
      }
    }

    if (state === 'playing') {
      const scrollDist = speed.value * dt;
      spawnAccumulator.value += scrollDist;
      if (spawnAccumulator.value >= nextSpawnDistance.value) {
        spawnAccumulator.value = 0;
        let freeSlot = -1;
        for (let i = 0; i < 8; i++) { if (!obsActive[i].value) { freeSlot = i; break; } }
        if (freeSlot >= 0) {
          const typeIdx = Math.floor(Math.random() * OBSTACLE_DEFS.length);
          obsType[freeSlot].value = typeIdx;
          obsX[freeSlot].value = dims.width + 50;
          obsActive[freeSlot].value = true;

          if (Math.random() < getDoubleObstacleChance(score.value)) {
            let s2 = -1;
            for (let i = 0; i < 8; i++) { if (i !== freeSlot && !obsActive[i].value) { s2 = i; break; } }
            if (s2 >= 0) {
              obsType[s2].value = Math.floor(Math.random() * OBSTACLE_DEFS.length);
              obsX[s2].value = obsX[freeSlot].value + OBSTACLE_DEFS[typeIdx].width + 80 + Math.random() * 60;
              obsActive[s2].value = true;
            }
          }
        }
        nextSpawnDistance.value = getSpawnDistance(score.value);
      }

      pickupSpawnAccumulator.value += scrollDist;
      if (pickupSpawnAccumulator.value >= nextPickupDistance.value) {
        pickupSpawnAccumulator.value = 0;
        let freeSlot = -1;
        for (let i = 0; i < 4; i++) { if (!pkpActive[i].value) { freeSlot = i; break; } }
        if (freeSlot >= 0) {
          const typeIdx = Math.floor(Math.random() * PICKUP_DEFS.length);
          const def = PICKUP_DEFS[typeIdx];
          pkpType[freeSlot].value = typeIdx;
          pkpX[freeSlot].value = dims.width + 80;
          let alt = def.altitude;
          if (alt === 'very_high' && score.value < 1200) alt = 'high';
          else if (alt === 'high' && score.value < 600) alt = 'medium';
          let y: number;
          switch (alt) { case 'low': y=dims.groundY-85; break; case 'medium': y=dims.groundY-135; break; case 'high': y=dims.groundY-185; break; case 'very_high': y=dims.groundY-235; break; }
          pkpY[freeSlot].value = y;
          pkpActive[freeSlot].value = true;
        }
        nextPickupDistance.value = getPickupSpawnDistance(score.value);
      }
    }
  }, false);

  return { bottleY, jumpVelocity, isJumping, canDoubleJump, isDoubleJumping, landingTrigger, gameState, score, speed, obs, pkp, bgOffset, midOffset, groundOffset, frameCallback, resetGame, lastCollectedDiscount };
}
