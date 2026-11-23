/**
 * "Share the draw": the semi-finals a draw produced, as the rows of the
 * share image's draw element (graphics/model/design.ts `drawSemiSchema`).
 * Two sources: a finished plan in the draw window (before Apply), and the
 * line-up after Apply, for the semis that still hold the drawn countries.
 * Both list a half's countries in the order they were drawn, so the image
 * looks the same before and after Apply.
 */
import type { DrawEntry, DrawSemi } from '@/graphics/model/design';
import type {
  DrawInput,
  DrawPlan,
  OrderMode,
} from '@/state/allocationDraw/types';
import {
  DrawnStageInfo,
  isDrawnInfoCurrent,
} from '@/state/allocationDrawStore';

export interface DrawShareData {
  order: OrderMode;
  semis: DrawSemi[];
}

export type DrawCountryLookup = (
  code: string,
) => { name: string; flag?: string } | undefined;

/** A stage's countries in the order the ceremony drew them. */
export const drawOrderOf = (plan: DrawPlan, stageId: string): string[] =>
  plan.steps.flatMap((step) =>
    step.t === 'entrant' && step.stageId === stageId ? [step.code] : [],
  );

const toEntry = (code: string, lookup: DrawCountryLookup): DrawEntry => {
  const country = lookup(code);

  return {
    code,
    name: country?.name || code,
    ...(country?.flag ? { flag: country.flag } : {}),
  };
};

const byName =
  (lookup: DrawCountryLookup) =>
  (a: string, b: string): number =>
    (lookup(a)?.name ?? a).localeCompare(lookup(b)?.name ?? b);

/** Sorts codes by their place in `order`; unknown codes keep their order, last. */
const byRank = (order: readonly string[] | undefined) => {
  const rank = new Map((order ?? []).map((code, i) => [code, i]));

  return (codes: string[]): string[] =>
    codes
      .map((code, i) => ({ code, i }))
      .sort(
        (a, b) =>
          (rank.get(a.code) ?? Number.MAX_SAFE_INTEGER) -
            (rank.get(b.code) ?? Number.MAX_SAFE_INTEGER) || a.i - b.i,
      )
      .map((x) => x.code);
};

/** The draw window's finished plan (Done state, before Apply). */
export function drawShareFromPlan(
  plan: DrawPlan,
  input: DrawInput,
  lookup: DrawCountryLookup,
): DrawShareData {
  const names = byName(lookup);

  const semis = input.semis.flatMap((semi): DrawSemi[] => {
    const result = plan.semis[semi.id];

    if (!result) return [];
    let codes: string[];
    let firstHalfSize: number | undefined;

    if (plan.order === 'halves') {
      const drawn = byRank(drawOrderOf(plan, semi.id));
      const first = drawn(
        result.members.filter((m) => m.half === 1).map((m) => m.code),
      );
      const second = drawn(
        result.members.filter((m) => m.half !== 1).map((m) => m.code),
      );

      codes = [...first, ...second];
      firstHalfSize = first.length;
    } else if (plan.order === 'positions') {
      codes = [...result.members]
        .sort((a, b) => a.pos - b.pos)
        .map((m) => m.code);
    } else {
      codes = result.members.map((m) => m.code).sort(names);
    }

    // Pinned / "every semi" voters are in the plan; drawn ones are steps.
    const voters = new Set(result.voters.map((v) => v.code));

    plan.steps.forEach((step) => {
      if (step.t === 'preq' && step.stageId === semi.id) voters.add(step.code);
    });

    return [
      {
        id: semi.id,
        name: semi.name,
        entries: codes.map((code) => toEntry(code, lookup)),
        ...(firstHalfSize !== undefined ? { firstHalfSize } : {}),
        voters: [...voters].sort(names).map((code) => toEntry(code, lookup)),
      },
    ];
  });

  return { order: plan.order, semis };
}

export interface DrawShareStage {
  id: string;
  name: string;
  runningOrder?: string[];
  firstHalfSize?: number;
  countries: { code: string }[];
}

/**
 * The line-up after Apply, from the "Drawn" chip of `stageId`: every semi
 * still holding the countries of the same draw. Halves follow the running
 * order as it is now (a country moved to the other half shows there);
 * inside a half, countries keep their draw order.
 */
export function drawShareFromLineup(
  stageId: string,
  stages: readonly DrawShareStage[],
  drawn: Record<string, DrawnStageInfo>,
  lookup: DrawCountryLookup,
): DrawShareData | null {
  const source = drawn[stageId];

  if (!source) return null;
  const names = byName(lookup);

  const semis = stages.flatMap((stage): DrawSemi[] => {
    const info = drawn[stage.id];
    const members = stage.countries.map((c) => c.code);

    if (
      !info ||
      info.code !== source.code ||
      !isDrawnInfoCurrent(info, members)
    ) {
      return [];
    }
    const memberSet = new Set(members);
    const listed = (stage.runningOrder ?? []).filter((c) => memberSet.has(c));
    const listedSet = new Set(listed);
    const runningOrder = [
      ...listed,
      ...members.filter((c) => !listedSet.has(c)).sort(names),
    ];
    let codes = runningOrder;
    let firstHalfSize: number | undefined;

    if (source.order === 'halves' && stage.firstHalfSize !== undefined) {
      const split = Math.max(
        0,
        Math.min(runningOrder.length, stage.firstHalfSize),
      );
      const drawnOrder = byRank(info.drawOrder);
      const first = drawnOrder(runningOrder.slice(0, split));

      codes = [...first, ...drawnOrder(runningOrder.slice(split))];
      firstHalfSize = first.length;
    } else if (source.order === 'none') {
      codes = [...members].sort(names);
    }

    return [
      {
        id: stage.id,
        name: stage.name,
        entries: codes.map((code) => toEntry(code, lookup)),
        ...(firstHalfSize !== undefined ? { firstHalfSize } : {}),
        voters: [...info.voters]
          .sort(names)
          .map((code) => toEntry(code, lookup)),
      },
    ];
  });

  return semis.length ? { order: source.order, semis } : null;
}
