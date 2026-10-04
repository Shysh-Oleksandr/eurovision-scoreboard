import { create } from 'zustand';

import { devtools, persist } from 'zustand/middleware';

import {
  createOfficialRules,
  DrawRules,
  OFFICIAL_RULES,
  OrderMode,
} from './allocationDraw/types';

/** Keeps only the rule keys that still exist (older builds persisted a draw-code rule). */
const sanitizeRules = (rules: Partial<DrawRules> | undefined): DrawRules => {
  const out = createOfficialRules();

  (Object.keys(OFFICIAL_RULES) as Array<keyof DrawRules>).forEach((key) => {
    const value = rules?.[key];

    if (value !== undefined) {
      (out as unknown as Record<string, unknown>)[key] = value;
    }
  });

  return out;
};

/** What a finished draw left on a stage; shown as the "Drawn" chip while the membership still matches. */
export interface DrawnStageInfo {
  code: string;
  order: OrderMode;
  /** Sorted participant codes at the time of the draw. */
  members: string[];
  /** Pre-qualified countries drawn to vote in this stage. */
  voters: string[];
}

export interface AllocationDrawValues {
  /** Draw mode is on in the Event Setup line-up. */
  enabled: boolean;
  /** Where each waiting country came from (stage id or NOT_PARTICIPATING), for "Put them back". */
  waitingFrom: Record<string, string>;
  /** Pre-qualified "Votes in" pins: country code → stage id. */
  votesIn: Record<string, string>;
  rules: DrawRules;
  drawn: Record<string, DrawnStageInfo>;
}

interface AllocationDrawActions {
  setEnabled: (enabled: boolean) => void;
  setRules: (patch: Partial<DrawRules>) => void;
  resetRules: () => void;
  setVotesIn: (code: string, stageId: string | null) => void;
  clearVotesIn: () => void;
  rememberWaitingFrom: (entries: Record<string, string>) => void;
  clearWaitingFrom: () => void;
  setDrawn: (drawn: Record<string, DrawnStageInfo>) => void;
  /** Replace the whole persisted state (contest load) or reset it (year change). */
  hydrate: (values: Partial<AllocationDrawValues> | null) => void;
  reset: () => void;
}

export type AllocationDrawState = AllocationDrawValues & AllocationDrawActions;

export const initialAllocationDrawValues = (): AllocationDrawValues => ({
  enabled: false,
  waitingFrom: {},
  votesIn: {},
  rules: createOfficialRules(),
  drawn: {},
});

/**
 * Allocation-draw state of the Event Setup: draw mode, pins, rules and what a
 * finished draw left behind. Persisted next to `eventAssignments`; the waiting
 * countries themselves live in `eventAssignments` as `TO_BE_DRAWN`.
 */
export const useAllocationDrawStore = create<AllocationDrawState>()(
  devtools(
    persist(
      (set) => ({
        ...initialAllocationDrawValues(),

        setEnabled: (enabled) => set({ enabled }, undefined, 'setEnabled'),

        setRules: (patch) =>
          set(
            (state) => ({ rules: { ...state.rules, ...patch } }),
            undefined,
            'setRules',
          ),

        resetRules: () =>
          set({ rules: createOfficialRules() }, undefined, 'resetRules'),

        setVotesIn: (code, stageId) =>
          set(
            (state) => {
              const votesIn = { ...state.votesIn };

              if (stageId) votesIn[code] = stageId;
              else delete votesIn[code];

              return { votesIn };
            },
            undefined,
            'setVotesIn',
          ),

        clearVotesIn: () => set({ votesIn: {} }, undefined, 'clearVotesIn'),

        rememberWaitingFrom: (entries) =>
          set(
            (state) => ({ waitingFrom: { ...state.waitingFrom, ...entries } }),
            undefined,
            'rememberWaitingFrom',
          ),

        clearWaitingFrom: () =>
          set({ waitingFrom: {} }, undefined, 'clearWaitingFrom'),

        setDrawn: (drawn) => set({ drawn }, undefined, 'setDrawn'),

        hydrate: (values) =>
          set(
            {
              ...initialAllocationDrawValues(),
              ...(values ?? {}),
              rules: sanitizeRules(values?.rules),
            },
            undefined,
            'hydrate',
          ),

        reset: () => set(initialAllocationDrawValues(), undefined, 'reset'),
      }),
      {
        name: 'allocation-draw-storage',
        partialize: (state) => ({
          enabled: state.enabled,
          waitingFrom: state.waitingFrom,
          votesIn: state.votesIn,
          rules: state.rules,
          drawn: state.drawn,
        }),
        merge: (persisted, current) => {
          const p = (persisted ?? {}) as Partial<AllocationDrawValues>;

          return {
            ...current,
            ...p,
            rules: sanitizeRules(p.rules),
          };
        },
      },
    ),
    {
      name: 'allocation-draw-store',
      enabled: process.env.NODE_ENV === 'development',
    },
  ),
);

/** A stage's "Drawn" chip is valid only while its membership is unchanged. */
export const isDrawnInfoCurrent = (
  info: DrawnStageInfo | undefined,
  currentCodes: readonly string[],
): boolean => {
  if (!info) return false;
  if (info.members.length !== currentCodes.length) return false;

  const sorted = [...currentCodes].sort();

  return info.members.every((code, i) => code === sorted[i]);
};
