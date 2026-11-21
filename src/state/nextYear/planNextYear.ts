/**
 * Next year: the line-up of the contest after a finished one. Pure, so the
 * Next year dialog can show what changes before anything does
 * (`components/nextYear/applyNextYear.ts` writes it to the stores).
 *
 * - The winner pre-qualifies for the final unless the user unticks it, and
 *   the new host does when it isn't the winner (the UK hosting for Ukraine
 *   in 2023).
 * - With the draw, every semi-finalist of the drawn semis waits in it again.
 *   Without it (not chosen, fewer than two semis, Grand Final only) the
 *   semis keep their line-ups.
 * - A country that gives up its place in the final (this year's host, or a
 *   winner that won at home and was unticked) goes into the draw, or into the
 *   smallest first-round semi without one.
 */
import type { ContestType } from '@/data/contestTypes';
import { CountryAssignmentGroup, EventStage } from '@/models';
import {
  getDefaultDrawSemis,
  getDrawSemis,
  getDrawUnavailableReason,
  getFinalStage,
} from '@/state/allocationDraw/drawInput';
import type { DrawRules } from '@/state/allocationDraw/types';

/** Pre-qualified for the Eurovision final every year, whoever hosts. */
export const ESC_BIG_FIVE: readonly string[] = ['FR', 'DE', 'IT', 'ES', 'GB'];

/**
 * Whether this year's host should leave the final by default: hosts
 * pre-qualify for their own year only, except the Big Five at Eurovision.
 */
export const hostLeavesFinalByDefault = (
  contestType: ContestType,
  hostCode: string,
): boolean => !(contestType === 'esc' && ESC_BIG_FIVE.includes(hostCode));

/** "2026" → "2027". Anything that isn't a year from 1 to 9998 → "". */
export const followingYear = (year: string): string => {
  const text = year.trim();

  if (!/^\d{1,4}$/.test(text)) return '';
  const value = Number(text);

  return value >= 1 && value < 9999 ? String(value + 1) : '';
};

export interface NextYearInput {
  /** The setup's stages (`configuredEventStages`). */
  stages: readonly EventStage[];
  /** The setup's line-up (`eventAssignments`). */
  assignments: Readonly<Record<string, string>>;
  isGfOnly: boolean;
  drawRules: Pick<DrawRules, 'semis' | 'semisPick'>;
  winnerCode: string;
  /** The winner goes straight to the final (the dialog's check). */
  winnerPreQualifies?: boolean;
  /** Next year's host; defaults to the winner. */
  newHostCode?: string;
  /** This year's host. */
  previousHostCode: string | null;
  /** This year's host gives up its place in the final. */
  previousHostLeavesFinal: boolean;
  /** Send the semi-finalists into the allocation draw, when it's available. */
  useDraw?: boolean;
}

export interface NextYearPlan {
  assignments: Record<string, string>;
  /** Where each country put into the draw came from ("Put them back where they were"). */
  waitingFrom: Record<string, string>;
  /** The allocation draw is available (two or more drawn semis). */
  drawAvailable: boolean;
  /** Semi-finalists wait in the allocation draw. */
  usesDraw: boolean;
  /** The winner's place in the final is a choice (it isn't there for another reason, like the Big Five). */
  canChooseWinner: boolean;
  /** Countries that move into the final, in order: the winner, then the host. */
  preQualified: Array<{ code: string; as: 'winner' | 'host' }>;
  /** This year's host can leave the final (it holds a place there and has somewhere to go). */
  canMovePreviousHost: boolean;
  /** Where this year's host went: `TO_BE_DRAWN` or a stage id; null if it stayed. */
  previousHostTo: string | null;
  /** Countries waiting for the draw afterwards. */
  waitingCount: number;
}

const { TO_BE_DRAWN } = CountryAssignmentGroup;

export const planNextYear = ({
  stages,
  assignments,
  isGfOnly,
  drawRules,
  winnerCode,
  winnerPreQualifies = true,
  newHostCode = winnerCode,
  previousHostCode,
  previousHostLeavesFinal,
  useDraw = true,
}: NextYearInput): NextYearPlan => {
  const next: Record<string, string> = { ...assignments };
  const waitingFrom: Record<string, string> = {};
  const final = getFinalStage(stages);

  if (!final) {
    return {
      assignments: next,
      waitingFrom,
      drawAvailable: false,
      usesDraw: false,
      canChooseWinner: false,
      preQualified: [],
      canMovePreviousHost: false,
      previousHostTo: null,
      waitingCount: 0,
    };
  }

  const drawSemis =
    getDrawUnavailableReason(stages, isGfOnly) === null
      ? getDrawSemis(stages, drawRules)
      : [];
  const drawAvailable = drawSemis.length >= 2;
  const usesDraw = drawAvailable && useDraw;
  // Without the draw, a country leaving the final joins a first-round semi.
  const firstRound = isGfOnly ? [] : getDefaultDrawSemis(stages);
  const canLeaveFinal = usesDraw || firstRound.length > 0;

  const smallest = (
    semis: readonly EventStage[],
    sizeOf: (id: string) => number,
  ) => [...semis].sort((a, b) => sizeOf(a.id) - sizeOf(b.id))[0];

  /** Out of the final: into the draw ("back" to its smaller semi), else the smallest semi. */
  const leaveFinal = (code: string): string => {
    if (usesDraw) {
      const counts = new Map<string, number>();

      Object.values(waitingFrom).forEach((id) =>
        counts.set(id, (counts.get(id) ?? 0) + 1),
      );
      next[code] = TO_BE_DRAWN;
      waitingFrom[code] = smallest(drawSemis, (id) => counts.get(id) ?? 0).id;
    } else {
      next[code] = smallest(
        firstRound,
        (id) => Object.values(next).filter((group) => group === id).length,
      ).id;
    }

    return next[code];
  };

  const preQualified: NextYearPlan['preQualified'] = [];
  const preQualify = (code: string, as: 'winner' | 'host') => {
    if (!(code in next) || next[code] === final.id) return;
    // In Grand Final only mode the rest are "not qualified": the host still
    // takes part, a winner always did.
    next[code] = final.id;
    preQualified.push({ code, as });
  };

  // A winner already in the final for another reason (the Big Five) stays
  // there without asking; one that won at home holds a host's place, which
  // it can give up like any host.
  const winnerInFinal = assignments[winnerCode] === final.id;
  const wonAtHome = winnerCode === previousHostCode;
  const canChooseWinner =
    winnerCode in next && (!winnerInFinal || (wonAtHome && canLeaveFinal));
  const winnerLeaves = canChooseWinner && !winnerPreQualifies && winnerInFinal;

  if (!canChooseWinner || winnerPreQualifies) preQualify(winnerCode, 'winner');
  if (newHostCode && newHostCode !== winnerCode)
    preQualify(newHostCode, 'host');

  // Everyone in the drawn semis goes back into the draw (an unticked winner
  // from a semi with them).
  if (usesDraw) {
    const drawIds = new Set(drawSemis.map((s) => s.id));

    Object.keys(next).forEach((code) => {
      if (drawIds.has(next[code])) {
        waitingFrom[code] = next[code];
        next[code] = TO_BE_DRAWN;
      }
    });
  }

  const previous = previousHostCode;
  const canMovePreviousHost =
    !!previous &&
    previous !== winnerCode &&
    previous !== newHostCode &&
    assignments[previous] === final.id &&
    canLeaveFinal;
  const previousHostTo =
    canMovePreviousHost && previousHostLeavesFinal
      ? leaveFinal(previous)
      : null;

  if (winnerLeaves) leaveFinal(winnerCode);

  return {
    assignments: next,
    waitingFrom,
    drawAvailable,
    usesDraw,
    canChooseWinner,
    preQualified,
    canMovePreviousHost,
    previousHostTo,
    waitingCount: Object.values(next).filter((group) => group === TO_BE_DRAWN)
      .length,
  };
};
