import type { EventStage, StageVotingMode } from '@/models';
import { StageVotingMode as VM } from '@/models';
import type { PointsItem } from '@/state/generalStore';
import type {
  DetailedPresetPayload,
  PointsSystemSnapshot,
  TotalsPresetPayload,
} from '@/state/votingPresetsStore';
import type { ManualShareTotalsRow } from '@/state/scoreboard/types';
import type { StageVotes, Vote } from '@/state/scoreboard/types';
import type { CompactVote } from '@/types/contestSnapshot';

function decodeTuplesToPointValues(
  tuples: CompactVote[] | undefined,
  savedPoints: PointsSystemSnapshot,
): { countryCode: string; points: number }[] {
  const byId = new Map(savedPoints.map((p) => [p.id, p]));
  if (!tuples?.length) return [];
  const out: { countryCode: string; points: number }[] = [];
  for (const t of tuples) {
    const [countryCode, pointsId] = t;
    const meta = byId.get(pointsId);
    const points = meta?.value ?? 0;
    out.push({ countryCode, points });
  }
  return out;
}

/**
 * Assign distinct point ids from current points system matching each vote's point value.
 */
function assignPointIdsForVoter(
  votes: { countryCode: string; points: number }[],
  pointsSystem: PointsItem[],
): Vote[] {
  const usedIds = new Set<number>();
  const idsByValue = new Map<number, number[]>();
  for (const p of pointsSystem) {
    if (!idsByValue.has(p.value)) idsByValue.set(p.value, []);
    idsByValue.get(p.value)!.push(p.id);
  }

  const result: Vote[] = [];
  for (const v of votes) {
    const candidates = idsByValue.get(v.points);
    if (!candidates?.length) continue;
    const id = candidates.find((cid) => !usedIds.has(cid));
    if (id === undefined) continue;
    usedIds.add(id);
    const p = pointsSystem.find((x) => x.id === id)!;
    result.push({
      countryCode: v.countryCode,
      points: v.points,
      pointsId: id,
      showDouzePointsAnimation: p.showDouzePoints ?? v.points === 12,
    });
  }
  return result;
}

function sourcesForMode(mode: StageVotingMode): Array<'jury' | 'televote' | 'combined'> {
  switch (mode) {
    case VM.JURY_AND_TELEVOTE:
      return ['jury', 'televote'];
    case VM.JURY_ONLY:
      return ['jury'];
    case VM.TELEVOTE_ONLY:
      return ['televote'];
    case VM.COMBINED:
      return ['combined'];
    default:
      return ['jury', 'televote'];
  }
}

function filterVotesForVoter(
  tuples: CompactVote[] | undefined,
  savedPoints: PointsSystemSnapshot,
  participantSet: Set<string>,
  voterCode: string,
): { countryCode: string; points: number }[] {
  return decodeTuplesToPointValues(tuples, savedPoints)
    .filter(
      (x) =>
        x.points > 0 &&
        participantSet.has(x.countryCode) &&
        x.countryCode !== voterCode,
    );
}

/**
 * Clear-then-apply: returns new StageVotes for the current stage from a saved detailed preset.
 */
export function applyDetailedPresetToStageVotes(
  stage: EventStage,
  payload: DetailedPresetPayload,
  currentPointsSystem: PointsItem[],
): Partial<StageVotes> {
  const participantSet = new Set(stage.countries.map((c) => c.code));
  const voterSet = new Set(
    (stage.votingCountries || []).map((v) => v.code),
  );
  const activeSources = new Set(sourcesForMode(stage.votingMode));
  const savedSources = new Set(sourcesForMode(payload.votingMode));

  const out: Partial<StageVotes> = {};

  for (const source of ['jury', 'televote', 'combined'] as const) {
    if (!activeSources.has(source) || !savedSources.has(source)) continue;
    const byVoter = payload.compact[source];
    if (!byVoter) continue;

    const nextByVoter: Record<string, Vote[]> = {};

    for (const [voterCode, tuples] of Object.entries(byVoter)) {
      if (!voterSet.has(voterCode)) continue;
      if (source === 'jury' && voterCode === 'WW') continue;

      const filtered = filterVotesForVoter(
        tuples,
        payload.pointsSystem,
        participantSet,
        voterCode,
      );
      const assigned = assignPointIdsForVoter(filtered, currentPointsSystem);
      if (assigned.length) nextByVoter[voterCode] = assigned;
    }

    if (Object.keys(nextByVoter).length) {
      (out as any)[source] = nextByVoter;
    }
  }

  return out;
}

function fieldsForTotalsMode(
  mode: StageVotingMode,
): Array<'jury' | 'televote' | 'combined'> {
  switch (mode) {
    case VM.JURY_AND_TELEVOTE:
      return ['jury', 'televote'];
    case VM.JURY_ONLY:
      return ['jury'];
    case VM.TELEVOTE_ONLY:
      return ['televote'];
    case VM.COMBINED:
      return ['combined'];
    default:
      return ['jury', 'televote'];
  }
}

/**
 * Clear-then-apply manual totals rows for current participants and voting mode.
 */
export function hasAnyStageVotes(v: Partial<StageVotes> | null | undefined): boolean {
  if (!v) return false;
  for (const source of ['jury', 'televote', 'combined'] as const) {
    const byVoter = v[source];
    if (!byVoter) continue;
    for (const arr of Object.values(byVoter)) {
      if (Array.isArray(arr) && arr.length > 0) return true;
    }
  }
  return false;
}

export function applyTotalsPresetToLocalTotals(
  stage: EventStage,
  payload: TotalsPresetPayload,
): Record<string, ManualShareTotalsRow> {
  const participantSet = new Set(stage.countries.map((c) => c.code));
  const allowed = new Set(fieldsForTotalsMode(stage.votingMode));
  const savedAllowed = new Set(fieldsForTotalsMode(payload.votingMode));

  const out: Record<string, ManualShareTotalsRow> = {};

  for (const [code, row] of Object.entries(payload.rows)) {
    if (!participantSet.has(code)) continue;
    const next: ManualShareTotalsRow = {};
    for (const f of ['jury', 'televote', 'combined'] as const) {
      if (!allowed.has(f) || !savedAllowed.has(f)) continue;
      const val = row[f];
      if (typeof val === 'number' && Number.isFinite(val)) {
        next[f] = val;
      }
    }
    if (Object.keys(next).length) out[code] = next;
  }

  return out;
}
