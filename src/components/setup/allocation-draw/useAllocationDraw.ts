'use client';
import { useEffect, useMemo, useState } from 'react';

import { useShallow } from 'zustand/shallow';

import { BaseCountry, CountryAssignmentGroup, EventStage } from '@/models';
import type { SymmetricAffinity } from '@/state/allocationDraw/affinity';
import {
  buildDrawInput,
  getDrawSemis,
  getDrawUnavailableReason,
  getFinalStage,
} from '@/state/allocationDraw/drawInput';
import { check, sizesFor } from '@/state/allocationDraw/engine';
import type {
  DrawError,
  DrawInput,
  DrawRules,
} from '@/state/allocationDraw/types';
import { useAllocationDrawStore } from '@/state/allocationDrawStore';
import { useCountriesStore } from '@/state/countriesStore';
import { useGeneralStore } from '@/state/generalStore';

let affinityCache: SymmetricAffinity | null = null;

/** Lazily loads the affinity matrix (46 KB presets) the first time the draw is used. */
export const useDrawAffinity = (active: boolean): SymmetricAffinity | null => {
  const [affinity, setAffinity] = useState<SymmetricAffinity | null>(
    affinityCache,
  );

  useEffect(() => {
    if (!active || affinity) return;

    let cancelled = false;

    void import('@/state/allocationDraw/affinity').then((m) => {
      affinityCache = m.getDrawAffinity();
      if (!cancelled) setAffinity(affinityCache);
    });

    return () => {
      cancelled = true;
    };
  }, [active, affinity]);

  return affinity;
};

export interface AllocationDrawModel {
  enabled: boolean;
  available: boolean;
  unavailableReason: ReturnType<typeof getDrawUnavailableReason>;
  rules: DrawRules;
  votesIn: Record<string, string>;
  /** Semis in the draw (after the "Choose" rule). */
  semis: EventStage[];
  finalStage: EventStage | null;
  input: DrawInput;
  error: DrawError | null;
  /** Target size per semi id. */
  sizes: Record<string, number>;
  waitingCodes: string[];
  potIndexByCode: Map<string, number>;
  byCode: Map<string, BaseCountry>;
}

/**
 * Everything the line-up and the draw window need about the current draw:
 * the engine input built from the stores, its validation and the target sizes.
 * Pass `active` to keep it computing while the window is open with draw mode off.
 */
export const useAllocationDraw = (active = true): AllocationDrawModel => {
  const { enabled, rules, votesIn } = useAllocationDrawStore(
    useShallow((s) => ({
      enabled: s.enabled,
      rules: s.rules,
      votesIn: s.votesIn,
    })),
  );
  const isGfOnly = useGeneralStore((s) => s.isGfOnly);
  const stages = useCountriesStore((s) => s.configuredEventStages);
  const assignments = useCountriesStore((s) => s.eventAssignments);
  const customCountries = useCountriesStore((s) => s.customCountries);
  const allCountriesForYear = useCountriesStore((s) => s.allCountriesForYear);
  const getAllCountries = useCountriesStore((s) => s.getAllCountries);
  const affinity = useDrawAffinity(active && (enabled || !isGfOnly));

  const countries = useMemo(
    () => getAllCountries(),
    // customCountries is the only input of getAllCountries that changes.
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [customCountries, getAllCountries],
  );
  const byCode = useMemo(
    () => new Map(countries.map((c) => [c.code, c])),
    [countries],
  );
  const officialPotByCode = useMemo(() => {
    const out: Record<string, number> = {};

    allCountriesForYear.forEach((c) => {
      if (c.pot) out[c.code] = c.pot;
    });

    return out;
  }, [allCountriesForYear]);

  return useMemo<AllocationDrawModel>(() => {
    const unavailableReason = getDrawUnavailableReason(stages, isGfOnly);
    const input = buildDrawInput({
      stages,
      assignments,
      countries,
      officialPotByCode,
      rules,
      votesIn,
      affinity,
    });
    const semis = getDrawSemis(stages, rules);
    const sizeList = sizesFor(input);
    const sizes: Record<string, number> = {};

    input.semis.forEach((s, i) => (sizes[s.id] = sizeList[i]));

    const potIndexByCode = new Map<string, number>();

    input.pots.forEach((pot, i) =>
      pot.members.forEach((code) => potIndexByCode.set(code, i)),
    );

    return {
      enabled,
      available: unavailableReason === null,
      unavailableReason,
      rules,
      votesIn,
      semis,
      finalStage: getFinalStage(stages),
      input,
      error: check(input),
      sizes,
      waitingCodes: input.entrants
        .filter((e) => e.fixed === null)
        .map((e) => e.code),
      potIndexByCode,
      byCode,
    };
  }, [
    stages,
    isGfOnly,
    assignments,
    countries,
    officialPotByCode,
    rules,
    votesIn,
    affinity,
    enabled,
    byCode,
  ]);
};

/** Codes currently assigned to the stages the draw places countries into. */
export const codesInDrawSemis = (
  stages: readonly EventStage[],
  assignments: Readonly<Record<string, string>>,
  rules: Pick<DrawRules, 'semis' | 'semisPick'>,
): string[] => {
  const ids = new Set(getDrawSemis(stages, rules).map((s) => s.id));

  return Object.keys(assignments).filter((code) => ids.has(assignments[code]));
};

export const waitingCodesOf = (
  assignments: Readonly<Record<string, string>>,
): string[] =>
  Object.keys(assignments).filter(
    (code) => assignments[code] === CountryAssignmentGroup.TO_BE_DRAWN,
  );
