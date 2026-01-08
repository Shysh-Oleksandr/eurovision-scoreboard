import { StateCreator } from 'zustand';

import {
  Country,
  CountryWithPoints,
  EventStage,
  StageVotingMode,
} from '../../models';
import { useCountriesStore } from '../countriesStore';
import { useGeneralStore } from '../generalStore';

import {
  getLastCountryCodeByPoints,
  getLastCountryIndexByPoints,
  getRemainingCountries,
  handleStageEnd,
  isVotingOver,
} from './helpers';
import { ScoreboardState, Vote } from './types';

import { ANIMATION_DURATION } from '@/data/data';

// Reusable function to swap predefined votes between two countries (jury, televote, combined)
const swapVotesBetweenCountries = (
  predefinedVotes: any,
  countryCodeA: string,
  countryCodeB: string,
) => {
  const updated: any = { ...predefinedVotes };

  if (predefinedVotes.jury) {
    updated.jury = { ...predefinedVotes.jury };
    Object.keys(predefinedVotes.jury).forEach((voter) => {
      const votes = predefinedVotes.jury![voter];
      if (!votes) return;
      updated.jury![voter] = votes.map((vote: any) => {
        if (vote.countryCode === countryCodeA)
          return { ...vote, countryCode: countryCodeB };
        if (vote.countryCode === countryCodeB)
          return { ...vote, countryCode: countryCodeA };
        return vote;
      });
    });
  }

  if (predefinedVotes.televote) {
    updated.televote = { ...predefinedVotes.televote };
    Object.keys(predefinedVotes.televote).forEach((voter) => {
      const votes = predefinedVotes.televote![voter];
      if (!votes) return;
      updated.televote![voter] = votes.map((vote: any) => {
        if (vote.countryCode === countryCodeA)
          return { ...vote, countryCode: countryCodeB };
        if (vote.countryCode === countryCodeB)
          return { ...vote, countryCode: countryCodeA };
        return vote;
      });
    });
  }

  if (predefinedVotes.combined) {
    updated.combined = { ...predefinedVotes.combined };
    Object.keys(predefinedVotes.combined).forEach((voter) => {
      const votes = predefinedVotes.combined![voter];
      if (!votes) return;
      updated.combined![voter] = votes.map((vote: any) => {
        if (vote.countryCode === countryCodeA)
          return { ...vote, countryCode: countryCodeB };
        if (vote.countryCode === countryCodeB)
          return { ...vote, countryCode: countryCodeA };
        return vote;
      });
    });
  }

  return updated;
};

// Recalculate stage countryPoints (jury, televote, combined) from predefinedVotes
const recalculateCountryPoints = (
  currentStage: EventStage,
  predefinedVotes: any,
) => {
  const pointsByCountry: Record<
    string,
    { juryPoints: number; televotePoints: number; combinedPoints: number }
  > = {};

  currentStage.countries.forEach((c) => {
    pointsByCountry[c.code] = {
      juryPoints: 0,
      televotePoints: 0,
      combinedPoints: 0,
    };
  });

  if (predefinedVotes.jury) {
    Object.values(predefinedVotes.jury).forEach((votes: any) => {
      votes?.forEach((v: any) => {
        if (pointsByCountry[v.countryCode])
          pointsByCountry[v.countryCode].juryPoints += v.points;
      });
    });
  }

  if (predefinedVotes.televote) {
    Object.values(predefinedVotes.televote).forEach((votes: any) => {
      votes?.forEach((v: any) => {
        if (pointsByCountry[v.countryCode])
          pointsByCountry[v.countryCode].televotePoints += v.points;
      });
    });
  }

  if (predefinedVotes.combined) {
    Object.values(predefinedVotes.combined).forEach((votes: any) => {
      votes?.forEach((v: any) => {
        if (pointsByCountry[v.countryCode])
          pointsByCountry[v.countryCode].combinedPoints += v.points;
      });
    });
  }

  return pointsByCountry;
};

type VotingActions = {
  giveJuryPoints: (countryCode: string) => void;
  giveTelevotePoints: (countryCode: string, votingPoints: number) => void;
  giveRandomJuryPoints: () => void;
  finishJuryVotingRandomly: () => void;
  finishTelevoteVotingRandomly: () => void;
  givePredefinedJuryPoint: () => void;
  givePredefinedJuryPointsGrouped: () => void;
  givePredefinedTelevotePoints: () => void;
  giveManualTelevotePointsInRevealMode: (countryCode: string) => void;
  pickQualifier: (countryCode: string) => void;
  pickQualifierRandomly: () => void;
};

// Helper function to assign points to a country based on current stage voting mode
const assignPointsToCountry = (
  currentStage: EventStage,
  countryPoints: any,
  country: Country,
): Country => {
  let juryPoints = 0;
  let televotePoints = 0;
  let totalPoints = 0;

  if (currentStage.votingMode === StageVotingMode.COMBINED) {
    totalPoints = countryPoints?.combinedPoints || 0;
    juryPoints = 0;
    televotePoints = 0;
  } else if (currentStage.votingMode === StageVotingMode.JURY_ONLY) {
    juryPoints = countryPoints?.juryPoints || 0;
    televotePoints = 0;
    totalPoints = juryPoints;
  } else if (currentStage.votingMode === StageVotingMode.TELEVOTE_ONLY) {
    televotePoints = countryPoints?.televotePoints || 0;
    juryPoints = 0;
    totalPoints = televotePoints;
  } else {
    // JURY_AND_TELEVOTE mode - combine both
    juryPoints = countryPoints?.juryPoints || 0;
    televotePoints = countryPoints?.televotePoints || 0;
    totalPoints = juryPoints + televotePoints;
  }

  return {
    ...country,
    juryPoints,
    televotePoints,
    points: totalPoints,
    isVotingFinished: true,
  };
};

export const createVotingActions: StateCreator<
  ScoreboardState,
  [['zustand/devtools', never]],
  [],
  VotingActions
> = (set, get) => ({
  giveJuryPoints: (countryCode: string) => {
    const state = get();
    const countriesStore = useCountriesStore.getState();
    const { pointsSystem } = useGeneralStore.getState();
    const currentStage = state.getCurrentStage();
    const votingPointsItem = pointsSystem[state.votingPointsIndex];
    const votingPoints = votingPointsItem.value;

    if (!currentStage) return;

    const votingCountry = countriesStore.getVotingCountry();
    let newPredefinedJuryVotes: Record<string, Vote[]> | undefined;

    const isCombinedVoting =
      currentStage.votingMode === StageVotingMode.COMBINED;
    const predefinedVotesForStage =
      state.predefinedVotes[currentStage.id][
        isCombinedVoting ? 'combined' : 'jury'
      ];

    if (votingCountry && currentStage && predefinedVotesForStage) {
      const votesForCountry = predefinedVotesForStage[votingCountry.code];

      if (votesForCountry) {
        const occurrences = pointsSystem
          .slice(0, state.votingPointsIndex)
          .filter((p) => p.value === votingPoints).length;

        const allMatchingVotes = votesForCountry.filter(
          (v) => v.points === votingPointsItem.value,
        );

        const voteToUpdate = allMatchingVotes[occurrences];

        if (voteToUpdate && voteToUpdate.countryCode !== countryCode) {
          const originalCountryCode = voteToUpdate.countryCode;
          const voteForPointsIndex = votesForCountry.indexOf(voteToUpdate);

          const updatedVotes = [...votesForCountry];
          const voteForNewCountryIndex = updatedVotes.findIndex(
            (v) => v.countryCode === countryCode,
          );

          updatedVotes[voteForPointsIndex].countryCode = countryCode;

          if (voteForNewCountryIndex !== -1) {
            updatedVotes[voteForNewCountryIndex].countryCode =
              originalCountryCode;
          }

          newPredefinedJuryVotes = {
            ...predefinedVotesForStage,
            [votingCountry.code]: updatedVotes,
          };
        }
      }
    }

    const countriesWithPoints = currentStage.countries.filter(
      (country: Country) => country.lastReceivedPoints !== null,
    );
    const shouldReset = countriesWithPoints.length === pointsSystem.length;

    const isNextVotingCountry =
      state.votingPointsIndex === pointsSystem.length - 1;
    const nextVotingCountryIndex =
      state.votingCountryIndex + (isNextVotingCountry ? 1 : 0);
    const isJuryVotingOver =
      nextVotingCountryIndex === countriesStore.getVotingCountriesLength();

    if (isNextVotingCountry) {
      const timerId = setTimeout(() => {
        get().resetLastPoints();
        set({ lastPointsResetTimerId: null });
      }, ANIMATION_DURATION);

      set({ lastPointsResetTimerId: timerId });
    }

    const isFirstPointOfSet = state.votingPointsIndex === 0;

    if (isFirstPointOfSet && state.lastPointsResetTimerId) {
      clearTimeout(state.lastPointsResetTimerId);
    }

    const updatedCountries = currentStage.countries.map((country) => {
      const baseCountry = isFirstPointOfSet
        ? {
            ...country,
            lastReceivedPoints: null,
            showDouzePointsAnimation: false,
          }
        : { ...country };

      if (country.code === countryCode) {
        return {
          ...baseCountry,
          juryPoints: baseCountry.juryPoints + votingPoints,
          points: baseCountry.points + votingPoints,
          lastReceivedPoints: votingPoints,
          showDouzePointsAnimation: votingPointsItem.showDouzePoints,
        };
      }

      return baseCountry;
    });

    if (
      isJuryVotingOver &&
      (currentStage.votingMode === StageVotingMode.JURY_ONLY ||
        currentStage.votingMode === StageVotingMode.COMBINED)
    ) {
      const { winnerCountry, showQualificationResults, countries } =
        handleStageEnd(updatedCountries, currentStage);

      set((s) => ({
        votingCountryIndex: nextVotingCountryIndex,
        eventStages: s.eventStages.map((stage) => {
          if (stage.id === s.currentStageId) {
            return {
              ...stage,
              countries,
              isOver: true,
              isJuryVoting: false,
            };
          }

          return stage;
        }),
        shouldShowLastPoints: false,
        shouldClearPoints: true,
        winnerCountry,
        showQualificationResults,
        predefinedVotes: newPredefinedJuryVotes
          ? {
              ...s.predefinedVotes,
              [currentStage.id]: {
                ...s.predefinedVotes[currentStage.id],
                jury: newPredefinedJuryVotes,
              },
            }
          : s.predefinedVotes,
      }));

      return;
    }

    set((s) => ({
      votingPointsIndex: isNextVotingCountry ? 0 : s.votingPointsIndex + 1,
      votingCountryIndex: isJuryVotingOver
        ? getLastCountryIndexByPoints(
            updatedCountries,
            getLastCountryCodeByPoints(
              getRemainingCountries(updatedCountries, countryCode),
            ),
          )
        : nextVotingCountryIndex,
      eventStages: s.eventStages.map((stage) => {
        if (stage.id === s.currentStageId) {
          return {
            ...stage,
            isJuryVoting: !isJuryVotingOver,
            countries: updatedCountries,
          };
        }

        return stage;
      }),
      shouldShowLastPoints: !shouldReset,
      predefinedVotes: newPredefinedJuryVotes
        ? {
            ...s.predefinedVotes,
            [currentStage.id]: {
              ...s.predefinedVotes[currentStage.id],
              [isCombinedVoting ? 'combined' : 'jury']: newPredefinedJuryVotes,
            },
          }
        : s.predefinedVotes,
      lastPointsResetTimerId: isFirstPointOfSet
        ? null
        : s.lastPointsResetTimerId,
    }));
  },

  givePredefinedJuryPointsGrouped: () => {
    const state = get();
    const countriesStore = useCountriesStore.getState();
    const currentStage = state.getCurrentStage();
    const { pointsSystem } = useGeneralStore.getState();

    if (!currentStage) return;

    const votingCountries = countriesStore.getStageVotingCountries();
    const isJuryVotingOver =
      state.votingCountryIndex === votingCountries.length - 1;
    const votingCountryCode = votingCountries[state.votingCountryIndex]?.code;

    if (!votingCountryCode) return;

    const isCombinedVoting =
      currentStage.votingMode === StageVotingMode.COMBINED;

    const predefinedVotesForCountry =
      state.predefinedVotes[currentStage.id]?.[
        isCombinedVoting ? 'combined' : 'jury'
      ]?.[votingCountryCode];

    if (!predefinedVotesForCountry) return;

    // Determine the group slice [startIndex, endIndex]
    const startIndex = state.votingPointsIndex;
    let endIndex = startIndex;

    if (startIndex < pointsSystem.length) {
      if (pointsSystem[startIndex].showDouzePoints) {
        endIndex = startIndex; // animated point alone
      } else {
        // include all until (but excluding) the next animated point
        let i = startIndex;
        while (
          i + 1 < pointsSystem.length &&
          !pointsSystem[i + 1].showDouzePoints
        ) {
          i += 1;
        }
        // If the next item is animated, stop before it; otherwise include till the end
        endIndex = i;
      }
    }

    const pointsToGive = pointsSystem.slice(startIndex, endIndex + 1);

    if (pointsToGive.length === 0) return;

    const countriesWithRecentPoints: CountryWithPoints[] = [];

    pointsToGive.forEach((currentPoints) => {
      const vote = predefinedVotesForCountry.find(
        (v) => v.pointsId === currentPoints.id,
      );

      if (vote) {
        countriesWithRecentPoints.push({
          code: vote.countryCode,
          points: vote.points,
          showDouzePointsAnimation: vote.showDouzePointsAnimation,
        });
      }
    });

    if (countriesWithRecentPoints.length === 0) return;

    const updatedCountries = currentStage.countries.map((country) => {
      const pointsForThisCountry = countriesWithRecentPoints.filter(
        (c) => c.code === country.code,
      );

      if (pointsForThisCountry.length === 0) {
        return {
          ...country,
          lastReceivedPoints:
            state.votingPointsIndex === 0 ? null : country.lastReceivedPoints,
          showDouzePointsAnimation:
            state.votingPointsIndex === 0
              ? false
              : country.showDouzePointsAnimation,
        } as Country;
      }

      const totalReceivedPoints = pointsForThisCountry.reduce(
        (sum, v) => sum + v.points,
        0,
      );

      const showDouzePointsAnimation = pointsForThisCountry.some(
        (p) => p.showDouzePointsAnimation,
      );

      return {
        ...country,
        juryPoints: country.juryPoints + totalReceivedPoints,
        points: country.points + totalReceivedPoints,
        lastReceivedPoints: totalReceivedPoints,
        showDouzePointsAnimation,
      } as Country;
    });

    const isEndOfPointsSet = endIndex === pointsSystem.length - 1;

    // Reset last points after animation duration
    if (state.lastPointsResetTimerId && !isEndOfPointsSet) {
      clearTimeout(state.lastPointsResetTimerId);
    }

    if (isEndOfPointsSet) {
      const timerId = setTimeout(() => {
        get().resetLastPoints();
        set({ lastPointsResetTimerId: null });
      }, ANIMATION_DURATION);

      set({ lastPointsResetTimerId: timerId });
    }

    const nextVotingCountryIndex =
      state.votingCountryIndex + (isEndOfPointsSet ? 1 : 0);

    if (
      isEndOfPointsSet &&
      isJuryVotingOver &&
      (currentStage.votingMode === StageVotingMode.JURY_ONLY ||
        currentStage.votingMode === StageVotingMode.COMBINED)
    ) {
      const { winnerCountry, showQualificationResults, countries } =
        handleStageEnd(updatedCountries, currentStage);

      set({
        votingPointsIndex: 0,
        votingCountryIndex: nextVotingCountryIndex,
        eventStages: state.eventStages.map((stage) =>
          stage.id === state.currentStageId
            ? { ...stage, countries, isOver: true, isJuryVoting: false }
            : stage,
        ),
        shouldShowLastPoints: true,
        winnerCountry,
        showQualificationResults,
      });

      return;
    }

    const televoteCountryIndex = getLastCountryIndexByPoints(
      updatedCountries,
      getLastCountryCodeByPoints(
        getRemainingCountries(updatedCountries, undefined),
      ),
    );

    set({
      votingPointsIndex: isEndOfPointsSet ? 0 : endIndex + 1,
      votingCountryIndex: isEndOfPointsSet
        ? isJuryVotingOver
          ? televoteCountryIndex
          : nextVotingCountryIndex
        : state.votingCountryIndex,
      eventStages: state.eventStages.map((stage) =>
        stage.id === state.currentStageId
          ? {
              ...stage,
              isJuryVoting: !(isEndOfPointsSet && isJuryVotingOver),
              countries: updatedCountries,
            }
          : stage,
      ),
      shouldShowLastPoints: true,
    });
  },

  giveTelevotePoints: (countryCode: string, votingPoints: number) => {
    const state = get();
    const currentStage = state.getCurrentStage();

    if (!currentStage) return;

    let updatedCountries = currentStage.countries.map((country) => {
      if (country.code === countryCode) {
        return {
          ...country,
          televotePoints: country.televotePoints + (votingPoints ?? 0),
          points: country.points + (votingPoints ?? 0),
          lastReceivedPoints: votingPoints ?? null,
          isVotingFinished: true,
        } as Country;
      }

      return country;
    });

    const lastCountryIndexByPoints = getLastCountryIndexByPoints(
      updatedCountries,
      getLastCountryCodeByPoints(
        getRemainingCountries(updatedCountries, countryCode),
      ),
    );
    const isVotingFinished = isVotingOver(lastCountryIndexByPoints);

    let winnerCountry: Country | null = null;
    let showQualificationResults = false;

    if (isVotingFinished) {
      ({
        winnerCountry,
        showQualificationResults,
        countries: updatedCountries,
      } = handleStageEnd(updatedCountries, currentStage));
    }

    set({
      votingCountryIndex: lastCountryIndexByPoints,
      eventStages: state.eventStages.map((stage) => {
        if (stage.id === state.currentStageId) {
          return {
            ...stage,
            countries: updatedCountries,
            isOver: isVotingFinished,
          };
        }

        return stage;
      }),
      shouldShowLastPoints: false,
      shouldClearPoints: true,
      winnerCountry,
      showQualificationResults,
      televotingProgress: state.televotingProgress + 1,
    });
  },

  givePredefinedJuryPoint: () => {
    const state = get();
    const currentStage = state.getCurrentStage();
    const { pointsSystem } = useGeneralStore.getState();

    if (!currentStage) return;

    const votingCountry = useCountriesStore.getState().getVotingCountry();

    if (!votingCountry) return;

    const predefinedVotesForStage = state.predefinedVotes[currentStage.id];

    if (!predefinedVotesForStage) return;

    const votes =
      currentStage.votingMode === StageVotingMode.COMBINED
        ? predefinedVotesForStage.combined
        : predefinedVotesForStage.jury;

    const votesFromCountry = votes?.[votingCountry.code];

    if (!votesFromCountry) return;

    const currentPoints = pointsSystem[state.votingPointsIndex];

    const vote = votesFromCountry.find((v) => v.pointsId === currentPoints.id);

    if (!vote) return;

    get().giveJuryPoints(vote.countryCode);
  },

  givePredefinedTelevotePoints: () => {
    const state = get();
    const currentStage = state.getCurrentStage();
    const revealTelevoteLowestToHighest =
      useGeneralStore.getState().settings.revealTelevoteLowestToHighest;

    if (!currentStage) return;

    if (revealTelevoteLowestToHighest) {
      // In reveal mode, give points to the country with the lowest points
      const nextLowestCountry = state.getNextLowestTelevoteCountry();

      if (!nextLowestCountry || !nextLowestCountry.country) return;

      get().giveTelevotePoints(
        nextLowestCountry.country.code,
        state.currentRevealTelevotePoints,
      );
      return;
    }

    // Original logic for normal mode
    const votingCountry = useCountriesStore.getState().getVotingCountry(); // This is the country receiving points

    if (!votingCountry) return;

    const predefinedTelevoteVotes =
      state.predefinedVotes[currentStage.id]?.televote;

    if (!predefinedTelevoteVotes) return;

    const votingCountries = useCountriesStore
      .getState()
      .getStageVotingCountries();
    let totalPoints = 0;

    for (const vc of votingCountries) {
      const votesFromVoter = predefinedTelevoteVotes[vc.code];

      if (votesFromVoter) {
        const voteForCountry = votesFromVoter.find(
          (v) => v.countryCode === votingCountry.code,
        );

        if (voteForCountry) {
          totalPoints += voteForCountry.points;
        }
      }
    }

    const isFirstTelevoteCountry =
      currentStage.countries.filter((country) => country.isVotingFinished)
        .length === 0;

    if (isFirstTelevoteCountry) {
      if (state.lastPointsResetTimerId) {
        clearTimeout(state.lastPointsResetTimerId);
      }
      get().resetLastPoints();
    }

    get().giveTelevotePoints(votingCountry.code, totalPoints);
  },

  giveManualTelevotePointsInRevealMode: (countryCode: string) => {
    const state = get();
    const currentStage = state.getCurrentStage();

    if (!currentStage) return;

    // Get the current reveal points and the next lowest country
    const currentRevealPoints = state.currentRevealTelevotePoints;
    const nextLowestCountry = state.getNextLowestTelevoteCountry();

    if (!nextLowestCountry || !nextLowestCountry.country) return;

    // If the clicked country is not the next lowest country, we need to swap votes
    if (countryCode !== nextLowestCountry.country?.code) {
      const predefinedVotes = state.predefinedVotes[currentStage.id];
      if (predefinedVotes) {
        // Swap votes between the clicked country and the next lowest country
        const updatedPredefinedVotes = swapVotesBetweenCountries(
          predefinedVotes,
          countryCode,
          nextLowestCountry.country.code,
        );

        // Recalculate country points after the swap
        const recalculatedCountryPoints = recalculateCountryPoints(
          currentStage,
          updatedPredefinedVotes,
        );

        // Update the store with swapped votes and recalculated points
        set((s) => ({
          countryPoints: {
            ...s.countryPoints,
            [currentStage.id]: recalculatedCountryPoints,
          },
          predefinedVotes: {
            ...s.predefinedVotes,
            [currentStage.id]: updatedPredefinedVotes,
          },
        }));
      }
    }

    console.log('currentRevealPoints', currentRevealPoints);
    // Give the televote points to the clicked country
    get().giveTelevotePoints(countryCode, currentRevealPoints);
  },

  giveRandomJuryPoints: () => {
    const state = get();
    const countriesStore = useCountriesStore.getState();
    const currentStage = state.getCurrentStage();
    const { pointsSystem } = useGeneralStore.getState();

    if (!currentStage) return;
    const votingCountries = countriesStore.getStageVotingCountries();

    const isJuryVotingOver =
      state.votingCountryIndex === votingCountries.length - 1;
    const votingCountryCode = votingCountries[state.votingCountryIndex]?.code;

    const isCombinedVoting =
      currentStage.votingMode === StageVotingMode.COMBINED;

    const predefinedJuryVotes =
      state.predefinedVotes[currentStage.id]?.[
        isCombinedVoting ? 'combined' : 'jury'
      ]?.[votingCountryCode];

    if (!predefinedJuryVotes) return;

    const countriesWithRecentPoints: CountryWithPoints[] = [];
    const pointsToGive = pointsSystem.slice(state.votingPointsIndex);

    pointsToGive.forEach((currentPoints) => {
      const vote = predefinedJuryVotes.find(
        (v) => v.pointsId === currentPoints.id,
      );

      if (vote) {
        countriesWithRecentPoints.push({
          code: vote.countryCode,
          points: vote.points,
          showDouzePointsAnimation: vote.showDouzePointsAnimation,
        });
      }
    });

    const updatedCountries = currentStage.countries.map((country) => {
      const pointsForThisCountry = countriesWithRecentPoints.filter(
        (c) => c.code === country.code,
      );

      const totalReceivedPoints = pointsForThisCountry.reduce(
        (sum, v) => sum + v.points,
        0,
      );

      // If this country is not receiving new points, preserve its existing lastReceivedPoints
      if (pointsForThisCountry.length === 0) {
        return {
          ...country,
          // Only reset lastReceivedPoints if we're starting a new set of points
          lastReceivedPoints:
            state.votingPointsIndex === 0 ? null : country.lastReceivedPoints,
          showDouzePointsAnimation:
            state.votingPointsIndex === 0
              ? false
              : country.showDouzePointsAnimation,
        };
      }

      const showDouzePointsAnimation = pointsForThisCountry.some(
        (p) => p.showDouzePointsAnimation,
      );
      const totalPoints = pointsForThisCountry.reduce(
        (sum, v) => sum + v.points,
        0,
      );

      return {
        ...country,
        juryPoints: country.juryPoints + totalReceivedPoints,
        points: country.points + totalReceivedPoints,
        lastReceivedPoints: totalPoints,
        showDouzePointsAnimation,
      };
    });

    if (state.lastPointsResetTimerId) {
      clearTimeout(state.lastPointsResetTimerId);
    }

    const timerId = setTimeout(() => {
      get().resetLastPoints();
      set({ lastPointsResetTimerId: null });
    }, ANIMATION_DURATION);

    set({ lastPointsResetTimerId: timerId });

    if (
      isJuryVotingOver &&
      (currentStage.votingMode === StageVotingMode.JURY_ONLY ||
        currentStage.votingMode === StageVotingMode.COMBINED)
    ) {
      const { winnerCountry, showQualificationResults, countries } =
        handleStageEnd(updatedCountries, currentStage);

      set({
        votingPointsIndex: 0,
        votingCountryIndex: state.votingCountryIndex + 1,
        eventStages: state.eventStages.map((stage) => {
          if (stage.id === state.currentStageId) {
            return {
              ...stage,
              countries,
              isOver: true,
              isJuryVoting: false,
            };
          }

          return stage;
        }),
        shouldShowLastPoints: true,
        winnerCountry,
        showQualificationResults,
      });

      return;
    }

    const televoteCountryIndex = getLastCountryIndexByPoints(
      updatedCountries,
      getLastCountryCodeByPoints(
        getRemainingCountries(updatedCountries, undefined),
      ),
    );

    set({
      votingPointsIndex: 0,
      votingCountryIndex: isJuryVotingOver
        ? televoteCountryIndex
        : state.votingCountryIndex + 1,
      eventStages: state.eventStages.map((stage) => {
        if (stage.id === state.currentStageId) {
          return {
            ...stage,
            isJuryVoting: !isJuryVotingOver,
            countries: updatedCountries,
          };
        }

        return stage;
      }),
      shouldShowLastPoints: true,
    });
  },

  finishJuryVotingRandomly: () => {
    const state = get();
    const countriesStore = useCountriesStore.getState();
    const currentStage = state.getCurrentStage();
    const { pointsSystem } = useGeneralStore.getState();

    if (!currentStage) return;

    const predefinedJuryVotes =
      state.predefinedVotes[currentStage.id]?.[
        currentStage.votingMode === StageVotingMode.COMBINED
          ? 'combined'
          : 'jury'
      ];

    if (!predefinedJuryVotes) return;

    const votingCountries = countriesStore.getStageVotingCountries();
    let countriesLeft = votingCountries.length - state.votingCountryIndex;

    let updatedCountries = [...currentStage.countries];

    while (countriesLeft > 0) {
      const votingCountryIndex = votingCountries.length - countriesLeft;
      const votingCountryCode = votingCountries[votingCountryIndex]?.code;

      const votesForCountry = predefinedJuryVotes[votingCountryCode];

      if (!votesForCountry) {
        countriesLeft = countriesLeft - 1;
        continue;
      }

      const countriesWithRecentPoints: CountryWithPoints[] = [];

      const isCurrentVotingCountry =
        votingCountryIndex === state.votingCountryIndex;

      const pointsToGive = isCurrentVotingCountry
        ? pointsSystem.slice(state.votingPointsIndex)
        : pointsSystem;

      pointsToGive.forEach((currentPoints) => {
        const vote = votesForCountry.find(
          (v) => v.pointsId === currentPoints.id,
        );

        if (vote) {
          countriesWithRecentPoints.push({
            code: vote.countryCode,
            points: vote.points,
            showDouzePointsAnimation: vote.showDouzePointsAnimation,
          });
        }
      });

      updatedCountries = updatedCountries.map((country) => {
        const pointsForThisCountry = countriesWithRecentPoints.filter(
          (c) => c.code === country.code,
        );

        if (pointsForThisCountry.length === 0) {
          return country;
        }

        const totalReceivedPoints = pointsForThisCountry.reduce(
          (sum, v) => sum + v.points,
          0,
        );

        const showDouzePointsAnimation = pointsForThisCountry.some(
          (p) => p.showDouzePointsAnimation,
        );

        return {
          ...country,
          juryPoints: country.juryPoints + totalReceivedPoints,
          points: country.points + totalReceivedPoints,
          lastReceivedPoints: totalReceivedPoints,
          showDouzePointsAnimation,
        };
      });

      countriesLeft = countriesLeft - 1;

      if (countriesLeft > 0) {
        updatedCountries = updatedCountries.map((c) => ({
          ...c,
          lastReceivedPoints: null,
          showDouzePointsAnimation: false,
        }));
      }
    }

    if (state.lastPointsResetTimerId) {
      clearTimeout(state.lastPointsResetTimerId);
    }
    const timerId = setTimeout(() => {
      get().resetLastPoints();
      set({ lastPointsResetTimerId: null });
    }, ANIMATION_DURATION);

    set({ lastPointsResetTimerId: timerId });

    const isStageOver =
      currentStage.votingMode === StageVotingMode.JURY_ONLY ||
      currentStage.votingMode === StageVotingMode.COMBINED;

    if (isStageOver) {
      const { winnerCountry, showQualificationResults, countries } =
        handleStageEnd(updatedCountries, currentStage);

      set({
        votingPointsIndex: 0,
        votingCountryIndex: votingCountries.length,
        eventStages: state.eventStages.map((stage) =>
          stage.id === state.currentStageId
            ? { ...stage, countries, isOver: true, isJuryVoting: false }
            : stage,
        ),
        shouldShowLastPoints: false,
        winnerCountry,
        showQualificationResults,
      });
    } else {
      // Transition to televote
      const televoteCountryIndex = getLastCountryIndexByPoints(
        updatedCountries,
        getLastCountryCodeByPoints(
          getRemainingCountries(updatedCountries, undefined),
        ),
      );

      set({
        votingPointsIndex: 0,
        votingCountryIndex: televoteCountryIndex,
        eventStages: state.eventStages.map((stage) =>
          stage.id === state.currentStageId
            ? {
                ...stage,
                countries: updatedCountries,
                isJuryVoting: false,
              }
            : stage,
        ),
        shouldShowLastPoints: false,
      });
    }
  },

  finishTelevoteVotingRandomly: () => {
    const state = get();
    const currentStage = state.getCurrentStage();

    if (!currentStage) return;

    const predefinedTelevoteVotes =
      state.predefinedVotes[currentStage.id]?.televote;

    if (!predefinedTelevoteVotes) return;

    const countriesToVote = currentStage.countries.filter(
      (country) => !country.isVotingFinished,
    );

    const televoteTotals: Record<string, number> = {};
    const votingCountries = useCountriesStore
      .getState()
      .getStageVotingCountries();

    for (const votingCountry of votingCountries) {
      const votes = predefinedTelevoteVotes[votingCountry.code];

      if (votes) {
        for (const vote of votes) {
          televoteTotals[vote.countryCode] =
            (televoteTotals[vote.countryCode] || 0) + vote.points;
        }
      }
    }

    const updatedCountries = currentStage.countries.map((country) => {
      const countryToVote = countriesToVote.find(
        (c) => c.code === country.code,
      );

      if (!countryToVote) return country;

      const randomVotingPoints = televoteTotals[country.code] ?? 0;

      return {
        ...country,
        televotePoints: country.televotePoints + randomVotingPoints,
        points: country.points + randomVotingPoints,
        isVotingFinished: true,
        lastReceivedPoints: randomVotingPoints,
      };
    });

    const {
      winnerCountry,
      showQualificationResults,
      countries: finalCountries,
    } = handleStageEnd(updatedCountries, currentStage);

    set({
      votingCountryIndex: -1,
      eventStages: state.eventStages.map((stage: EventStage) =>
        stage.id === state.currentStageId
          ? { ...stage, countries: finalCountries, isOver: true }
          : stage,
      ),
      shouldShowLastPoints: false,
      shouldClearPoints: true,
      winnerCountry,
      showQualificationResults,
      televotingProgress: state.televotingProgress + countriesToVote.length,
    });
  },

  pickQualifier: (countryCode: string) => {
    const state = get();
    const currentStage = state.getCurrentStage();

    if (!currentStage || currentStage.isOver) return;

    const qualifiersAmount =
      currentStage.qualifiesTo?.reduce((sum, target) => {
        // If using rank ranges, calculate based on ranges
        if (target.minRank && target.maxRank) {
          return sum + (target.maxRank - target.minRank + 1);
        }
        // Amount-based (backward compatibility)
        return sum + target.amount;
      }, 0) || 0;
    if (qualifiersAmount === 0) return;

    const stageCountryPoints = state.countryPoints[currentStage.id];
    if (!stageCountryPoints) return;

    const predefinedVotes = state.predefinedVotes[currentStage.id];
    if (!predefinedVotes) return;

    if (!currentStage.countries || currentStage.countries.length === 0) return;

    const hasQualifiedFromCurrentStage = (country: Country) =>
      !!country.qualifiedFromStageIds?.includes(currentStage.id);

    // Check if there are enough countries to qualify
    const availableCountries = currentStage.countries.filter(
      (country) => !hasQualifiedFromCurrentStage(country),
    );
    if (availableCountries.length === 0) return;

    // Check if the selected country is already qualified for this stage
    const selectedCountry = currentStage.countries.find(
      (country) => country.code === countryCode,
    );
    if (!selectedCountry || hasQualifiedFromCurrentStage(selectedCountry))
      return;

    // Get the top N countries by points (excluding already qualified ones)
    const countriesWithPoints = currentStage.countries
      .map((country) => {
        const points = stageCountryPoints[country.code];
        let totalPoints = 0;

        if (currentStage.votingMode === StageVotingMode.COMBINED) {
          totalPoints = points?.combinedPoints || 0;
        } else if (currentStage.votingMode === StageVotingMode.JURY_ONLY) {
          totalPoints = points?.juryPoints || 0;
        } else if (currentStage.votingMode === StageVotingMode.TELEVOTE_ONLY) {
          totalPoints = points?.televotePoints || 0;
        } else {
          // JURY_AND_TELEVOTE mode - combine both
          totalPoints =
            (points?.juryPoints || 0) + (points?.televotePoints || 0);
        }

        return {
          ...country,
          totalPoints,
        };
      })
      .sort((a, b) => b.totalPoints - a.totalPoints);

    const topCountries = countriesWithPoints
      .slice(0, qualifiersAmount)
      .filter((country) => !hasQualifiedFromCurrentStage(country));

    // Check if the selected country would have qualified by predefined votes
    const wouldHaveQualified = topCountries.some(
      (country) => country.code === countryCode,
    );

    let updatedPredefinedVotes = predefinedVotes;

    // If the country wouldn't have qualified, we need to swap votes
    if (!wouldHaveQualified) {
      // Find the lowest qualifying country from the remaining top countries
      const lowestQualifyingCountry = topCountries[topCountries.length - 1];

      if (lowestQualifyingCountry) {
        // Use reusable helper to swap predefined votes
        updatedPredefinedVotes = swapVotesBetweenCountries(
          predefinedVotes,
          countryCode,
          lowestQualifyingCountry.code,
        );

        // Recalculate country points after the swap
        const recalculatedCountryPoints = recalculateCountryPoints(
          currentStage,
          updatedPredefinedVotes,
        );

        // Update the countryPoints in the store
        set((s) => ({
          countryPoints: {
            ...s.countryPoints,
            [currentStage.id]: recalculatedCountryPoints,
          },
          predefinedVotes: {
            ...s.predefinedVotes,
            [currentStage.id]: updatedPredefinedVotes,
          },
        }));

        // Update the local variable for use in the rest of the function
        Object.assign(stageCountryPoints, recalculatedCountryPoints);
      }
    }

    // Mark the selected country as qualified
    set((s) => {
      // Get the current qualification order for this stage
      const currentStageQualificationOrder =
        s.qualificationOrder[currentStage.id] || {};
      const nextOrderNumber =
        Object.keys(currentStageQualificationOrder).length + 1;

      const updatedEventStages = s.eventStages.map((stage) =>
        stage.id === currentStage.id
          ? {
              ...stage,
              countries: stage.countries.map((country) =>
                country.code === countryCode
                  ? assignPointsToCountry(
                      currentStage,
                      stageCountryPoints[countryCode],
                      {
                        ...country,
                        qualifiedFromStageIds: [
                          ...(country.qualifiedFromStageIds ?? []),
                          currentStage.id,
                        ],
                      },
                    )
                  : country,
              ),
            }
          : stage,
      );

      // Check if all qualifiers have been selected
      const updatedStage = updatedEventStages.find(
        (stage) => stage.id === currentStage.id,
      );
      const qualifiedCount =
        updatedStage?.countries.filter((country) =>
          (country.qualifiedFromStageIds ?? []).includes(currentStage.id),
        ).length || 0;
      const isStageComplete = qualifiedCount >= qualifiersAmount;

      const newQualificationOrder = {
        ...s.qualificationOrder,
        [currentStage.id]: {
          ...currentStageQualificationOrder,
          [countryCode]: nextOrderNumber,
        },
      };

      // If stage is complete, mark stage as over
      if (isStageComplete) {
        const finalUpdatedEventStages = updatedEventStages.map((stage) =>
          stage.id === currentStage.id
            ? {
                ...stage,
                isOver: true,
              }
            : stage,
        );

        return {
          eventStages: finalUpdatedEventStages,
          showQualificationResults: true,
          qualificationOrder: newQualificationOrder,
        };
      }

      // Otherwise, just update the stages and qualification order
      return {
        eventStages: updatedEventStages,
        qualificationOrder: newQualificationOrder,
      };
    });
  },

  pickQualifierRandomly: () => {
    const state = get();
    const currentStage = state.getCurrentStage();

    if (!currentStage || currentStage.isOver) return;

    const qualifiersAmount =
      currentStage.qualifiesTo?.reduce((sum, target) => {
        // If using rank ranges, calculate based on ranges
        if (target.minRank && target.maxRank) {
          return sum + (target.maxRank - target.minRank + 1);
        }
        // Amount-based (backward compatibility)
        return sum + target.amount;
      }, 0) || 0;
    if (qualifiersAmount === 0) return;

    const stageCountryPoints = state.countryPoints[currentStage.id];
    if (!stageCountryPoints) return;

    const predefinedVotes = state.predefinedVotes[currentStage.id];
    if (!predefinedVotes) return;

    if (!currentStage.countries || currentStage.countries.length === 0) return;

    const hasQualifiedFromCurrentStage = (country: Country) =>
      !!country.qualifiedFromStageIds?.includes(currentStage.id);

    // Check if there are enough countries to qualify
    const availableCountries = currentStage.countries.filter(
      (country) => !hasQualifiedFromCurrentStage(country),
    );
    if (availableCountries.length === 0) return;

    const countriesWithPoints = currentStage.countries
      .map((country) => {
        const points = stageCountryPoints[country.code];
        let totalPoints = 0;

        if (currentStage.votingMode === StageVotingMode.COMBINED) {
          totalPoints = points?.combinedPoints || 0;
        } else if (currentStage.votingMode === StageVotingMode.JURY_ONLY) {
          totalPoints = points?.juryPoints || 0;
        } else if (currentStage.votingMode === StageVotingMode.TELEVOTE_ONLY) {
          totalPoints = points?.televotePoints || 0;
        } else {
          // JURY_AND_TELEVOTE mode - combine both
          totalPoints =
            (points?.juryPoints || 0) + (points?.televotePoints || 0);
        }

        return {
          ...country,
          totalPoints,
        };
      })
      .sort((a, b) => b.totalPoints - a.totalPoints);

    const topCountries = countriesWithPoints
      .slice(0, qualifiersAmount)
      .filter((country) => !hasQualifiedFromCurrentStage(country));

    if (topCountries.length === 0) return;

    const randomIndex = Math.floor(Math.random() * topCountries.length);
    const selectedCountry = topCountries[randomIndex];

    // Mark the selected country as qualified
    set((s) => {
      // Get the current qualification order for this stage
      const currentStageQualificationOrder =
        s.qualificationOrder[currentStage.id] || {};
      const nextOrderNumber =
        Object.keys(currentStageQualificationOrder).length + 1;

      const updatedEventStages = s.eventStages.map((stage) =>
        stage.id === currentStage.id
          ? {
              ...stage,
              countries: stage.countries.map((country) =>
                country.code === selectedCountry.code
                  ? assignPointsToCountry(
                      currentStage,
                      stageCountryPoints[selectedCountry.code],
                      {
                        ...country,
                        qualifiedFromStageIds: [
                          ...(country.qualifiedFromStageIds ?? []),
                          currentStage.id,
                        ],
                      },
                    )
                  : country,
              ),
            }
          : stage,
      );

      // Check if all qualifiers have been selected
      const updatedStage = updatedEventStages.find(
        (stage) => stage.id === currentStage.id,
      );
      const qualifiedCount =
        updatedStage?.countries.filter((country) =>
          (country.qualifiedFromStageIds ?? []).includes(currentStage.id),
        ).length || 0;
      const isStageComplete = qualifiedCount >= qualifiersAmount;

      const newQualificationOrder = {
        ...s.qualificationOrder,
        [currentStage.id]: {
          ...currentStageQualificationOrder,
          [selectedCountry.code]: nextOrderNumber,
        },
      };

      // If stage is complete, mark stage as over
      if (isStageComplete) {
        const finalUpdatedEventStages = updatedEventStages.map((stage) =>
          stage.id === currentStage.id
            ? {
                ...stage,
                isOver: true,
              }
            : stage,
        );

        return {
          eventStages: finalUpdatedEventStages,
          showQualificationResults: true,
          qualificationOrder: newQualificationOrder,
        };
      }

      // Otherwise, just update the stages and qualification order
      return {
        eventStages: updatedEventStages,
        qualificationOrder: newQualificationOrder,
      };
    });
  },
});
