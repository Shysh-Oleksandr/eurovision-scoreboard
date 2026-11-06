import { describe, expect, it } from 'vitest';

import { buildHapticPattern, type HapticCue, type HapticCueId } from './cues';
import {
  androidTapPrimitive,
  patternDuration,
  rebasePattern,
  renderAndroid,
  renderFallback,
  renderIos,
  shapeLevel,
} from './render';
import { simpleHapticFor, simpleHapticPattern } from './simple';
import type { HapticPattern } from './types';

import { getClimbHapticCue } from '@/components/board/hooks/boardMoveHaptics';
import {
  admitHapticCue,
  holdHapticCue,
  type HapticGate,
} from '@/native/haptics';

/** One sample per cue; the Record type fails to compile when a cue is missing. */
const SAMPLE_CUES: Record<HapticCueId, HapticCue> = {
  points: { id: 'points', points: 8, maxPoints: 12 },
  pointsFlurry: {
    id: 'pointsFlurry',
    values: [1, 2, 3, 4, 5, 6, 7, 8, 10],
    maxPoints: 12,
    endsWithDouze: true,
  },
  douzeHit: { id: 'douzeHit' },
  douzeBloom: { id: 'douzeBloom', variant: 'hearts' },
  climb: { id: 'climb', places: 12, douze: true, lead: true },
  televote: { id: 'televote', share: 0.5 },
  nulPoints: { id: 'nulPoints' },
  votingRush: { id: 'votingRush' },
  scaleStep: { id: 'scaleStep', recipients: 20, share: 0.4 },
  spokespersonDouze: { id: 'spokespersonDouze' },
  nextJury: { id: 'nextJury' },
  undo: { id: 'undo' },
  qualifierCards: { id: 'qualifierCards', count: 3 },
  qualifierLockIn: { id: 'qualifierLockIn' },
  nonQualifiers: { id: 'nonQualifiers' },
  revealBeat: { id: 'revealBeat', closeness: 0.7 },
  revealCross: { id: 'revealCross' },
  revealFall: { id: 'revealFall' },
  revealHold: { id: 'revealHold' },
  revealWinnerFlash: { id: 'revealWinnerFlash' },
  winnerFireworks: { id: 'winnerFireworks' },
  winnerReveal: { id: 'winnerReveal' },
  winnerScore: { id: 'winnerScore', durationMs: 3000 },
  dragLift: { id: 'dragLift' },
  dragOver: { id: 'dragOver' },
  dragSlot: { id: 'dragSlot' },
  dragBoundary: { id: 'dragBoundary' },
  dragDrop: { id: 'dragDrop' },
  dragCancel: { id: 'dragCancel' },
  shuffle: { id: 'shuffle' },
  sortSweep: { id: 'sortSweep' },
  curtainUp: { id: 'curtainUp' },
  drawPot: { id: 'drawPot' },
  drawPick: { id: 'drawPick', durationMs: 550 },
  drawChip: { id: 'drawChip' },
  drawFlight: { id: 'drawFlight', durationMs: 600 },
  drawDone: { id: 'drawDone' },
  selection: { id: 'selection' },
  sliderTick: { id: 'sliderTick', edge: true },
  toggle: { id: 'toggle', on: true },
  snap: { id: 'snap' },
  success: { id: 'success' },
  warning: { id: 'warning' },
  error: { id: 'error' },
};

const inUnitRange = (value: number) => value >= 0 && value <= 1;

describe('haptic cues', () => {
  it.each(Object.values(SAMPLE_CUES))('$id builds a valid pattern', (cue) => {
    const pattern = buildHapticPattern(cue);

    expect(pattern.events.length).toBeGreaterThan(0);
    for (const event of pattern.events) {
      expect(event.at).toBeGreaterThanOrEqual(0);
      expect(inUnitRange(event.intensity)).toBe(true);
      expect(inUnitRange(event.sharpness)).toBe(true);
      if (event.type === 'hum') expect(event.duration).toBeGreaterThan(0);
    }
    expect(renderAndroid(pattern, 1).length).toBeLessThanOrEqual(48);
    expect(renderFallback(pattern, 1).length).toBeLessThanOrEqual(6);
  });

  it('grades jury points by value', () => {
    const one = buildHapticPattern({ id: 'points', points: 1, maxPoints: 12 });
    const ten = buildHapticPattern({ id: 'points', points: 10, maxPoints: 12 });

    expect(ten.events[0].intensity).toBeGreaterThan(one.events[0].intensity);
    expect(one.priority).toBe(0);
  });

  it('makes a bigger televote haul last longer', () => {
    const humOf = (pattern: HapticPattern) =>
      pattern.events.find((event) => event.type === 'hum');
    const small = humOf(buildHapticPattern({ id: 'televote', share: 0.05 }));
    const big = humOf(buildHapticPattern({ id: 'televote', share: 0.6 }));

    expect(small?.type === 'hum' && big?.type === 'hum').toBe(true);
    if (small?.type === 'hum' && big?.type === 'hum') {
      expect(big.duration).toBeGreaterThan(small.duration * 3);
    }
  });

  it('slows the winner score ticks down and lands on the duration', () => {
    const pattern = buildHapticPattern({ id: 'winnerScore', durationMs: 3000 });
    const taps = pattern.events.filter((event) => event.type === 'tap');
    const gaps = taps.slice(1).map((tap, index) => tap.at - taps[index].at);

    expect(taps[taps.length - 1].at).toBe(3000);
    expect(gaps[gaps.length - 2]).toBeGreaterThan(gaps[0]);
  });

  it('marks the lead with a double tap', () => {
    const climb = buildHapticPattern({ id: 'climb', places: 3, lead: true });

    expect(climb.priority).toBe(2);
    expect(climb.events.filter((event) => event.at >= 600)).toHaveLength(2);
  });
});

describe('interface cues', () => {
  it('lands the draw flight on its duration, at any speed', () => {
    for (const durationMs of [120, 600, 1200]) {
      const pattern = buildHapticPattern({ id: 'drawFlight', durationMs });
      const landing = pattern.events.find((event) => event.type === 'tap');

      expect(landing?.at).toBe(durationMs);
    }
  });

  it('makes switching on feel different from switching off', () => {
    const on = buildHapticPattern({ id: 'toggle', on: true });
    const off = buildHapticPattern({ id: 'toggle', on: false });

    expect(on.events.length).toBeGreaterThan(off.events.length);
    expect(on.events[0].intensity).toBeGreaterThan(off.events[0].intensity);
  });

  it('keeps per-gesture ticks at the lowest priority', () => {
    for (const id of ['dragSlot', 'dragOver', 'selection', 'snap'] as const) {
      expect(buildHapticPattern({ id }).priority).toBe(0);
    }
    expect(buildHapticPattern({ id: 'sliderTick' }).priority).toBe(0);
  });
});

describe('simple mode', () => {
  it('plays at most one effect for every cue', () => {
    for (const cue of Object.values(SAMPLE_CUES)) {
      const simple = simpleHapticFor(cue);

      if (simple) {
        expect(simpleHapticPattern(simple, 1).events).toHaveLength(1);
      }
    }
  });

  it('keeps jury voting to a tick per award and one knock for the 12', () => {
    expect(simpleHapticFor(SAMPLE_CUES.points)?.effect).toBe('tick');
    expect(simpleHapticFor(SAMPLE_CUES.douzeHit)?.effect).toBe('heavy');
    for (const id of [
      'climb',
      'douzeBloom',
      'nextJury',
      'revealBeat',
      'dragSlot',
      'winnerScore',
    ] as const) {
      expect(simpleHapticFor(SAMPLE_CUES[id])).toBeNull();
    }
  });

  it('lands a drawn country on its landing', () => {
    const simple = simpleHapticFor({ id: 'drawFlight', durationMs: 300 });

    expect(simple).toEqual({ effect: 'click', at: 300 });
    expect(simpleHapticPattern(simple!, 1).events[0].at).toBe(300);
  });

  it('renders to the device effects the Android plugin knows', () => {
    const steps = (effect: 'tick' | 'click' | 'heavy' | 'double') =>
      renderAndroid(simpleHapticPattern({ effect }, 1), 1);

    expect(steps('tick')).toEqual([{ p: 'tick', s: 0.5, at: 0 }]);
    expect(steps('heavy')).toEqual([{ p: 'click', s: 1, at: 0 }]);
    expect(steps('double')[0].p).toBe('doubleClick');
  });
});

describe('renderIos', () => {
  it('steps shaped hums so they do not dim the taps around them', () => {
    const events = renderIos(
      {
        priority: 1,
        events: [
          {
            type: 'hum',
            at: 0,
            duration: 400,
            intensity: 1,
            sharpness: 0.5,
            shape: 'rise',
          },
          { type: 'tap', at: 200, intensity: 1, sharpness: 1 },
        ],
      },
      1,
    );
    const hums = events.filter((event) => event.k === 'c');

    expect(hums).toHaveLength(10);
    expect(hums[hums.length - 1].i).toBeGreaterThan(hums[0].i);
    expect(events.find((event) => event.k === 't')?.i).toBe(1);
  });

  it('scales by strength, drops the imperceptible and sorts by time', () => {
    const events = renderIos(
      {
        priority: 0,
        events: [
          { type: 'tap', at: 100, intensity: 0.8, sharpness: 0.5 },
          { type: 'tap', at: 0, intensity: 0.05, sharpness: 0.5 },
          {
            type: 'tap',
            at: 50,
            intensity: 1,
            sharpness: 0.5,
            only: 'android',
          },
        ],
      },
      0.5,
    );

    expect(events).toEqual([{ k: 't', time: 0.1, i: 0.4, s: 0.5 }]);
  });
});

describe('renderAndroid', () => {
  it('derives primitives from intensity and sharpness', () => {
    expect(androidTapPrimitive(0.9, 0.2)).toBe('thud');
    expect(androidTapPrimitive(0.3, 0.2)).toBe('lowTick');
    expect(androidTapPrimitive(0.2, 0.8)).toBe('tick');
    expect(androidTapPrimitive(0.8, 0.8)).toBe('click');
  });

  it('turns a flat hum into a rumble of low ticks', () => {
    const steps = renderAndroid(
      {
        priority: 1,
        events: [
          {
            type: 'hum',
            at: 0,
            duration: 450,
            intensity: 0.5,
            sharpness: 0.1,
          },
        ],
      },
      1,
    );

    expect(steps).toHaveLength(10);
    expect(steps.every((step) => step.p === 'lowTick')).toBe(true);
  });

  it('keeps the stronger of two heavily overlapping steps', () => {
    const steps = renderAndroid(
      {
        priority: 1,
        events: [
          {
            type: 'hum',
            at: 0,
            duration: 400,
            intensity: 0.3,
            sharpness: 0.3,
            shape: 'rise',
          },
          { type: 'tap', at: 20, intensity: 1, sharpness: 0.9 },
          { type: 'tap', at: 600, intensity: 0.5, sharpness: 0.9 },
        ],
      },
      1,
    );

    expect(steps.map((step) => step.p)).toEqual(['click', 'click']);
    expect(steps[0].at).toBe(20);
  });
});

describe('renderFallback', () => {
  it('demotes presets for a low strength', () => {
    const pattern: HapticPattern = {
      priority: 2,
      events: [],
      fallback: [
        { at: 0, kind: 'heavy' },
        { at: 200, kind: 'light' },
        { at: 400, kind: 'success' },
      ],
    };

    expect(renderFallback(pattern, 1).map((step) => step.kind)).toEqual([
      'heavy',
      'light',
      'success',
    ]);
    expect(renderFallback(pattern, 0.3).map((step) => step.kind)).toEqual([
      'medium',
      'success',
    ]);
  });

  it('spaces derived presets and keeps the stronger one', () => {
    const steps = renderFallback(
      {
        priority: 2,
        events: [
          { type: 'tap', at: 0, intensity: 0.5, sharpness: 0.5 },
          { type: 'tap', at: 30, intensity: 1, sharpness: 0.5 },
          { type: 'tap', at: 300, intensity: 0.3, sharpness: 0.5 },
        ],
      },
      1,
    );

    expect(steps).toEqual([
      { at: 0, kind: 'heavy' },
      { at: 300, kind: 'light' },
    ]);
  });
});

describe('rebasePattern', () => {
  it('moves leading silence out of the pattern', () => {
    const { offset, pattern } = rebasePattern(
      buildHapticPattern({ id: 'douzeBloom', variant: 'hearts' }),
    );

    expect(offset).toBe(120);
    expect(Math.min(...pattern.events.map((event) => event.at))).toBe(0);
  });

  it('leaves patterns that start at once alone', () => {
    const douze = buildHapticPattern({ id: 'douzeHit' });

    expect(rebasePattern(douze)).toEqual({ offset: 0, pattern: douze });
  });
});

describe('shapeLevel', () => {
  it('peaks a swell at 60% and ends low', () => {
    expect(shapeLevel('swell', 0.6)).toBeCloseTo(1);
    expect(shapeLevel('swell', 1)).toBeCloseTo(0.15);
    expect(shapeLevel('rise', 0)).toBeCloseTo(0.15);
    expect(shapeLevel('fall', 0)).toBe(1);
  });
});

describe('admission', () => {
  const pattern = (priority: 0 | 1 | 2 | 3, holdMs: number): HapticPattern => ({
    priority,
    holdMs,
    events: [{ type: 'tap', at: 0, intensity: 1, sharpness: 1 }],
  });

  it('keeps weaker cues out while a stronger one is held', () => {
    const gate: HapticGate = {
      holdUntil: 0,
      holdPriority: -1,
      lastTickAt: -Infinity,
    };

    holdHapticCue(gate, pattern(2, 1000), 0);

    expect(admitHapticCue(gate, 0, 500)).toBe(false);
    expect(admitHapticCue(gate, 2, 500)).toBe(true);
    expect(admitHapticCue(gate, 0, 1000)).toBe(true);
  });

  it('spaces ticks', () => {
    const gate: HapticGate = {
      holdUntil: 0,
      holdPriority: -1,
      lastTickAt: -Infinity,
    };

    holdHapticCue(gate, pattern(0, 0), 100);

    expect(admitHapticCue(gate, 0, 120)).toBe(false);
    expect(admitHapticCue(gate, 1, 120)).toBe(true);
    expect(admitHapticCue(gate, 0, 140)).toBe(true);
  });

  it('measures patterns to the end of their last hum', () => {
    expect(
      patternDuration({
        priority: 0,
        events: [
          { type: 'tap', at: 500, intensity: 1, sharpness: 1 },
          {
            type: 'hum',
            at: 100,
            duration: 600,
            intensity: 1,
            sharpness: 1,
          },
        ],
      }),
    ).toBe(700);
  });
});

describe('getClimbHapticCue', () => {
  it('counts the places of the furthest-climbing receiver', () => {
    expect(
      getClimbHapticCue(
        ['a', 'b', 'c', 'd', 'e'],
        ['a', 'e', 'b', 'c', 'd'],
        { e: true },
        false,
      ),
    ).toEqual({ id: 'climb', places: 3, douze: false, lead: false });
  });

  it('flags a receiver that takes the lead', () => {
    expect(
      getClimbHapticCue(['a', 'b', 'c'], ['c', 'a', 'b'], { c: true }, true),
    ).toEqual({ id: 'climb', places: 2, douze: true, lead: true });
  });

  it('ignores rows that only moved down or did not receive points', () => {
    expect(
      getClimbHapticCue(['a', 'b', 'c'], ['b', 'a', 'c'], { a: true }, false),
    ).toBeNull();
    expect(
      getClimbHapticCue(['a', 'b', 'c'], ['b', 'a', 'c'], {}, false),
    ).toBeNull();
  });
});
