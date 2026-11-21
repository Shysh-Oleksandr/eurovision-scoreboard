import { enterDrawMode } from '@/components/setup/allocation-draw/drawMode';
import { useDrawUiStore } from '@/components/setup/allocation-draw/drawUiStore';
import { useAllocationDrawStore } from '@/state/allocationDrawStore';
import { CountryOdds, useCountriesStore } from '@/state/countriesStore';
import { useGeneralStore } from '@/state/generalStore';
import type { NextYearPlan } from '@/state/nextYear/planNextYear';
import { useScoreboardStore } from '@/state/scoreboardStore';

interface ApplyNextYearArgs {
  plan: NextYearPlan;
  year: string;
  hostingCountryCode: string;
  /** Open the allocation draw window over the setup. */
  openDraw: boolean;
  /** "New songs": the participants' new odds (`drawNewSongOdds`). */
  odds?: CountryOdds;
}

/**
 * Turns the finished contest into next year's: the planned line-up, draw
 * mode with the semi-finalists waiting, the new year and host, and an open
 * contest that isn't saved yet (Save must create next year's contest, not
 * overwrite this one). Leaving the show opens the setup.
 */
export const applyNextYear = ({
  plan,
  year,
  hostingCountryCode,
  openDraw,
  odds,
}: ApplyNextYearArgs): void => {
  const draw = useAllocationDrawStore.getState();
  const { eventAssignments: before, setEventAssignments } =
    useCountriesStore.getState();

  // "Votes in" pins belong to pre-qualified countries: the old host isn't
  // one any more and the new ones start on Drawn.
  Object.keys(plan.assignments).forEach((code) => {
    if (plan.assignments[code] !== before[code]) draw.setVotesIn(code, null);
  });
  setEventAssignments(plan.assignments);

  if (odds) {
    const {
      setBulkCountryOdds,
      configuredEventStages,
      setConfiguredEventStages,
    } = useCountriesStore.getState();

    setBulkCountryOdds(odds);
    // A stage's own odds belonged to this year's songs too.
    if (configuredEventStages.some((stage) => stage.overrides?.odds)) {
      setConfiguredEventStages(
        configuredEventStages.map((stage) =>
          stage.overrides?.odds
            ? { ...stage, overrides: { ...stage.overrides, odds: undefined } }
            : stage,
        ),
      );
    }
  }

  if (plan.usesDraw && plan.waitingCount > 0) {
    draw.clearWaitingFrom();
    draw.rememberWaitingFrom(plan.waitingFrom);
    enterDrawMode(false);
  }

  useGeneralStore.setState((state) => ({
    settings: {
      ...state.settings,
      contestYear: year,
      hostingCountryCode,
      contestDescription: '',
    },
    activeContest: null,
    loadedContestFingerprint: null,
  }));

  useScoreboardStore.getState().leaveEvent();

  if (openDraw && plan.usesDraw && plan.waitingCount > 0) {
    useDrawUiStore.getState().setWindowOpen(true);
  }
};
