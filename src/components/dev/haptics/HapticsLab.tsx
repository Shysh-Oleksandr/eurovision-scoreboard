'use client';
import React, { useCallback, useEffect, useRef, useState } from 'react';

import Link from 'next/link';

import {
  buildHapticPattern,
  createHapticHeartbeat,
  getHapticsStatus,
  playHaptic,
  playHapticPattern,
  setHapticsModeOverride,
  stopHaptics,
  subscribeHapticLog,
  type HapticCue,
  type HapticHeartbeat,
  type HapticLogEntry,
  type HapticPattern,
  type HapticsStatus,
} from '@/native/haptics';
import { useGeneralStore } from '@/state/generalStore';

/**
 * Dev-only Haptics lab (docs/haptics.md §5): every cue with its parameters,
 * the board's sequences at their real timings, a pattern editor to try a
 * changed pattern before copying it into native/haptics/cues.ts, and a log
 * of what played or was dropped by the priorities.
 */

interface ParamSpec {
  key: string;
  label: string;
  min: number;
  max: number;
  step: number;
  initial: number;
}

interface LabCue {
  key: string;
  label: string;
  note: string;
  params?: ParamSpec[];
  build: (values: Record<string, number>) => HapticCue;
}

const flag = (key: string, label: string): ParamSpec => ({
  key,
  label,
  min: 0,
  max: 1,
  step: 1,
  initial: 0,
});

const GROUPS: { title: string; cues: LabCue[] }[] = [
  {
    title: 'Jury votes',
    cues: [
      {
        key: 'points',
        label: 'Points',
        note: 'A jury award below the douze, graded by value.',
        params: [
          {
            key: 'points',
            label: 'Points',
            min: 1,
            max: 10,
            step: 1,
            initial: 8,
          },
        ],
        build: (v) => ({ id: 'points', points: v.points, maxPoints: 12 }),
      },
      {
        key: 'pointsFlurry',
        label: 'Points flurry',
        note: 'Grouped points or a random jury.',
        params: [
          {
            key: 'count',
            label: 'Awards',
            min: 2,
            max: 10,
            step: 1,
            initial: 9,
          },
          flag('douze', 'Ends with 12'),
        ],
        build: (v) => ({
          id: 'pointsFlurry',
          values: [1, 2, 3, 4, 5, 6, 7, 8, 10].slice(-v.count),
          maxPoints: 12,
          endsWithDouze: v.douze === 1,
        }),
      },
      {
        key: 'douzeHit',
        label: 'Douze hit',
        note: 'The 12 lands on the row.',
        build: () => ({ id: 'douzeHit' }),
      },
      {
        key: 'nextJury',
        label: 'Next jury',
        note: 'The board clears: a page turn.',
        build: () => ({ id: 'nextJury' }),
      },
      {
        key: 'votingRush',
        label: 'Finish randomly',
        note: 'Everything left at once.',
        build: () => ({ id: 'votingRush' }),
      },
      {
        key: 'undo',
        label: 'Undo',
        note: 'A short rewind.',
        build: () => ({ id: 'undo' }),
      },
    ],
  },
  {
    title: 'Board',
    cues: [
      {
        key: 'climb',
        label: 'Climb',
        note: 'The receiving row moves up.',
        params: [
          {
            key: 'places',
            label: 'Places',
            min: 1,
            max: 20,
            step: 1,
            initial: 5,
          },
          flag('douze', 'Douze'),
          flag('lead', 'Takes the lead'),
        ],
        build: (v) => ({
          id: 'climb',
          places: v.places,
          douze: v.douze === 1,
          lead: v.lead === 1,
        }),
      },
      {
        key: 'douzeBloomHearts',
        label: 'Douze hearts',
        note: 'The hearts grid appears.',
        build: () => ({ id: 'douzeBloom', variant: 'hearts' }),
      },
      {
        key: 'douzeBloomSweep',
        label: 'Douze parallelograms',
        note: 'The 2023-style sweep appears.',
        build: () => ({ id: 'douzeBloom', variant: 'sweep' }),
      },
    ],
  },
  {
    title: 'Televote',
    cues: [
      {
        key: 'televote',
        label: 'Televote',
        note: 'Share of the most a country could get.',
        params: [
          {
            key: 'share',
            label: 'Share',
            min: 0,
            max: 0.8,
            step: 0.05,
            initial: 0.3,
          },
        ],
        build: (v) => ({ id: 'televote', share: v.share }),
      },
      {
        key: 'nulPoints',
        label: 'Nul points',
        note: 'Zero from the public.',
        build: () => ({ id: 'nulPoints' }),
      },
    ],
  },
  {
    title: 'Jury scale countdown',
    cues: [
      {
        key: 'scaleStep',
        label: 'Scale step',
        note: 'One value from every jury.',
        params: [
          {
            key: 'recipients',
            label: 'Recipients',
            min: 1,
            max: 12,
            step: 1,
            initial: 8,
          },
          {
            key: 'share',
            label: 'Value / 10',
            min: 0.1,
            max: 1,
            step: 0.1,
            initial: 0.5,
          },
        ],
        build: (v) => ({
          id: 'scaleStep',
          recipients: v.recipients,
          share: v.share,
        }),
      },
      {
        key: 'spokespersonDouze',
        label: 'Spokesperson 12',
        note: 'One spokesperson’s douze.',
        build: () => ({ id: 'spokespersonDouze' }),
      },
    ],
  },
  {
    title: 'Qualifiers',
    cues: [
      {
        key: 'qualifierCards',
        label: 'Candidate cards',
        note: 'The split screen slides in.',
        params: [
          { key: 'count', label: 'Cards', min: 2, max: 6, step: 1, initial: 3 },
        ],
        build: (v) => ({ id: 'qualifierCards', count: v.count }),
      },
      {
        key: 'qualifierLockIn',
        label: 'Lock-in',
        note: 'A qualifier is picked.',
        build: () => ({ id: 'qualifierLockIn' }),
      },
      {
        key: 'nonQualifiers',
        label: 'Non-qualifiers',
        note: 'The rest didn’t make it.',
        build: () => ({ id: 'nonQualifiers' }),
      },
    ],
  },
  {
    title: 'Final televote reveal',
    cues: [
      {
        key: 'revealBeat',
        label: 'Heartbeat',
        note: 'One beat; closeness to the mark.',
        params: [
          {
            key: 'closeness',
            label: 'Closeness',
            min: 0,
            max: 1,
            step: 0.1,
            initial: 0.5,
          },
        ],
        build: (v) => ({ id: 'revealBeat', closeness: v.closeness }),
      },
      {
        key: 'revealCross',
        label: 'Crosses the mark',
        note: 'The hit and the surge.',
        build: () => ({ id: 'revealCross' }),
      },
      {
        key: 'revealFall',
        label: 'Falls short',
        note: 'The fill stops below the mark.',
        build: () => ({ id: 'revealFall' }),
      },
      {
        key: 'revealHold',
        label: 'Leader holds',
        note: 'Gold flash on the leader.',
        build: () => ({ id: 'revealHold' }),
      },
      {
        key: 'revealWinnerFlash',
        label: 'New winner flash',
        note: 'Gold flash on the last country.',
        build: () => ({ id: 'revealWinnerFlash' }),
      },
    ],
  },
  {
    title: 'Winner',
    cues: [
      {
        key: 'winnerFireworks',
        label: 'Fireworks',
        note: 'With the confetti.',
        build: () => ({ id: 'winnerFireworks' }),
      },
      {
        key: 'winnerReveal',
        label: 'Modal ta-da',
        note: 'The winner card springs in.',
        build: () => ({ id: 'winnerReveal' }),
      },
      {
        key: 'winnerScore',
        label: 'Score count',
        note: 'Ticks that slow with the count.',
        params: [
          {
            key: 'duration',
            label: 'Duration ms',
            min: 1000,
            max: 5000,
            step: 500,
            initial: 3000,
          },
        ],
        build: (v) => ({ id: 'winnerScore', durationMs: v.duration }),
      },
    ],
  },
  {
    title: 'Event Setup',
    cues: [
      {
        key: 'dragLift',
        label: 'Lift',
        note: 'A tile or row is picked up.',
        build: () => ({ id: 'dragLift' }),
      },
      {
        key: 'dragOver',
        label: 'Enter a zone',
        note: 'Over another stage, the pool, a group.',
        build: () => ({ id: 'dragOver' }),
      },
      {
        key: 'dragSlot',
        label: 'Pass a slot',
        note: 'Sorted lists: each slot passed.',
        build: () => ({ id: 'dragSlot' }),
      },
      {
        key: 'dragBoundary',
        label: 'Cross the halves',
        note: 'The running order’s divider.',
        build: () => ({ id: 'dragBoundary' }),
      },
      {
        key: 'dragDrop',
        label: 'Drop',
        note: 'Dropped where it changes something.',
        build: () => ({ id: 'dragDrop' }),
      },
      {
        key: 'dragCancel',
        label: 'Cancel',
        note: 'Back where it came from.',
        build: () => ({ id: 'dragCancel' }),
      },
      {
        key: 'shuffle',
        label: 'Shuffle',
        note: 'Dice in a cup: shuffle, draw halves.',
        build: () => ({ id: 'shuffle' }),
      },
      {
        key: 'sortSweep',
        label: 'Sort',
        note: 'A–Z, Z–A, reset.',
        build: () => ({ id: 'sortSweep' }),
      },
      {
        key: 'curtainUp',
        label: 'Stage start',
        note: 'The board rises in.',
        build: () => ({ id: 'curtainUp' }),
      },
    ],
  },
  {
    title: 'Allocation draw',
    cues: [
      {
        key: 'drawPot',
        label: 'Pot',
        note: 'A pot becomes the active one.',
        build: () => ({ id: 'drawPot' }),
      },
      {
        key: 'drawPick',
        label: 'Pick',
        note: 'Out of the pot into the spotlight.',
        params: [
          {
            key: 'duration',
            label: 'Duration ms',
            min: 100,
            max: 1100,
            step: 50,
            initial: 550,
          },
        ],
        build: (v) => ({ id: 'drawPick', durationMs: v.duration }),
      },
      {
        key: 'drawChip',
        label: 'Chip',
        note: 'The semi-final or half chip.',
        build: () => ({ id: 'drawChip' }),
      },
      {
        key: 'drawFlight',
        label: 'Flight and landing',
        note: 'To the slot (0.6 s at 1×).',
        params: [
          {
            key: 'duration',
            label: 'Duration ms',
            min: 100,
            max: 1200,
            step: 50,
            initial: 600,
          },
        ],
        build: (v) => ({ id: 'drawFlight', durationMs: v.duration }),
      },
      {
        key: 'drawDone',
        label: 'Done',
        note: 'Everyone is drawn.',
        build: () => ({ id: 'drawDone' }),
      },
    ],
  },
  {
    title: 'Controls',
    cues: [
      {
        key: 'selection',
        label: 'Selection',
        note: 'Tabs and segmented controls.',
        build: () => ({ id: 'selection' }),
      },
      {
        key: 'sliderTick',
        label: 'Slider step',
        note: 'Per step; firmer at the ends.',
        params: [flag('edge', 'At an end')],
        build: (v) => ({ id: 'sliderTick', edge: v.edge === 1 }),
      },
      {
        key: 'toggle',
        label: 'Switch',
        note: 'Switches and checkboxes.',
        params: [{ ...flag('on', 'On'), initial: 1 }],
        build: (v) => ({ id: 'toggle', on: v.on === 1 }),
      },
      {
        key: 'snap',
        label: 'Snap',
        note: 'Graphics studio guides, straight rotation.',
        build: () => ({ id: 'snap' }),
      },
    ],
  },
  {
    title: 'Results',
    cues: [
      {
        key: 'success',
        label: 'Success',
        note: 'Every success toast.',
        build: () => ({ id: 'success' }),
      },
      {
        key: 'warning',
        label: 'Warning',
        note: 'A confirmation opens, warning toasts.',
        build: () => ({ id: 'warning' }),
      },
      {
        key: 'error',
        label: 'Error',
        note: 'Every error toast.',
        build: () => ({ id: 'error' }),
      },
    ],
  },
];

const ALL_CUES = GROUPS.flatMap((group) => group.cues);

const initialValues = (cue: LabCue) =>
  Object.fromEntries(
    (cue.params ?? []).map((param) => [param.key, param.initial]),
  );

/** The board's sequences, at the timings measured in the app. */
const SEQUENCES: {
  label: string;
  note: string;
  steps: [number, HapticCue][];
}[] = [
  {
    label: 'Douze, teleport themes',
    note: 'Tap at 0, the row moves at 1 s, the hearts at 2.08 s.',
    steps: [
      [0, { id: 'douzeHit' }],
      [1000, { id: 'climb', places: 9, douze: true, lead: true }],
      [2080, { id: 'douzeBloom', variant: 'hearts' }],
    ],
  },
  {
    label: 'Douze, flip themes',
    note: 'The overlay mounts with the award; the row moves at 1 s.',
    steps: [
      [0, { id: 'douzeHit' }],
      [16, { id: 'douzeBloom', variant: 'sweep' }],
      [1000, { id: 'climb', places: 9, douze: true, lead: true }],
    ],
  },
  {
    label: 'A jury, presentation pace',
    note: '1 to 10 points 1.2 s apart, rows moving 0.5 s after, then the 12.',
    steps: [
      ...[1, 2, 3, 4, 5, 6, 7, 8, 10].flatMap(
        (points, index): [number, HapticCue][] => [
          [index * 1200, { id: 'points', points, maxPoints: 12 }],
          [index * 1200 + 500, { id: 'climb', places: (index % 3) + 1 }],
        ],
      ),
      [10800, { id: 'douzeHit' }],
      [11800, { id: 'climb', places: 6, douze: true, lead: true }],
      [12880, { id: 'douzeBloom', variant: 'hearts' }],
      [17000, { id: 'nextJury' }],
    ],
  },
  {
    label: 'Winner celebration',
    note: 'Confetti, the modal at 3 s, its count from 4.4 s.',
    steps: [
      [0, { id: 'winnerFireworks' }],
      [3080, { id: 'winnerReveal' }],
      [4380, { id: 'winnerScore', durationMs: 3000 }],
    ],
  },
  {
    label: 'Drag a tile across the lineup',
    note: 'Lift, three zones, the drop.',
    steps: [
      [0, { id: 'dragLift' }],
      [500, { id: 'dragOver' }],
      [900, { id: 'dragOver' }],
      [1300, { id: 'dragOver' }],
      [1800, { id: 'dragDrop' }],
    ],
  },
  {
    label: 'Reorder across the halves',
    note: 'Slots, the divider, the drop.',
    steps: [
      [0, { id: 'dragLift' }],
      [250, { id: 'dragSlot' }],
      [400, { id: 'dragSlot' }],
      [550, { id: 'dragSlot' }],
      [700, { id: 'dragBoundary' }],
      [850, { id: 'dragSlot' }],
      [1200, { id: 'dragDrop' }],
    ],
  },
  {
    label: 'Draw one country (1×)',
    note: 'Pick, chips, flight to the slot, then done.',
    steps: [
      [0, { id: 'drawPick', durationMs: 550 }],
      [880, { id: 'drawChip' }],
      [1330, { id: 'drawChip' }],
      [2080, { id: 'drawFlight', durationMs: 600 }],
      [3500, { id: 'drawDone' }],
    ],
  },
];

const REVEAL_PHASE_MS = 9000;

const formatResult = (entry: HapticLogEntry) =>
  entry.result === 'played' ? '' : ` — ${entry.result}`;

const HapticsLab: React.FC = () => {
  const enableHaptics = useGeneralStore(
    (state) => state.settings.enableHaptics,
  );
  const hapticsStrength = useGeneralStore(
    (state) => state.settings.hapticsStrength,
  );
  const setSettings = useGeneralStore((state) => state.setSettings);

  const [status, setStatus] = useState<HapticsStatus | null>(null);
  const [modeChoice, setModeChoice] = useState<'auto' | 'full' | 'simple'>(
    'auto',
  );

  // Leaving the lab drops a forced mode.
  useEffect(() => () => setHapticsModeOverride(null), []);
  const [selectedKey, setSelectedKey] = useState(ALL_CUES[0].key);
  const [values, setValues] = useState<Record<string, Record<string, number>>>(
    () =>
      Object.fromEntries(ALL_CUES.map((cue) => [cue.key, initialValues(cue)])),
  );
  const [editorText, setEditorText] = useState('');
  const [isEditorDirty, setIsEditorDirty] = useState(false);
  const [editorError, setEditorError] = useState<string | null>(null);
  const [log, setLog] = useState<
    (HapticLogEntry & { n: number; sinceStart: number })[]
  >([]);

  const timersRef = useRef<ReturnType<typeof setTimeout>[]>([]);
  const heartbeatRef = useRef<HapticHeartbeat | null>(null);
  const originRef = useRef(0);
  const counterRef = useRef(0);

  const selectedCue =
    ALL_CUES.find((cue) => cue.key === selectedKey) ?? ALL_CUES[0];
  const cueFor = useCallback(
    (cue: LabCue) => cue.build(values[cue.key] ?? initialValues(cue)),
    [values],
  );

  useEffect(() => {
    originRef.current = performance.now();
    void getHapticsStatus().then(setStatus);

    return subscribeHapticLog((entry) => {
      counterRef.current += 1;
      const logged = {
        ...entry,
        n: counterRef.current,
        // Relative to the last Play / sequence start.
        sinceStart: Math.round(entry.time - originRef.current),
      };

      setLog((current) => [logged, ...current].slice(0, 60));
    });
  }, []);

  useEffect(() => {
    if (isEditorDirty) return;
    setEditorText(
      JSON.stringify(
        buildHapticPattern(cueFor(selectedCue)),
        (_key, value: unknown) =>
          typeof value === 'number' ? Math.round(value * 1000) / 1000 : value,
        2,
      ),
    );
  }, [selectedCue, cueFor, isEditorDirty]);

  const stopAll = useCallback(() => {
    timersRef.current.forEach(clearTimeout);
    timersRef.current = [];
    heartbeatRef.current?.stop();
    heartbeatRef.current = null;
    stopHaptics();
  }, []);

  useEffect(() => stopAll, [stopAll]);

  const runSequence = (steps: [number, HapticCue][]) => {
    stopAll();
    originRef.current = performance.now();
    timersRef.current = steps.map(([at, cue]) =>
      setTimeout(() => playHaptic(cue), at),
    );
  };

  const runReveal = (isWin: boolean) => {
    stopAll();
    originRef.current = performance.now();

    const startedAt = performance.now();
    const reach = isWin ? 1 : 0.82;
    const heartbeat = createHapticHeartbeat(() =>
      Math.min(
        reach,
        ((performance.now() - startedAt) / REVEAL_PHASE_MS) * reach,
      ),
    );

    heartbeatRef.current = heartbeat;
    heartbeat.start();
    timersRef.current = [
      setTimeout(() => {
        heartbeat.stop();
        playHaptic({ id: isWin ? 'revealCross' : 'revealFall' });
      }, REVEAL_PHASE_MS),
      setTimeout(
        () => playHaptic({ id: isWin ? 'revealWinnerFlash' : 'revealHold' }),
        REVEAL_PHASE_MS + 1000,
      ),
      setTimeout(
        () => playHaptic({ id: 'winnerFireworks' }),
        REVEAL_PHASE_MS + 1900,
      ),
    ];
  };

  const playEditor = () => {
    try {
      const pattern = JSON.parse(editorText) as HapticPattern;

      if (!Array.isArray(pattern.events)) throw new Error('No events array');
      setEditorError(null);
      originRef.current = performance.now();
      playHapticPattern(pattern, `edited ${selectedCue.key}`);
    } catch (error) {
      setEditorError(error instanceof Error ? error.message : String(error));
    }
  };

  const copyEditor = () => {
    void navigator.clipboard?.writeText(editorText).catch(() => undefined);
  };

  const setParam = (cue: LabCue, key: string, value: number) => {
    setValues((current) => ({
      ...current,
      [cue.key]: { ...current[cue.key], [key]: value },
    }));
  };

  const statusText = !status
    ? 'Checking…'
    : status.backend === 'plugin'
    ? `DouzeHaptics on ${status.platform}${
        status.capabilities?.primitives
          ? ` · primitives: ${
              status.capabilities.primitives.join(', ') || 'none'
            }`
          : ''
      }`
    : status.backend === 'fallback'
    ? '@capacitor/haptics presets (no DouzeHaptics plugin in this build)'
    : `No haptics (${status.reason ?? 'unknown'}). Cues still show in the log.`;
  const modeText = status
    ? ` · ${status.mode === 'simple' ? 'simple mode' : 'full patterns'}`
    : '';

  return (
    <div className="min-h-screen bg-[#0b1033] text-white pt-[calc(var(--safe-top)+16px)] pb-[calc(var(--safe-bottom)+24px)]">
      <div className="mx-auto flex max-w-2xl flex-col gap-5 px-4">
        <header className="flex items-start justify-between gap-3">
          <div>
            <h1 className="text-2xl font-bold">Haptics lab</h1>
            <p className="mt-1 text-sm text-white/60">
              {statusText}
              {modeText}
            </p>
          </div>
          <Link
            href="/"
            className="shrink-0 rounded-md bg-white/10 px-3 py-2 text-sm font-semibold"
          >
            Back to the app
          </Link>
        </header>

        <section className="flex flex-col gap-3 rounded-xl bg-white/5 p-4">
          <label className="flex items-center justify-between gap-3 text-sm font-semibold">
            Haptics on
            <input
              type="checkbox"
              className="h-5 w-5"
              checked={enableHaptics}
              onChange={(event) =>
                setSettings({ enableHaptics: event.target.checked })
              }
            />
          </label>
          <label className="flex flex-col gap-1 text-sm font-semibold">
            Strength {hapticsStrength.toFixed(1)}
            <input
              type="range"
              min={0.3}
              max={1}
              step={0.1}
              value={hapticsStrength}
              onChange={(event) =>
                setSettings({ hapticsStrength: Number(event.target.value) })
              }
            />
          </label>
          <div className="flex flex-col gap-1 text-sm font-semibold">
            Mode
            <div className="grid grid-cols-3 gap-2">
              {(['auto', 'full', 'simple'] as const).map((choice) => (
                <button
                  key={choice}
                  type="button"
                  onClick={() => {
                    setModeChoice(choice);
                    setHapticsModeOverride(choice === 'auto' ? null : choice);
                    void getHapticsStatus().then(setStatus);
                  }}
                  className={`rounded-lg py-2 ${
                    modeChoice === choice ? 'bg-white/30' : 'bg-white/10'
                  }`}
                >
                  {choice === 'auto' ? 'This device' : choice}
                </button>
              ))}
            </div>
            <span className="text-xs font-normal text-white/50">
              Simple: one built-in effect per moment, none for the busy ones
              (Android without rich haptics gets it automatically).
            </span>
          </div>
          <button
            type="button"
            onClick={stopAll}
            className="rounded-lg bg-white/10 py-2 text-sm font-semibold"
          >
            Stop everything
          </button>
        </section>

        <section className="flex flex-col gap-2">
          <h2 className="text-lg font-bold">Sequences</h2>
          {SEQUENCES.map((sequence) => (
            <button
              key={sequence.label}
              type="button"
              onClick={() => runSequence(sequence.steps)}
              className="rounded-xl bg-white/10 px-4 py-3 text-left active:bg-white/20"
            >
              <span className="block font-semibold">{sequence.label}</span>
              <span className="block text-xs text-white/60">
                {sequence.note}
              </span>
            </button>
          ))}
          <div className="grid grid-cols-2 gap-2">
            <button
              type="button"
              onClick={() => runReveal(true)}
              className="rounded-xl bg-white/10 px-4 py-3 text-left active:bg-white/20"
            >
              <span className="block font-semibold">Final reveal: wins</span>
              <span className="block text-xs text-white/60">
                9 s heartbeat, the cross, the flash.
              </span>
            </button>
            <button
              type="button"
              onClick={() => runReveal(false)}
              className="rounded-xl bg-white/10 px-4 py-3 text-left active:bg-white/20"
            >
              <span className="block font-semibold">Final reveal: short</span>
              <span className="block text-xs text-white/60">
                Stops at 82%, the fall, the leader.
              </span>
            </button>
          </div>
        </section>

        {GROUPS.map((group) => (
          <section key={group.title} className="flex flex-col gap-2">
            <h2 className="text-lg font-bold">{group.title}</h2>
            {group.cues.map((cue) => {
              const isSelected = cue.key === selectedKey;

              return (
                <div
                  key={cue.key}
                  className={`rounded-xl p-3 ${
                    isSelected
                      ? 'bg-white/15 ring-1 ring-white/40'
                      : 'bg-white/5'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <button
                      type="button"
                      onClick={() => {
                        setSelectedKey(cue.key);
                        setIsEditorDirty(false);
                        originRef.current = performance.now();
                        playHaptic(cueFor(cue));
                      }}
                      className="min-w-[96px] rounded-lg bg-white/15 px-3 py-3 text-sm font-semibold active:bg-white/30"
                    >
                      Play
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setSelectedKey(cue.key);
                        setIsEditorDirty(false);
                      }}
                      className="min-w-0 flex-1 text-left"
                    >
                      <span className="block font-semibold">{cue.label}</span>
                      <span className="block text-xs text-white/60">
                        {cue.note}
                      </span>
                    </button>
                  </div>
                  {cue.params?.map((param) => {
                    const value = values[cue.key]?.[param.key] ?? param.initial;

                    return (
                      <label
                        key={param.key}
                        className="mt-2 flex items-center gap-3 text-xs text-white/80"
                      >
                        <span className="w-28 shrink-0">
                          {param.label}: {value}
                        </span>
                        <input
                          type="range"
                          className="flex-1"
                          min={param.min}
                          max={param.max}
                          step={param.step}
                          value={value}
                          onChange={(event) =>
                            setParam(cue, param.key, Number(event.target.value))
                          }
                        />
                      </label>
                    );
                  })}
                </div>
              );
            })}
          </section>
        ))}

        <section className="flex flex-col gap-2">
          <h2 className="text-lg font-bold">Pattern: {selectedCue.label}</h2>
          <p className="text-xs text-white/60">
            Times in ms, intensity and sharpness 0–1. Edit and play; copy the
            result into native/haptics/cues.ts.
          </p>
          <textarea
            value={editorText}
            onChange={(event) => {
              setEditorText(event.target.value);
              setIsEditorDirty(true);
            }}
            spellCheck={false}
            className="h-72 rounded-lg bg-black/40 p-3 font-mono text-xs"
          />
          {editorError && <p className="text-xs text-red-300">{editorError}</p>}
          <div className="grid grid-cols-3 gap-2">
            <button
              type="button"
              onClick={playEditor}
              className="rounded-lg bg-white/15 py-2 text-sm font-semibold"
            >
              Play edited
            </button>
            <button
              type="button"
              onClick={() => setIsEditorDirty(false)}
              className="rounded-lg bg-white/10 py-2 text-sm font-semibold"
            >
              Reset
            </button>
            <button
              type="button"
              onClick={copyEditor}
              className="rounded-lg bg-white/10 py-2 text-sm font-semibold"
            >
              Copy
            </button>
          </div>
        </section>

        <section className="flex flex-col gap-2">
          <h2 className="text-lg font-bold">Log</h2>
          <ol className="flex flex-col gap-1 font-mono text-xs text-white/80">
            {log.map((entry) => (
              <li key={entry.n}>
                +{entry.sinceStart}ms {entry.label} p{entry.priority}{' '}
                {Math.round(entry.durationMs)}ms
                {formatResult(entry)}
              </li>
            ))}
          </ol>
        </section>
      </div>
    </div>
  );
};

export default HapticsLab;
