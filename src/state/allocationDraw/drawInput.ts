/**
 * Builds the engine input from the Event Setup state (stages + assignments +
 * draw store). Pure; the hook `useAllocationDraw` memoizes it.
 */
import type { SymmetricAffinity } from './affinity';
import { resolvePots } from './pots';
import type { DrawInput, DrawRules } from './types';

import { BaseCountry, CountryAssignmentGroup, EventStage } from '@/models';

const sortedByOrder = (stages: readonly EventStage[]) =>
  [...stages].sort((a, b) => (a.order ?? 0) - (b.order ?? 0));

/** The stage the draw feeds: the last one by order. */
export const getFinalStage = (
  stages: readonly EventStage[],
): EventStage | null => {
  const sorted = sortedByOrder(stages);

  return sorted[sorted.length - 1] ?? null;
};

/** Stages the draw places countries into: every stage that qualifies into another. */
export const getDrawableSemis = (
  stages: readonly EventStage[],
): EventStage[] => {
  const sorted = sortedByOrder(stages);
  const last = sorted[sorted.length - 1];

  return sorted.filter(
    (s) => s !== last && !!s.qualifiesTo && s.qualifiesTo.length > 0,
  );
};

export type DrawUnavailableReason = 'gfOnly' | 'fewSemis' | null;

export const getDrawUnavailableReason = (
  stages: readonly EventStage[],
  isGfOnly: boolean,
): DrawUnavailableReason => {
  if (isGfOnly) return 'gfOnly';
  if (getDrawableSemis(stages).length < 2) return 'fewSemis';

  return null;
};

/** Semis actually in the draw once the "Choose" rule is applied. */
export const getDrawSemis = (
  stages: readonly EventStage[],
  rules: Pick<DrawRules, 'semis' | 'semisPick'>,
): EventStage[] =>
  getDrawableSemis(stages).filter(
    (s) => rules.semis === 'all' || rules.semisPick[s.id] !== false,
  );

export interface BuildDrawInputArgs {
  stages: readonly EventStage[];
  assignments: Readonly<Record<string, string>>;
  countries: readonly BaseCountry[];
  /** `pot` of every country in the current year's data. */
  officialPotByCode: Readonly<Record<string, number>>;
  rules: DrawRules;
  votesIn: Readonly<Record<string, string>>;
  affinity: SymmetricAffinity | null;
}

export const buildDrawInput = ({
  stages,
  assignments,
  countries,
  officialPotByCode,
  rules,
  votesIn,
  affinity,
}: BuildDrawInputArgs): DrawInput => {
  const semis = getDrawSemis(stages, rules);
  const semiIds = new Set(semis.map((s) => s.id));
  const final = getFinalStage(stages);
  const entrants: DrawInput['entrants'] = [];
  const preq: DrawInput['preq'] = [];

  countries.forEach((country) => {
    const group = assignments[country.code];

    if (!group) return;

    if (group === CountryAssignmentGroup.TO_BE_DRAWN) {
      entrants.push({ code: country.code, fixed: null });
    } else if (semiIds.has(group)) {
      entrants.push({ code: country.code, fixed: group });
    } else if (final && group === final.id) {
      const pin = votesIn[country.code];

      preq.push({
        code: country.code,
        votesIn: pin && semiIds.has(pin) ? pin : 'drawn',
      });
    }
  });

  entrants.sort((a, b) => a.code.localeCompare(b.code));
  preq.sort((a, b) => a.code.localeCompare(b.code));

  return {
    semis: semis.map((s) => ({ id: s.id, name: s.name })),
    entrants,
    pots: resolvePots({
      entrantCodes: entrants.map((e) => e.code),
      rules,
      officialPotByCode,
      affinity,
      semiCount: semis.length,
    }),
    preq,
    rules,
  };
};
