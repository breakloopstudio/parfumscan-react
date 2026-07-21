import { scanReducer, SCAN_STEPS } from '../../src/hooks/useScanReducer';
import type { ScanState, ScanAction } from '../../src/hooks/useScanReducer';
import type { ScanResult, Parfum } from '../../src/models';

function makeParfum(overrides: Partial<Parfum> = {}): Parfum {
  return {
    id: 'test_parfum_1',
    marque: 'Test Brand',
    nom: 'Test Name',
    familleOlactive: 'floral',
    notesTete: ['bergamot'],
    notesCoeur: ['rose'],
    notesFond: ['vanilla'],
    createdAt: new Date(),
    updatedAt: new Date(),
    ...overrides,
  };
}

function makeScanResult(overrides: Partial<ScanResult> = {}): ScanResult {
  return {
    marque: 'Dior',
    nom: 'Sauvage',
    volumeMl: 100,
    typeParfum: 'EDT',
    ...overrides,
  };
}

describe('SCAN_STEPS', () => {
  it('has 3 steps', () => {
    expect(SCAN_STEPS).toHaveLength(3);
  });

  it('contains the expected labels', () => {
    expect(SCAN_STEPS[0]).toBe('Capture du flacon');
    expect(SCAN_STEPS[1]).toBe('Analyse IA');
    expect(SCAN_STEPS[2]).toBe('Comparaison des prix');
  });
});

describe('scanReducer', () => {
  const idle: ScanState = { kind: 'idle' };
  const camera: ScanState = { kind: 'camera' };
  const scanning: ScanState = { kind: 'scanning', step: 0 };
  const parfums = [makeParfum()];
  const scanResult = makeScanResult();

  describe('OPEN_CAMERA', () => {
    it('transitions from idle to camera', () => {
      expect(scanReducer(idle, { type: 'OPEN_CAMERA' })).toEqual({ kind: 'camera' });
    });

    it('transitions from any state to camera', () => {
      expect(scanReducer(scanning, { type: 'OPEN_CAMERA' })).toEqual({ kind: 'camera' });
    });
  });

  describe('CANCEL_CAMERA', () => {
    it('transitions from camera to idle', () => {
      expect(scanReducer(camera, { type: 'CANCEL_CAMERA' })).toEqual({ kind: 'idle' });
    });

    it('returns idle from any state', () => {
      expect(scanReducer(scanning, { type: 'CANCEL_CAMERA' })).toEqual({ kind: 'idle' });
    });
  });

  describe('START_SCAN', () => {
    it('transitions to scanning with step 0', () => {
      expect(scanReducer(idle, { type: 'START_SCAN' })).toEqual({ kind: 'scanning', step: 0 });
    });

    it('resets step to 0 even if already scanning', () => {
      const scanningStep2: ScanState = { kind: 'scanning', step: 2 };
      expect(scanReducer(scanningStep2, { type: 'START_SCAN' })).toEqual({ kind: 'scanning', step: 0 });
    });
  });

  describe('STEP_1 / STEP_2', () => {
    it('STEP_1 increments step to 1 when scanning', () => {
      expect(scanReducer(scanning, { type: 'STEP_1' })).toEqual({ kind: 'scanning', step: 1 });
    });

    it('STEP_2 increments step to 2 when scanning', () => {
      expect(scanReducer(scanning, { type: 'STEP_2' })).toEqual({ kind: 'scanning', step: 2 });
    });

    it('STEP_1 ignores non-scanning states', () => {
      expect(scanReducer(idle, { type: 'STEP_1' })).toEqual({ kind: 'idle' });
    });

    it('STEP_2 ignores non-scanning states', () => {
      expect(scanReducer(idle, { type: 'STEP_2' })).toEqual({ kind: 'idle' });
    });
  });

  describe('SCAN_SUCCESS', () => {
    it('transitions to results with parfums', () => {
      expect(scanReducer(scanning, { type: 'SCAN_SUCCESS', parfums })).toEqual({
        kind: 'results',
        parfums,
      });
    });

    it('works with empty parfums array', () => {
      expect(scanReducer(scanning, { type: 'SCAN_SUCCESS', parfums: [] })).toEqual({
        kind: 'results',
        parfums: [],
      });
    });
  });

  describe('SCAN_CLARIFY', () => {
    it('transitions to clarify with scan result', () => {
      expect(
        scanReducer(scanning, { type: 'SCAN_CLARIFY', scanResult, reason: 'low-confidence' })
      ).toEqual({ kind: 'clarify', scanResult, reason: 'low-confidence' });
    });

    it('handles empty-response reason', () => {
      expect(
        scanReducer(scanning, { type: 'SCAN_CLARIFY', scanResult, reason: 'empty-response' })
      ).toEqual({ kind: 'clarify', scanResult, reason: 'empty-response' });
    });
  });

  describe('SCAN_NO_RESULT', () => {
    it('transitions to no-result with scan result', () => {
      expect(scanReducer(scanning, { type: 'SCAN_NO_RESULT', scanResult })).toEqual({
        kind: 'no-result',
        scanResult,
      });
    });
  });

  describe('SCAN_ERROR', () => {
    it('transitions to error with message', () => {
      expect(scanReducer(idle, { type: 'SCAN_ERROR', message: 'Network error' })).toEqual({
        kind: 'error',
        message: 'Network error',
      });
    });

    it('works from any state', () => {
      expect(scanReducer(scanning, { type: 'SCAN_ERROR', message: 'Timeout' })).toEqual({
        kind: 'error',
        message: 'Timeout',
      });
    });
  });

  describe('OPEN_MANUAL', () => {
    it('transitions to clarify with manual reason and null result', () => {
      expect(scanReducer(idle, { type: 'OPEN_MANUAL' })).toEqual({
        kind: 'clarify',
        scanResult: { marque: null, nom: null, volumeMl: null, typeParfum: null },
        reason: 'manual',
      });
    });
  });

  describe('RESET', () => {
    it('returns idle from any state', () => {
      expect(scanReducer(camera, { type: 'RESET' })).toEqual({ kind: 'idle' });
      expect(scanReducer(scanning, { type: 'RESET' })).toEqual({ kind: 'idle' });
      expect(
        scanReducer({ kind: 'results', parfums }, { type: 'RESET' })
      ).toEqual({ kind: 'idle' });
      expect(
        scanReducer({ kind: 'error', message: 'err' }, { type: 'RESET' })
      ).toEqual({ kind: 'idle' });
    });
  });

  describe('unknown action', () => {
    it('returns current state unchanged', () => {
      // @ts-expect-error — testing runtime behavior with invalid action
      expect(scanReducer(idle, { type: 'INVALID' })).toEqual({ kind: 'idle' });
    });
  });

  describe('state machine — full flows', () => {
    it('idle → camera → cancel → idle', () => {
      let state: ScanState = { kind: 'idle' };
      state = scanReducer(state, { type: 'OPEN_CAMERA' });
      expect(state.kind).toBe('camera');
      state = scanReducer(state, { type: 'CANCEL_CAMERA' });
      expect(state.kind).toBe('idle');
    });

    it('idle → scan → step progression → success', () => {
      let state: ScanState = { kind: 'idle' };
      state = scanReducer(state, { type: 'START_SCAN' });
      expect(state).toEqual({ kind: 'scanning', step: 0 });
      state = scanReducer(state, { type: 'STEP_1' });
      expect(state).toEqual({ kind: 'scanning', step: 1 });
      state = scanReducer(state, { type: 'STEP_2' });
      expect(state).toEqual({ kind: 'scanning', step: 2 });
      state = scanReducer(state, { type: 'SCAN_SUCCESS', parfums });
      expect(state).toEqual({ kind: 'results', parfums });
      state = scanReducer(state, { type: 'RESET' });
      expect(state.kind).toBe('idle');
    });

    it('idle → scan → error → reset', () => {
      let state: ScanState = { kind: 'idle' };
      state = scanReducer(state, { type: 'START_SCAN' });
      state = scanReducer(state, { type: 'SCAN_ERROR', message: 'GPT failed' });
      expect(state).toEqual({ kind: 'error', message: 'GPT failed' });
      state = scanReducer(state, { type: 'RESET' });
      expect(state.kind).toBe('idle');
    });

    it('idle → scan → no-result → reset', () => {
      let state: ScanState = { kind: 'idle' };
      state = scanReducer(state, { type: 'START_SCAN' });
      state = scanReducer(state, { type: 'SCAN_NO_RESULT', scanResult });
      expect(state).toEqual({ kind: 'no-result', scanResult });
      state = scanReducer(state, { type: 'RESET' });
      expect(state.kind).toBe('idle');
    });

    it('idle → open manual → clarify', () => {
      let state: ScanState = { kind: 'idle' };
      state = scanReducer(state, { type: 'OPEN_MANUAL' });
      expect(state.kind).toBe('clarify');
      expect((state as { reason: string }).reason).toBe('manual');
    });
  });
});
