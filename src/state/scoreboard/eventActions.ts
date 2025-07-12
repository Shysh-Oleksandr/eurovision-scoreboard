import { StateCreator } from 'zustand';

import {
  BaseCountry,
  Country,
  EventMode,
  EventStage,
  StageId,
  StageVotingMode,
} from '../../models';
import { useCountriesStore } from '../countriesStore';

import { ScoreboardState } from './types';

type EventActions = {
  setEventStages: (
    stages: (Omit<EventStage, 'countries'> & { countries: BaseCountry[] })[],
  ) => void;
  startEvent: (mode: EventMode, selectedCountries: BaseCountry[]) => void;
  continueToNextPhase: () => void;
  closeQualificationResults: () => void;
};

export const createEventActions: StateCreator<
  ScoreboardState,
  [['zustand/devtools', never]],
  [],
  EventActions
> = (set, get) => ({
  setEventStages: (
    stages: (Omit<EventStage, 'countries'> & {
      countries: BaseCountry[];
    })[],
  ) => {
    const eventStages: EventStage[] = stages.map((stage) => ({
      ...stage,
      isOver: false,
      isJuryVoting: stage.votingMode !== StageVotingMode.TELEVOTE_ONLY,
      countries: stage.countries.map((country) => ({
        ...country,
        juryPoints: 0,
        televotePoints: 0,
        points: 0,
        lastReceivedPoints: null,
      })),
    }));

    set({ eventStages });
  },

  startEvent: (mode: EventMode, selectedCountries: BaseCountry[]) => {
    const countriesStore = useCountriesStore.getState();

    countriesStore.setSelectedCountries(selectedCountries);

    const allStagesFromSetup = get().eventStages;
    let newEventStages: EventStage[];

    if (mode === EventMode.GRAND_FINAL_ONLY) {
      newEventStages = allStagesFromSetup.filter(
        (s: EventStage) => s.id === StageId.GF,
      );
    } else {
      newEventStages = allStagesFromSetup.filter(
        (s: EventStage) => s.id === StageId.GF || s.countries.length > 0,
      );
      const gfStageIndex = newEventStages.findIndex(
        (s: EventStage) => s.id === StageId.GF,
      );

      if (gfStageIndex > -1) {
        const autoQualifiers = selectedCountries.filter(
          (c: BaseCountry) => c.isAutoQualified,
        );
        const autoQualifiersCountries: Country[] = autoQualifiers.map(
          (country) => ({
            ...country,
            juryPoints: 0,
            televotePoints: 0,
            points: 0,
            lastReceivedPoints: null,
          }),
        );

        newEventStages[gfStageIndex].countries = autoQualifiersCountries;
      }
    }

    const finalEventStages = newEventStages.map((stage, index) => ({
      ...stage,
      isLastStage: index === newEventStages.length - 1,
    }));

    const firstStage = finalEventStages[0] ?? null;

    let firstVotingCountryIndex = 0;

    if (firstStage && firstStage.votingMode === StageVotingMode.TELEVOTE_ONLY) {
      firstVotingCountryIndex = firstStage.countries.length - 1;
    }

    set({
      eventStages: finalEventStages,
      currentStageId: firstStage?.id ?? null,
      eventMode: mode,
      votingCountryIndex: firstVotingCountryIndex,
      votingPoints: 1,
      shouldShowLastPoints: true,
      shouldClearPoints: false,
      winnerCountry: null,
      showQualificationResults: false,
      restartCounter: get().restartCounter + 1,
      showAllParticipants: false,
      televotingProgress: 0,
    });
  },

  continueToNextPhase: () => {
    const state = get();
    const currentStage = state.eventStages.find(
      (s: EventStage) => s.id === state.currentStageId,
    );

    if (!currentStage) return;

    const currentStageIndex = state.eventStages.findIndex(
      (s: EventStage) => s.id === state.currentStageId,
    );
    const nextStage =
      currentStageIndex !== -1
        ? state.eventStages[currentStageIndex + 1]
        : undefined;

    if (!nextStage) return;

    const updatedEventStages = [...state.eventStages];
    let nextStageCountries = nextStage.countries;

    let nextVotingCountryIndex = 0;

    if (nextStage.votingMode === StageVotingMode.TELEVOTE_ONLY) {
      nextVotingCountryIndex = nextStageCountries.length - 1;
    }

    if (nextStage.id === StageId.GF) {
      const qualifiedFromSemiCountries = state.eventStages
        .slice(0, currentStageIndex + 1)
        .flatMap((s: EventStage) => s.countries)
        .filter((c: Country) => c.isQualifiedFromSemi)
        .map((c) => ({
          ...c,
          juryPoints: 0,
          televotePoints: 0,
          points: 0,
          lastReceivedPoints: null,
          isVotingFinished: false,
        }));

      nextStageCountries = [
        ...nextStage.countries,
        ...qualifiedFromSemiCountries,
      ];
      updatedEventStages[currentStageIndex + 1] = {
        ...nextStage,
        countries: nextStageCountries,
      };
    }

    set({
      eventStages: updatedEventStages,
      currentStageId: nextStage.id,
      votingCountryIndex: nextVotingCountryIndex,
      votingPoints: 1,
      shouldShowLastPoints: true,
      shouldClearPoints: false,
      winnerCountry: null,
      showQualificationResults: false,
      showAllParticipants: false,
      televotingProgress: 0,
    });
  },
  closeQualificationResults: () => {
    set({
      showQualificationResults: false,
    });
  },
});
