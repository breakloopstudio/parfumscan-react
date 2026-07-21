// src/features/runner/RunnerGame.tsx — Composant principal du mini-jeu

import { useState, useEffect, useMemo, useCallback } from 'react';
import { View, Text, Pressable, StyleSheet, useWindowDimensions } from 'react-native';
import {
  useAnimatedReaction,
  useSharedValue,
} from 'react-native-reanimated';
import { scheduleOnRN } from 'react-native-worklets';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import { useTheme, type Theme } from '../../theme/ThemeContext';
import { hapticsLight, hapticsSuccess } from '../../services/haptics';
import { getHighScore, setHighScore } from './runner-storage';
import { useRunnerLoop } from './useRunnerLoop';
import RunnerBackground from './RunnerBackground';
import RunnerGround from './RunnerGround';
import RunnerBottle from './RunnerBottle';
import RunnerObstacles from './RunnerObstacles';
import RunnerPickups from './RunnerPickups';
import {
  type GameDimensions,
  JUMP_VELOCITY,
  DOUBLE_JUMP_VELOCITY,
} from './runner-types';

interface Props {
  onClose: () => void;
}

function getStyles(t: Theme) {
  return {
    container: {
      ...StyleSheet.absoluteFill,
      backgroundColor: '#0B0712',
      zIndex: 9999,
    },
    scoreContainer: {
      position: 'absolute' as const,
      top: 60,
      right: 24,
      alignItems: 'flex-end' as const,
    },
    scoreText: {
      fontFamily: 'Inter_700Bold',
      fontSize: 22,
      color: '#D4A960',
      fontVariant: ['tabular-nums'] as never,
    },
    hiLabel: {
      fontFamily: 'Inter_400Regular',
      fontSize: 11,
      color: '#988EA8',
      marginTop: 2,
    },
    closeBtn: {
      position: 'absolute' as const,
      top: 55,
      left: 16,
      width: 36,
      height: 36,
      justifyContent: 'center' as const,
      alignItems: 'center' as const,
      zIndex: 100,
    },
    closeText: {
      fontFamily: 'Inter_400Regular',
      fontSize: 20,
      color: '#988EA8',
    },
    startOverlay: {
      ...StyleSheet.absoluteFill,
      justifyContent: 'center' as const,
      alignItems: 'center' as const,
    },
    title: {
      fontFamily: 'PlayfairDisplay_700Bold',
      fontSize: 32,
      color: '#D4A960',
      marginBottom: 8,
    },
    subtitle: {
      fontFamily: 'Inter_600SemiBold',
      fontSize: 13,
      color: '#988EA8',
      letterSpacing: 1.5,
      textTransform: 'uppercase' as const,
    },
    tapLabel: {
      fontFamily: 'Inter_500Medium',
      fontSize: 15,
      color: '#8B6CF6',
      marginTop: 36,
    },
    hint: {
      fontFamily: 'Inter_400Regular',
      fontSize: 12,
      color: '#988EA8',
      marginTop: 8,
      textAlign: 'center' as const,
    },
    startHiLabel: {
      fontFamily: 'Inter_400Regular',
      fontSize: 12,
      color: '#988EA8',
      marginTop: 20,
    },
    startHiScore: {
      fontFamily: 'Inter_700Bold',
      fontSize: 14,
      color: '#D4A960',
      fontVariant: ['tabular-nums'] as never,
    },
    goOverlay: {
      ...StyleSheet.absoluteFill,
      justifyContent: 'center' as const,
      alignItems: 'center' as const,
      backgroundColor: 'rgba(11,7,18,0.75)',
    },
    goTitle: {
      fontFamily: 'PlayfairDisplay_700Bold',
      fontSize: 28,
      color: '#EDE8F5',
      marginBottom: 8,
    },
    goScore: {
      fontFamily: 'Inter_800ExtraBold',
      fontSize: 44,
      color: '#D4A960',
      fontVariant: ['tabular-nums'] as never,
    },
    goHiLabel: {
      fontFamily: 'Inter_400Regular',
      fontSize: 13,
      color: '#988EA8',
      marginTop: 4,
    },
    recordBadge: {
      backgroundColor: '#D4A960',
      paddingHorizontal: 12,
      paddingVertical: 5,
      borderRadius: 8,
      marginTop: 8,
    },
    recordText: {
      fontFamily: 'Inter_700Bold',
      fontSize: 12,
      color: '#1F1A2E',
    },
    retryBtn: {
      backgroundColor: '#8B6CF6',
      paddingHorizontal: 32,
      paddingVertical: 14,
      borderRadius: 12,
      marginTop: 28,
    },
    retryText: {
      fontFamily: 'Inter_600SemiBold',
      fontSize: 16,
      color: '#FFFFFF',
    },
    quitText: {
      fontFamily: 'Inter_400Regular',
      fontSize: 14,
      color: '#988EA8',
      marginTop: 14,
    },
    goPickups: {
      fontFamily: 'Inter_400Regular',
      fontSize: 12,
      color: '#988EA8',
      marginTop: 12,
    },
    deathContainer: {
      ...StyleSheet.absoluteFill,
      position: 'absolute' as const,
      top: 0, left: 0, right: 0, bottom: 0,
      pointerEvents: 'none' as const,
    },
  } as const;
}

export default function RunnerGame({ onClose }: Props) {
  const { theme } = useTheme();
  const s = useMemo(() => getStyles(theme), [theme]);
  const { width: screenW, height: screenH } = useWindowDimensions();

  const dims: GameDimensions = useMemo(() => ({
    width: screenW || 375,
    height: screenH || 812,
    groundY: (screenH || 812) * 0.72,
    bottleX: (screenW || 375) * 0.22,
  }), [screenW, screenH]);

  const {
    bottleY, isJumping, isDoubleJumping, landingTrigger,
    jumpVelocity, canDoubleJump,
    gameState, score,
    obs, pkp,
    bgOffset, midOffset, groundOffset,
    frameCallback, resetGame,
    lastCollectedDiscount,
  } = useRunnerLoop(dims);

  const [uiState, setUiState] = useState('idle');
  const [displayScore, setDisplayScore] = useState(0);
  const lastFloorShared = useSharedValue(0);
  const [highScore, setHighScoreState] = useState(0);
  const [isRecord, setIsRecord] = useState(false);
  const [collectedText, setCollectedText] = useState('');

  const collectedCounts = useMemo(() => ({ 10: 0, 20: 0, 30: 0, 50: 0 } as Record<number, number>), []);

  useEffect(() => {
    getHighScore().then(v => setHighScoreState(v)).catch(() => {});
  }, []);

  useAnimatedReaction(
    () => gameState.value,
    (state) => {
      scheduleOnRN(setUiState, state);
    },
  );

  useAnimatedReaction(
    () => score.value,
    () => {
      const floor = Math.floor(score.value);
      if (floor !== lastFloorShared.value) {
        lastFloorShared.value = floor;
        scheduleOnRN(setDisplayScore, floor);
      }
    },
  );

  const onPickupCollected = useCallback((discount: number) => {
    collectedCounts[discount] = (collectedCounts[discount] || 0) + 1;
    hapticsSuccess();
  }, [collectedCounts]);

  useAnimatedReaction(
    () => lastCollectedDiscount.value,
    (discount) => {
      if (discount > 0) {
        scheduleOnRN(onPickupCollected, discount);
        lastCollectedDiscount.value = 0;
      }
    },
  );

  useEffect(() => {
    frameCallback.setActive(true);
    return () => { frameCallback.setActive(false); };
  }, [frameCallback]);

  const handleRestart = useCallback(() => {
    resetGame();
    frameCallback.setActive(true);
    collectedCounts[10] = 0;
    collectedCounts[20] = 0;
    collectedCounts[30] = 0;
    collectedCounts[50] = 0;
    lastFloorShared.value = 0;
    setIsRecord(false);
    setCollectedText('');
    setDisplayScore(0);
  }, [resetGame, frameCallback, collectedCounts]);

  useEffect(() => {
    if (uiState === 'gameover') {
      const s = lastFloorShared.value;
      const parts: string[] = [];
      if (collectedCounts[10]) parts.push(`${collectedCounts[10]}× −10%`);
      if (collectedCounts[20]) parts.push(`${collectedCounts[20]}× −20%`);
      if (collectedCounts[30]) parts.push(`${collectedCounts[30]}× −30%`);
      if (collectedCounts[50]) parts.push(`${collectedCounts[50]}× −50%`);
      setCollectedText(parts.length > 0 ? `Réduc' collectées : ${parts.join(', ')}` : '');

      if (s > highScore) {
        setHighScoreState(s);
        setIsRecord(true);
        setHighScore(s).catch(() => {});
      }
    }
  }, [uiState, highScore, collectedCounts]);

  const tapGesture = useMemo(() =>
    Gesture.Tap()
      .onEnd(() => {
        'worklet';
        const state = gameState.value;
        if (state === 'idle') {
          gameState.value = 'playing';
          jumpVelocity.value = JUMP_VELOCITY;
          isJumping.value = true;
          return;
        }
        if (state === 'playing') {
          if (!isJumping.value) {
            jumpVelocity.value = JUMP_VELOCITY;
            isJumping.value = true;
            scheduleOnRN(hapticsLight);
            return;
          }
          if (canDoubleJump.value) {
            jumpVelocity.value = DOUBLE_JUMP_VELOCITY;
            canDoubleJump.value = false;
            isDoubleJumping.value = true;
            scheduleOnRN(hapticsSuccess);
            return;
          }
          return;
        }
        if (state === 'gameover') {
          scheduleOnRN(handleRestart);
          return;
        }
      }),
    [handleRestart],
  );

  const showStart = uiState === 'idle' || uiState === 'entering';
  const showGameOver = uiState === 'gameover';

  return (
    <GestureDetector gesture={tapGesture}>
      <View style={s.container}>
        <RunnerBackground bgOffset={bgOffset} midOffset={midOffset} />
        <RunnerGround groundOffset={groundOffset} groundY={dims.groundY} screenW={screenW} />

        <RunnerBottle
          bottleX={dims.bottleX}
          bottleY={bottleY}
          isJumping={isJumping}
          isDoubleJumping={isDoubleJumping}
          landingTrigger={landingTrigger}
          gameState={gameState}
        />

        <RunnerObstacles obs={obs} groundY={dims.groundY} />
        <RunnerPickups pkp={pkp} />

        <View style={s.scoreContainer}>
          <Text allowFontScaling={false} style={s.scoreText}>
            {displayScore}
          </Text>
          {highScore > 0 && (
            <Text allowFontScaling={false} style={s.hiLabel}>
              Record: {isRecord ? displayScore : highScore}
            </Text>
          )}
        </View>

        <Pressable
          style={s.closeBtn}
          onPress={onClose}
          hitSlop={8}
        >
          <Text style={s.closeText}>✕</Text>
        </Pressable>

        {showStart && (
          <View style={s.startOverlay} pointerEvents="none">
            <Text style={s.title}>Flacon Runner</Text>
            <Text style={s.subtitle}>Esquive les cristaux</Text>
            <Text style={s.tapLabel}>TAP TO START</Text>
            <Text style={s.hint}>
              Tap = saut{'\n'}Double tap = double saut{'\n'}Attrape les réductions en l'air !
            </Text>
            {highScore > 0 && (
              <>
                <Text style={s.startHiLabel}>Record</Text>
                <Text allowFontScaling={false} style={s.startHiScore}>{highScore}</Text>
              </>
            )}
          </View>
        )}

        {showGameOver && (
          <View style={s.goOverlay}>
            <Text style={s.goTitle}>Flacon brisé</Text>
            <Text allowFontScaling={false} style={s.goScore}>{displayScore}</Text>
            {isRecord && (
              <View style={s.recordBadge}>
                <Text allowFontScaling={false} style={s.recordText}>Nouveau record !</Text>
              </View>
            )}
            <Text style={s.goHiLabel}>Record: {Math.max(highScore, displayScore)}</Text>
            {collectedText ? (
              <Text style={s.goPickups}>{collectedText}</Text>
            ) : null}
            <Pressable style={s.retryBtn} onPress={handleRestart}>
              <Text style={s.retryText}>Rejouer</Text>
            </Pressable>
            <Pressable onPress={onClose}>
              <Text style={s.quitText}>Quitter</Text>
            </Pressable>
          </View>
        )}

        {uiState === 'dying' && (
          <View style={s.deathContainer} pointerEvents="none" />
        )}
      </View>
    </GestureDetector>
  );
}
