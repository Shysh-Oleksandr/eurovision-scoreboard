/**
 * Entering / leaving draw mode. These act on the stores directly so the
 * contest card, the dialogs and the empty "To be drawn" card share one path.
 */
import { codesInDrawSemis, waitingCodesOf } from './useAllocationDraw';

import { TO_BE_DRAWN_LIST } from '@/components/setup/hub/lineup/listIds';
import { useSetupUiStore } from '@/components/setup/hub/state/setupUiStore';
import { BaseCountry, CountryAssignmentGroup } from '@/models';
import { getDrawSemis } from '@/state/allocationDraw/drawInput';
import { splitEvenly } from '@/state/allocationDraw/engine';
import { useAllocationDrawStore } from '@/state/allocationDrawStore';
import { useCountriesStore } from '@/state/countriesStore';

/** Move every semi-finalist of the drawable semis into "To be drawn"; returns how many moved. */
export const moveSemiFinalistsIntoDraw = (): number => {
  const { configuredEventStages, eventAssignments, setEventAssignments } =
    useCountriesStore.getState();
  const draw = useAllocationDrawStore.getState();
  const codes = codesInDrawSemis(
    configuredEventStages,
    eventAssignments,
    draw.rules,
  );

  if (codes.length === 0) return 0;

  const next = { ...eventAssignments };
  const from: Record<string, string> = {};

  codes.forEach((code) => {
    from[code] = eventAssignments[code];
    next[code] = CountryAssignmentGroup.TO_BE_DRAWN;
  });

  draw.rememberWaitingFrom(from);
  setEventAssignments(next);
  useSetupUiStore.getState().setExpanded(TO_BE_DRAWN_LIST, true);

  return codes.length;
};

export const enterDrawMode = (moveIn: boolean): number => {
  const moved = moveIn ? moveSemiFinalistsIntoDraw() : 0;

  useAllocationDrawStore.getState().setEnabled(true);
  useSetupUiStore.getState().setExpanded(TO_BE_DRAWN_LIST, true);

  return moved;
};

/**
 * Draw mode for an edition whose allocation draw hasn't taken place yet: its
 * semi-finalists start in "To be drawn" with nowhere to go back to, so "Put
 * them back where they were" splits them alphabetically between the semis,
 * the odd one to the later semi (2027: 15 and 16).
 */
export const enterPendingDraw = (waiting: readonly BaseCountry[]) => {
  const { configuredEventStages } = useCountriesStore.getState();
  const draw = useAllocationDrawStore.getState();
  const semis = getDrawSemis(configuredEventStages, draw.rules);
  const sorted = [...waiting].sort((a, b) => a.name.localeCompare(b.name));
  const { base, extra } = splitEvenly(sorted.length, semis.length);
  const from: Record<string, string> = {};
  let start = 0;

  semis.forEach((semi, i) => {
    const size = base + (i >= semis.length - extra ? 1 : 0);

    sorted.slice(start, start + size).forEach((country) => {
      from[country.code] = semi.id;
    });
    start += size;
  });

  draw.rememberWaitingFrom(from);
  enterDrawMode(false);
};

export interface RestoreSummary {
  toSemis: number;
  toPool: number;
}

/** Where "Put them back where they were" would send the waiting countries. */
export const restoreSummary = (): RestoreSummary => {
  const { configuredEventStages, eventAssignments } =
    useCountriesStore.getState();
  const { waitingFrom } = useAllocationDrawStore.getState();
  const stageIds = new Set(configuredEventStages.map((s) => s.id));
  const waiting = waitingCodesOf(eventAssignments);
  const toSemis = waiting.filter((code) =>
    stageIds.has(waitingFrom[code]),
  ).length;

  return { toSemis, toPool: waiting.length - toSemis };
};

export type LeaveDrawHow = 'restore' | 'pool';

export const leaveDrawMode = (how: LeaveDrawHow): number => {
  const { configuredEventStages, eventAssignments, setEventAssignments } =
    useCountriesStore.getState();
  const draw = useAllocationDrawStore.getState();
  const stageIds = new Set(configuredEventStages.map((s) => s.id));
  const waiting = waitingCodesOf(eventAssignments);

  if (waiting.length > 0) {
    const next = { ...eventAssignments };

    waiting.forEach((code) => {
      const from = draw.waitingFrom[code];

      next[code] =
        how === 'restore' && from && stageIds.has(from)
          ? from
          : CountryAssignmentGroup.NOT_PARTICIPATING;
    });
    setEventAssignments(next);
  }

  draw.setEnabled(false);
  draw.clearVotesIn();
  draw.clearWaitingFrom();

  return waiting.length;
};
