import { create } from 'zustand';

import { persist } from 'zustand/middleware';

import type { StageVotingMode } from '@/models';
import type { StageVotes } from '@/state/scoreboard/types';
import type { CompactVote } from '@/types/contestSnapshot';

/** Compact stage votes: same shape as contest snapshot encoding */
export type CompactStageVotes = {
  jury?: Record<string, CompactVote[]>;
  televote?: Record<string, CompactVote[]>;
  combined?: Record<string, CompactVote[]>;
};

export type PointsSystemSnapshot = Array<{
  id: number;
  value: number;
  showDouzePoints?: boolean;
}>;

export type DetailedPresetPayload = {
  votingMode: StageVotingMode;
  /** Points system at save time — used to decode compact tuples */
  pointsSystem: PointsSystemSnapshot;
  compact: CompactStageVotes;
};

export type TotalsPresetPayload = {
  votingMode: StageVotingMode;
  rows: Record<string, { jury?: number; televote?: number; combined?: number }>;
};

export type VotingPresetBase = {
  id: string;
  name: string;
  createdAt: string;
  updatedAt: string;
  sourceStageId: string;
  sourceStageName: string;
  sourceContestName: string;
  sourceContestYear: string;
  participantCount: number;
  votingCount: number;
};

export type DetailedVotingPreset = VotingPresetBase & {
  kind: 'detailed';
  payload: DetailedPresetPayload;
};

export type TotalsVotingPreset = VotingPresetBase & {
  kind: 'totals';
  payload: TotalsPresetPayload;
};

const newId = () =>
  typeof crypto !== 'undefined' && crypto.randomUUID
    ? crypto.randomUUID()
    : `${Date.now()}-${Math.random().toString(36).slice(2, 11)}`;

/** Default label: "StageName – ContestName Year" */
export function buildDefaultPresetName(
  stageName: string,
  contestName: string,
  contestYear: string,
): string {
  const y = contestYear?.trim() || '';
  const cn = contestName?.trim() || '';
  const sn = stageName?.trim() || '';

  if (!y && !cn) return sn || 'Preset';
  if (!cn) return `${sn} – ${y}`.trim();

  return `${sn} – ${cn}${y ? ` ${y}` : ''}`.trim();
}

const stripNumericSuffix = (name: string): string => {
  const m = name.match(/^(.*) \((\d+)\)$/);

  if (m) return m[1].trim();

  return name.trim();
};

/**
 * Returns a unique name: base, or "base (1)", "base (2)", … among existing names.
 */
export function ensureUniquePresetName(
  baseName: string,
  existingNames: string[],
): string {
  const base = stripNumericSuffix(baseName);
  const taken = new Set(existingNames.map((n) => n.trim()));

  if (!taken.has(base)) return base;
  let n = 1;
  let candidate = `${base} (${n})`;

  while (taken.has(candidate)) {
    n += 1;
    candidate = `${base} (${n})`;
  }

  return candidate;
}

type VotingPresetsState = {
  detailedPresets: DetailedVotingPreset[];
  totalsPresets: TotalsVotingPreset[];
  createDetailedPreset: (
    preset: Omit<
      DetailedVotingPreset,
      'id' | 'createdAt' | 'updatedAt' | 'kind'
    >,
  ) => DetailedVotingPreset;
  updateDetailedPreset: (
    id: string,
    patch: Partial<
      Pick<DetailedVotingPreset, 'name' | 'payload' | 'updatedAt'>
    > &
      Partial<VotingPresetBase>,
  ) => void;
  deleteDetailedPreset: (id: string) => void;
  createTotalsPreset: (
    preset: Omit<TotalsVotingPreset, 'id' | 'createdAt' | 'updatedAt' | 'kind'>,
  ) => TotalsVotingPreset;
  updateTotalsPreset: (
    id: string,
    patch: Partial<Pick<TotalsVotingPreset, 'name' | 'payload' | 'updatedAt'>> &
      Partial<VotingPresetBase>,
  ) => void;
  deleteTotalsPreset: (id: string) => void;
};

export const useVotingPresetsStore = create<VotingPresetsState>()(
  persist(
    (set) => ({
      detailedPresets: [],
      totalsPresets: [],

      createDetailedPreset: (preset) => {
        const now = new Date().toISOString();
        const row: DetailedVotingPreset = {
          ...preset,
          kind: 'detailed',
          id: newId(),
          createdAt: now,
          updatedAt: now,
        };

        set((s) => ({ detailedPresets: [...s.detailedPresets, row] }));

        return row;
      },

      updateDetailedPreset: (id, patch) => {
        const now = new Date().toISOString();

        set((s) => ({
          detailedPresets: s.detailedPresets.map((p) =>
            p.id === id
              ? {
                  ...p,
                  ...patch,
                  updatedAt: patch.updatedAt ?? now,
                }
              : p,
          ),
        }));
      },

      deleteDetailedPreset: (id) => {
        set((s) => ({
          detailedPresets: s.detailedPresets.filter((p) => p.id !== id),
        }));
      },

      createTotalsPreset: (preset) => {
        const now = new Date().toISOString();
        const row: TotalsVotingPreset = {
          ...preset,
          kind: 'totals',
          id: newId(),
          createdAt: now,
          updatedAt: now,
        };

        set((s) => ({ totalsPresets: [...s.totalsPresets, row] }));

        return row;
      },

      updateTotalsPreset: (id, patch) => {
        const now = new Date().toISOString();

        set((s) => ({
          totalsPresets: s.totalsPresets.map((p) =>
            p.id === id
              ? {
                  ...p,
                  ...patch,
                  updatedAt: patch.updatedAt ?? now,
                }
              : p,
          ),
        }));
      },

      deleteTotalsPreset: (id) => {
        set((s) => ({
          totalsPresets: s.totalsPresets.filter((p) => p.id !== id),
        }));
      },
    }),
    {
      name: 'voting-presets-storage',
      version: 1,
    },
  ),
);

export function encodeStageVotesToCompact(
  votes: Record<string, any> | undefined,
  source: 'jury' | 'televote' | 'combined',
): Record<string, CompactVote[]> | undefined {
  const byVoter = votes?.[source];

  if (!byVoter || typeof byVoter !== 'object') return undefined;
  const out: Record<string, CompactVote[]> = {};

  for (const [voterCode, list] of Object.entries(byVoter)) {
    if (!Array.isArray(list)) continue;
    out[voterCode] = list.map((v: any) => [
      v.countryCode as string,
      v.pointsId as number,
    ]);
  }

  return Object.keys(out).length ? out : undefined;
}

/** Build compact payload from partial StageVotes (runtime shape) */
export function buildDetailedPresetPayload(
  votes: Partial<StageVotes> | null | undefined,
  votingMode: StageVotingMode,
  pointsSystem: PointsSystemSnapshot,
): DetailedPresetPayload {
  const v = votes || {};
  const compact: CompactStageVotes = {};
  const j = encodeStageVotesToCompact(v as any, 'jury');
  const t = encodeStageVotesToCompact(v as any, 'televote');
  const c = encodeStageVotesToCompact(v as any, 'combined');

  if (j) compact.jury = j;
  if (t) compact.televote = t;
  if (c) compact.combined = c;

  return {
    votingMode,
    pointsSystem,
    compact,
  };
}
