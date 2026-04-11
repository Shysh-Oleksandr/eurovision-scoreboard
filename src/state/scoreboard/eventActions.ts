import { StateCreator } from 'zustand';

import { EventStage, StageVotingMode } from '../../models';
import { useCountriesStore } from '../countriesStore';

import { useGeneralStore } from '../generalStore';
import { playThemeSound } from '@/theme/playThemeSound';
import {
  createCountriesComparator,
  getLastCountryCodeByPoints,
  getLastCountryIndexByPoints,
  getRemainingCountries,
} from './helpers';
import { ScoreboardState } from './types';

type EventActions = {
  setEventStages: (eventStages: EventStage[]) => void;
  startEvent: () => void;
  prepareForNextStage: (shouldUpdateStore?: boolean) => {
    updatedEventStages: EventStage[];
    nextStage: EventStage | null;
    currentStageIndex: number;
  };
  continueToNextPhase: () => void;
  closeQualificationResults: () => void;
  triggerRestartEvent: () => void;
  leaveEvent: () => void;
};

export const createEventActions: StateCreator<
  ScoreboardState,
  [['zustand/devtools', never]],
  [],
  EventActions
> = (set, get) => ({
  setEventStages: (eventStages: EventStage[]) => {
    set({ eventStages });
  },

  startEvent: () => {
    const enablePredefined =
      useGeneralStore.getState().settings.enablePredefinedVotes;

    if (!enablePredefined) {
      set({
        predefinedVotes: {},
        countryPoints: {},
      });
    }

    set({
      qualificationOrder: {},
    });

    const allStagesFromSetup = get().eventStages;
    // Sort stages by order property
    const newEventStages: EventStage[] = allStagesFromSetup.sort(
      (a, b) => (a.order ?? 0) - (b.order ?? 0),
    );

    const finalEventStages = newEventStages.map((stage, index) => ({
      ...stage,
      isLastStage: index === newEventStages.length - 1,
    }));

    const firstStage = finalEventStages[0] ?? null;

    let firstVotingCountryIndex = 0;

    if (firstStage) {
      if (!enablePredefined) {
        get().predefineVotesForStage(firstStage, true);
      }
      if (firstStage.votingMode === StageVotingMode.TELEVOTE_ONLY) {
        firstVotingCountryIndex = getLastCountryIndexByPoints(
          firstStage.countries,
          getLastCountryCodeByPoints(
            getRemainingCountries(firstStage.countries, undefined),
            firstStage.runningOrder,
          ),
        );
      }
    }

    const generalStore = useGeneralStore.getState();
    generalStore.setPresentationSettings({
      isPresenting: generalStore.settings.autoStartPresentation,
    });

    set({
      eventStages: finalEventStages,
      currentStageId: firstStage?.id ?? null,
      votingCountryIndex: firstVotingCountryIndex,
      votingPointsIndex: 0,
      shouldShowLastPoints: true,
      shouldClearPoints: false,
      winnerCountry: null,
      showQualificationResults: false,
      startCounter: get().startCounter + 1,
      showAllParticipants: false,
      televotingProgress: 0,
      viewedStageId: null,
      isWinnerAnimationAlreadyDisplayed: false,
      isLastSimulationAnimationFinished: true,
      splitScreenQualifierModalOpen: false,
      splitScreenQualifierCandidates: [],
      splitScreenQualifierCandidatesStageId: null,
      splitScreenQualifierCandidatesQualifiedCount: null,
      splitScreenQualifierShownCountByStage: {},
      splitScreenQualifierLastShownByStage: {},
    });

    playThemeSound('stageStart');
  },

  // Needed to display correct countries for post setup modals
  prepareForNextStage: (shouldUpdateStore = true) => {
    const state = get();
    const currentStage = state.getCurrentStage();

    if (!currentStage)
      return { updatedEventStages: [], nextStage: null, currentStageIndex: -1 };

    const currentStageIndex = state.eventStages.findIndex(
      (s: EventStage) => s.id === state.currentStageId,
    );
    const nextStage = state.getNextStage();

    if (!nextStage)
      return { updatedEventStages: [], nextStage: null, currentStageIndex };

    const updatedEventStages = [...state.eventStages];

    // Reset animations for current stage
    updatedEventStages[currentStageIndex] = {
      ...currentStage,
      countries: currentStage.countries.map((country) => ({
        ...country,
        lastReceivedPoints: null,
        showDouzePointsAnimation: false,
      })),
    };

    // Collect qualifiers from current stage based on qualifiesTo relationships.
    // Only do this once per transition; subsequent calls (e.g. from
    // continueToNextPhase after handleContinue) should not re-append qualifiers.
    const currentStageQualifiesTo = currentStage.qualifiesTo || [];
    if (
      currentStageQualifiesTo.length > 0 &&
      !nextStage.isPreparedForNextStage
    ) {
      // Get all countries from current stage, sorted by total points (descending)
      const countriesWithPoints = currentStage.countries
        .map((c) => ({
          ...c,
          totalPoints: c.points,
        }))
        .sort(createCountriesComparator(currentStage.runningOrder));

      // Distribute qualifiers to target stages based on qualifiesTo
      if (
        currentStageQualifiesTo.some(
          (target) => target.minRank || target.maxRank,
        )
      ) {
        // Rank-based qualification
        for (const target of currentStageQualifiesTo) {
          const targetStageIndex = updatedEventStages.findIndex(
            (s) => s.id === target.targetStageId,
          );

          if (targetStageIndex === -1) continue;

          const targetStage = updatedEventStages[targetStageIndex];

          let qualifiersForTarget: typeof countriesWithPoints = [];

          if (target.minRank && target.maxRank) {
            // Specific range: minRank to maxRank (inclusive)
            qualifiersForTarget = countriesWithPoints
              .slice(target.minRank - 1, target.maxRank)
              .map((c) => ({
                ...c,
                juryPoints: 0,
                televotePoints: 0,
                points: 0,
                lastReceivedPoints: null,
                isVotingFinished: false,
              }));
          } else if (target.minRank && !target.maxRank) {
            // From minRank to end
            qualifiersForTarget = countriesWithPoints
              .slice(target.minRank - 1)
              .map((c) => ({
                ...c,
                juryPoints: 0,
                televotePoints: 0,
                points: 0,
                lastReceivedPoints: null,
                isVotingFinished: false,
              }));
          }

          // Add qualifiers to target stage
          const existingCountries = targetStage.countries || [];

          const updatedTargetStage = {
            ...targetStage,
            countries: [...existingCountries, ...qualifiersForTarget]
              // Remove duplicates just in case
              .filter(
                (country, index, self) =>
                  index === self.findIndex((t) => t.code === country.code),
              )
              .sort(createCountriesComparator(targetStage.runningOrder)),
          };

          updatedEventStages[targetStageIndex] = updatedTargetStage;
        }
      } else {
        // Amount-based qualification (backward compatibility)
        let qualifierIndex = 0;
        for (const target of currentStageQualifiesTo) {
          const targetStageIndex = updatedEventStages.findIndex(
            (s) => s.id === target.targetStageId,
          );

          if (targetStageIndex === -1) continue;

          const targetStage = updatedEventStages[targetStageIndex];
          const qualifiersForTarget = countriesWithPoints
            .slice(qualifierIndex, qualifierIndex + target.amount)
            .map((c) => ({
              ...c,
              juryPoints: 0,
              televotePoints: 0,
              points: 0,
              lastReceivedPoints: null,
              isVotingFinished: false,
            }));

          // Add qualifiers to target stage
          const existingCountries = targetStage.countries || [];

          const updatedTargetStage = {
            ...targetStage,
            countries: [...existingCountries, ...qualifiersForTarget]
              // Remove duplicates just in case
              .filter(
                (country, index, self) =>
                  index === self.findIndex((t) => t.code === country.code),
              )
              .sort(createCountriesComparator(targetStage.runningOrder)),
          };

          updatedEventStages[targetStageIndex] = updatedTargetStage;
          qualifierIndex += target.amount;
        }
      }
    }

    // Set isPreparedForNextStage for next stage
    if (currentStageIndex + 1 < updatedEventStages.length) {
      updatedEventStages[currentStageIndex + 1].isPreparedForNextStage = true;
    }

    if (shouldUpdateStore) {
      set({
        eventStages: updatedEventStages,
      });
    }

    return { updatedEventStages, nextStage, currentStageIndex };
  },
  continueToNextPhase: () => {
    const { updatedEventStages, nextStage, currentStageIndex } =
      get().prepareForNextStage(false);

    if (!nextStage || currentStageIndex === -1) return;

    let nextStageCountries = nextStage.countries;
    let nextVotingCountryIndex = 0;

    if (nextStage.votingMode === StageVotingMode.TELEVOTE_ONLY) {
      nextVotingCountryIndex = getLastCountryIndexByPoints(
        nextStageCountries,
        getLastCountryCodeByPoints(
          getRemainingCountries(nextStageCountries, undefined),
          nextStage.runningOrder,
        ),
      );
    }

    const enablePredefined =
      useGeneralStore.getState().settings.enablePredefinedVotes;
    if (!enablePredefined) {
      get().predefineVotesForStage(updatedEventStages[currentStageIndex + 1]);
    }

    const generalStore = useGeneralStore.getState();
    generalStore.setPresentationSettings({
      isPresenting: generalStore.settings.autoStartPresentation,
    });

    set({
      eventStages: enablePredefined
        ? [...get().eventStages]
        : updatedEventStages,
      currentStageId: nextStage.id,
      votingCountryIndex: nextVotingCountryIndex,
      votingPointsIndex: 0,
      shouldShowLastPoints: true,
      shouldClearPoints: false,
      winnerCountry: null,
      showQualificationResults: false,
      showAllParticipants: false,
      televotingProgress: 0,
      isWinnerAnimationAlreadyDisplayed: false,
      isLastSimulationAnimationFinished: true,
      splitScreenQualifierModalOpen: false,
      splitScreenQualifierCandidates: [],
      splitScreenQualifierCandidatesStageId: null,
      splitScreenQualifierCandidatesQualifiedCount: null,
      splitScreenQualifierShownCountByStage: {},
      splitScreenQualifierLastShownByStage: {},
    });

    playThemeSound('stageStart');
  },
  closeQualificationResults: () => {
    set({
      showQualificationResults: false,
    });
  },

  triggerRestartEvent: () => {
    set({
      restartCounter: get().restartCounter + 1,
    });
  },

  leaveEvent: () => {
    useCountriesStore.getState().setEventSetupModalOpen(true);

    set({
      eventStages: [],
      currentStageId: null,
      isLastSimulationAnimationFinished: true,
      splitScreenQualifierModalOpen: false,
      splitScreenQualifierCandidates: [],
      splitScreenQualifierCandidatesStageId: null,
      splitScreenQualifierCandidatesQualifiedCount: null,
      splitScreenQualifierShownCountByStage: {},
      splitScreenQualifierLastShownByStage: {},
    });
  },
});
