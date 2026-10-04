/**
 * Entering / leaving draw mode. These act on the stores directly so the
 * contest card, the dialogs and the empty "To be drawn" card share one path.
 */
import { codesInDrawSemis, waitingCodesOf } from './useAllocationDraw';

import { TO_BE_DRAWN_LIST } from '@/components/setup/hub/lineup/listIds';
import { useSetupUiStore } from '@/components/setup/hub/state/setupUiStore';
import { CountryAssignmentGroup } from '@/models';
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
