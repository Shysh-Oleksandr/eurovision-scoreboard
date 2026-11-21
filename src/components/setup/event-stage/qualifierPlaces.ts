import type { QualifierTarget } from '@/models';

/** Places `from`–`to` (both included) of a stage go to `targetStageId`. */
export interface PlaceBand {
  targetStageId: string;
  from: number;
  to: number;
}

export type PlaceProblem =
  /** Only one end of the range is filled in. */
  | { kind: 'incomplete'; targetStageId: string; missing: 'first' | 'last' }
  /** The last place comes before the first. */
  | { kind: 'reversed'; targetStageId: string }
  /** Two stages take the same place (`place` is the first shared one). */
  | { kind: 'overlap'; first: string; second: string; place: number }
  /** No stage takes places `from`–`to`, while a later place goes through. */
  | { kind: 'gap'; from: number; to: number };

export interface PlacesSummary {
  /** Complete ranges, in place order. */
  bands: PlaceBand[];
  /** The places after the last band, when the stage's size is known. */
  out: { from: number; to: number } | null;
  problems: PlaceProblem[];
  /** Stages whose fields should be marked invalid. */
  invalidStageIds: Set<string>;
  /** The first place no band takes yet (a hint for the next range). */
  nextFreePlace: number;
  /** A band reaches past the stage's entries (size known). */
  beyondSize: boolean;
}

const isPlace = (value: number | undefined): value is number =>
  typeof value === 'number' && Number.isFinite(value) && value >= 1;

/**
 * Where each place of a stage goes in "Which places" mode, plus what keeps
 * the ranges from saving. Mirrors the rules `useEventStageForm` enforces
 * (complete ranges, from place 1, no gaps, no overlaps), so the editor can
 * name the problem while you type instead of after Save. `size` is the
 * stage's number of entries, or 0 when it isn't known yet.
 */
export const summarizePlaces = (
  targets: QualifierTarget[],
  size: number,
): PlacesSummary => {
  const problems: PlaceProblem[] = [];
  const invalidStageIds = new Set<string>();
  const bands: PlaceBand[] = [];

  targets.forEach(({ targetStageId, minRank, maxRank }) => {
    const hasFrom = isPlace(minRank);
    const hasTo = isPlace(maxRank);

    if (!hasFrom && !hasTo) return;

    if (hasFrom !== hasTo) {
      problems.push({
        kind: 'incomplete',
        targetStageId,
        missing: hasFrom ? 'last' : 'first',
      });
      invalidStageIds.add(targetStageId);

      return;
    }

    if (maxRank! < minRank!) {
      problems.push({ kind: 'reversed', targetStageId });
      invalidStageIds.add(targetStageId);

      return;
    }

    bands.push({ targetStageId, from: minRank!, to: maxRank! });
  });

  bands.sort((a, b) => a.from - b.from || a.to - b.to);

  let expected = 1;
  let reported: PlaceBand | null = null;

  bands.forEach((band) => {
    if (band.from > expected) {
      problems.push({ kind: 'gap', from: expected, to: band.from - 1 });
    } else if (reported && band.from < expected) {
      problems.push({
        kind: 'overlap',
        first: reported.targetStageId,
        second: band.targetStageId,
        place: band.from,
      });
      invalidStageIds.add(reported.targetStageId);
      invalidStageIds.add(band.targetStageId);
    }

    if (band.to + 1 > expected) {
      expected = band.to + 1;
      reported = band;
    }
  });

  const lastPlace = expected - 1;

  return {
    bands,
    out:
      size > 0 && bands.length > 0 && lastPlace < size
        ? { from: lastPlace + 1, to: size }
        : null,
    problems,
    invalidStageIds,
    nextFreePlace: expected,
    beyondSize: size > 0 && lastPlace > size,
  };
};

/** "5" or "1–10". */
export const formatPlaceRange = ({ from, to }: { from: number; to: number }) =>
  from === to ? `${from}` : `${from}–${to}`;
