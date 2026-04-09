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
import {
  ScoreboardState,
  SplitScreenQualifierCandidate,
  Vote,
} from './types';

import { ANIMATION_DURATION } from '@/data/data';
import { resolveThemeSpecificsForGeneralState } from '@/theme/themeSpecifics';

const isTeleportBoardAnimationEnabled = () => {
  const generalState = useGeneralStore.getState();
  const themeSpecifics = resolveThemeSpecificsForGeneralState({
    themeYear: generalState.themeYear,
    customTheme: generalState.customTheme,
  });

  return themeSpecifics.boardAnimationMode === 'teleport';
};

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

const SPLIT_SCREEN_MAX_EXPOSURE = 3;
const SPLIT_SCREEN_EXPOSURE_ALPHA = 1.5;

const canUseSplitScreenForRemainingSlots = (
  remainingSlots: number,
  enableSplitScreenForLastQualifier: boolean,
): boolean =>
  remainingSlots > 1 || (enableSplitScreenForLastQualifier && remainingSlots === 1);

const clampSplitScreenCandidatesCount = (value: number): number =>
  Math.max(2, Math.min(6, value || 3));

const getQualifiersAmount = (stage: EventStage): number =>
  stage.qualifiesTo?.reduce((sum, target) => {
    if (target.minRank && target.maxRank) {
      return sum + (target.maxRank - target.minRank + 1);
    }

    return sum + target.amount;
  }, 0) || 0;

const hasQualifiedFromStage = (country: Country, stageId: string): boolean =>
  !!country.qualifiedFromStageIds?.includes(stageId);

const getCountryTotalPoints = (
  stage: EventStage,
  country: Country,
  stageCountryPoints?: Record<string, any>,
): number => {
  const points = stageCountryPoints?.[country.code];

  if (stage.votingMode === StageVotingMode.COMBINED) {
    return points?.combinedPoints || 0;
  }

  if (stage.votingMode === StageVotingMode.JURY_ONLY) {
    return points?.juryPoints || 0;
  }

  if (stage.votingMode === StageVotingMode.TELEVOTE_ONLY) {
    return points?.televotePoints || 0;
  }

  return (points?.juryPoints || 0) + (points?.televotePoints || 0);
};

const getRankedCountriesWithPoints = (
  stage: EventStage,
  stageCountryPoints?: Record<string, any>,
): (Country & { totalPoints: number })[] =>
  stage.countries
    .map((country) => ({
      ...country,
      totalPoints: getCountryTotalPoints(stage, country, stageCountryPoints),
    }))
    .sort((a, b) => b.totalPoints - a.totalPoints);

const getCurrentSplitScreenContext = (state: ScoreboardState) => {
  const currentStage = state.getCurrentStage();
  if (!currentStage || currentStage.isOver) return null;

  if (!currentStage.countries || currentStage.countries.length === 0) return null;

  const qualifiersAmount = getQualifiersAmount(currentStage);
  if (qualifiersAmount <= 0) return null;

  const qualifiedCount = currentStage.countries.filter((country) =>
    hasQualifiedFromStage(country, currentStage.id),
  ).length;
  const remainingSlots = Math.max(qualifiersAmount - qualifiedCount, 0);

  return {
    currentStage,
    qualifiersAmount,
    qualifiedCount,
    remainingSlots,
  };
};

const weightedPick = <T>(
  items: T[],
  getWeight: (item: T) => number,
): T | null => {
  if (items.length === 0) return null;

  const weights = items.map((item) => Math.max(getWeight(item), 0));
  const totalWeight = weights.reduce((sum, weight) => sum + weight, 0);

  if (totalWeight <= 0) {
    return items[Math.floor(Math.random() * items.length)] || null;
  }

  const target = Math.random() * totalWeight;
  let current = 0;

  for (let i = 0; i < items.length; i += 1) {
    current += weights[i];
    if (target <= current) {
      return items[i];
    }
  }

  return items[items.length - 1] || null;
};

const weightedSampleWithoutReplacement = <T>(
  items: T[],
  count: number,
  getWeight: (item: T) => number,
): T[] => {
  if (count <= 0 || items.length === 0) return [];

  const source = [...items];
  const selected: T[] = [];

  while (source.length > 0 && selected.length < count) {
    const picked = weightedPick(source, getWeight);
    if (!picked) break;

    selected.push(picked);

    const pickedIndex = source.indexOf(picked);
    if (pickedIndex >= 0) {
      source.splice(pickedIndex, 1);
    }
  }

  return selected;
};

const shuffleArray = <T>(items: T[]): T[] => {
  const copy = [...items];
  for (let i = copy.length - 1; i > 0; i -= 1) {
    const randomIndex = Math.floor(Math.random() * (i + 1));
    [copy[i], copy[randomIndex]] = [copy[randomIndex], copy[i]];
  }
  return copy;
};

const pickSplitScreenCandidates = (
  state: ScoreboardState,
  currentStage: EventStage,
  qualifiedCount: number,
): SplitScreenQualifierCandidate[] => {
  const stageCountryPoints = state.countryPoints[currentStage.id];
  const rankedRemainingCountries = getRankedCountriesWithPoints(
    currentStage,
    stageCountryPoints,
  ).filter((country) => !hasQualifiedFromStage(country, currentStage.id));

  if (rankedRemainingCountries.length === 0) return [];

  const qualifiersAmount = getQualifiersAmount(currentStage);
  const remainingSlots = Math.max(qualifiersAmount - qualifiedCount, 0);
  if (remainingSlots <= 0) return [];

  const maxCandidates = clampSplitScreenCandidatesCount(
    useGeneralStore.getState().settings.splitScreenCandidatesCount,
  );
  const candidateCount = Math.min(maxCandidates, rankedRemainingCountries.length);

  if (rankedRemainingCountries.length <= candidateCount) {
    return shuffleArray(rankedRemainingCountries).map((country) => ({
      code: country.code,
      name: country.name,
    }));
  }

  const shownCountByCountry =
    state.splitScreenQualifierShownCountByStage[currentStage.id] || {};
  const lastShownCountryCodes =
    state.splitScreenQualifierLastShownByStage[currentStage.id] || [];
  const lastShownSet = new Set(lastShownCountryCodes);
  const rankByCode = rankedRemainingCountries.reduce<Record<string, number>>(
    (acc, country, index) => {
      acc[country.code] = index + 1;
      return acc;
    },
    {},
  );

  const exposurePenalty = (code: string): number =>
    1 / Math.pow(1 + (shownCountByCountry[code] || 0), SPLIT_SCREEN_EXPOSURE_ALPHA);
  const recentPenalty = (code: string): number =>
    lastShownSet.has(code) ? 0.3 : 1;
  const cutoffBoost = (code: string): number => {
    const rank = rankByCode[code] || Number.MAX_SAFE_INTEGER;
    const distance = Math.abs(rank - remainingSlots);
    if (distance <= 1) return 1.7;
    if (distance <= 3) return 1.35;
    if (rank <= remainingSlots) return 1.15;
    return 1;
  };

  const underSoftCap = (country: Country) =>
    (shownCountByCountry[country.code] || 0) < SPLIT_SCREEN_MAX_EXPOSURE;

  const wouldQualifyNow = rankedRemainingCountries.slice(
    0,
    Math.min(remainingSlots, rankedRemainingCountries.length),
  );

  const anchorPoolWithCap = wouldQualifyNow.filter(underSoftCap);
  const anchorPool =
    anchorPoolWithCap.length > 0
      ? anchorPoolWithCap
      : wouldQualifyNow.length > 0
        ? wouldQualifyNow
        : rankedRemainingCountries;

  const anchor = weightedPick(
    anchorPool,
    (country) => exposurePenalty(country.code) * recentPenalty(country.code),
  );

  const anchorCountry = anchor || rankedRemainingCountries[0];
  const decoySource = rankedRemainingCountries.filter(
    (country) => country.code !== anchorCountry.code,
  );
  const decoySourceWithCap = decoySource.filter(underSoftCap);
  const decoyPool =
    decoySourceWithCap.length >= candidateCount - 1
      ? decoySourceWithCap
      : decoySource;

  const decoys = weightedSampleWithoutReplacement(
    decoyPool,
    candidateCount - 1,
    (country) =>
      exposurePenalty(country.code) *
      recentPenalty(country.code) *
      cutoffBoost(country.code),
  );

  if (decoys.length < candidateCount - 1) {
    const selectedCodes = new Set([
      anchorCountry.code,
      ...decoys.map((country) => country.code),
    ]);
    const fallback = shuffleArray(decoySource).filter(
      (country) => !selectedCodes.has(country.code),
    );

    for (const country of fallback) {
      decoys.push(country);
      if (decoys.length >= candidateCount - 1) break;
    }
  }

  return shuffleArray([anchorCountry, ...decoys]).map((country) => ({
    code: country.code,
    name: country.name,
  }));
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
  openSplitScreenQualifierModal: () => boolean;
  closeSplitScreenQualifierModal: () => void;
  computeSplitScreenQualifierCandidatesIfNeeded: () => boolean;
  pickQualifierFromSplitScreenCandidatesRandomly: () => void;
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
      if (isTeleportBoardAnimationEnabled()) {
        get().setShouldResetLastPointsAfterTeleport(true);
      } else {
        const timerId = setTimeout(() => {
          get().resetLastPoints();
          set({ lastPointsResetTimerId: null });
        }, ANIMATION_DURATION);

        set({ lastPointsResetTimerId: timerId });
      }
    }

    const isFirstPointOfSet = state.votingPointsIndex === 0;

    if (isFirstPointOfSet && state.lastPointsResetTimerId) {
      clearTimeout(state.lastPointsResetTimerId);
    }
    if (isFirstPointOfSet && isTeleportBoardAnimationEnabled()) {
      get().setShouldResetLastPointsAfterTeleport(false);
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
        isLastSimulationAnimationFinished: winnerCountry ? false : true,
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
              currentStage.runningOrder,
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
      if (isTeleportBoardAnimationEnabled()) {
        get().setShouldResetLastPointsAfterTeleport(true);
      } else {
        const timerId = setTimeout(() => {
          get().resetLastPoints();
          set({ lastPointsResetTimerId: null });
        }, ANIMATION_DURATION);

        set({ lastPointsResetTimerId: timerId });
      }
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
        isLastSimulationAnimationFinished: winnerCountry ? false : true,
        showQualificationResults,
      });

      return;
    }

    const televoteCountryIndex = getLastCountryIndexByPoints(
      updatedCountries,
      getLastCountryCodeByPoints(
        getRemainingCountries(updatedCountries, undefined),
        currentStage.runningOrder,
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
        currentStage.runningOrder,
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
      isLastSimulationAnimationFinished: winnerCountry ? false : true,
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

    if (isTeleportBoardAnimationEnabled()) {
      get().setShouldResetLastPointsAfterTeleport(true);
    } else {
      const timerId = setTimeout(() => {
        get().resetLastPoints();
        set({ lastPointsResetTimerId: null });
      }, ANIMATION_DURATION);

      set({ lastPointsResetTimerId: timerId });
    }

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
        isLastSimulationAnimationFinished: winnerCountry ? false : true,
        showQualificationResults,
      });

      return;
    }

    const televoteCountryIndex = getLastCountryIndexByPoints(
      updatedCountries,
      getLastCountryCodeByPoints(
        getRemainingCountries(updatedCountries, undefined),
        currentStage.runningOrder,
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
    if (isTeleportBoardAnimationEnabled()) {
      get().setShouldResetLastPointsAfterTeleport(true);
    } else {
      const timerId = setTimeout(() => {
        get().resetLastPoints();
        set({ lastPointsResetTimerId: null });
      }, ANIMATION_DURATION);

      set({ lastPointsResetTimerId: timerId });
    }

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
        isLastSimulationAnimationFinished: winnerCountry ? false : true,
        showQualificationResults,
      });
    } else {
      // Transition to televote
      const televoteCountryIndex = getLastCountryIndexByPoints(
        updatedCountries,
        getLastCountryCodeByPoints(
          getRemainingCountries(updatedCountries, undefined),
          currentStage.runningOrder,
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
      isLastSimulationAnimationFinished: winnerCountry ? false : true,
      showQualificationResults,
      televotingProgress: state.televotingProgress + countriesToVote.length,
    });
  },

  computeSplitScreenQualifierCandidatesIfNeeded: () => {
    const state = get();
    const context = getCurrentSplitScreenContext(state);
    if (!context) return false;

    const { currentStage, qualifiedCount, remainingSlots } = context;
    const { enableSplitScreenForLastQualifier } = useGeneralStore.getState()
      .settings;
    const canUseSplitScreen = canUseSplitScreenForRemainingSlots(
      remainingSlots,
      enableSplitScreenForLastQualifier,
    );

    if (!canUseSplitScreen) return false;

    const hasCachedCandidates =
      state.splitScreenQualifierCandidatesStageId === currentStage.id &&
      state.splitScreenQualifierCandidatesQualifiedCount === qualifiedCount &&
      state.splitScreenQualifierCandidates.length > 0;

    if (hasCachedCandidates) {
      return true;
    }

    const candidates = pickSplitScreenCandidates(state, currentStage, qualifiedCount);
    if (candidates.length === 0) return false;

    set((s) => {
      const currentShownCountByStage =
        s.splitScreenQualifierShownCountByStage[currentStage.id] || {};

      const nextShownCountByStage = { ...currentShownCountByStage };
      candidates.forEach((candidate) => {
        nextShownCountByStage[candidate.code] =
          (nextShownCountByStage[candidate.code] || 0) + 1;
      });

      return {
        splitScreenQualifierCandidates: candidates,
        splitScreenQualifierCandidatesStageId: currentStage.id,
        splitScreenQualifierCandidatesQualifiedCount: qualifiedCount,
        splitScreenQualifierShownCountByStage: {
          ...s.splitScreenQualifierShownCountByStage,
          [currentStage.id]: nextShownCountByStage,
        },
        splitScreenQualifierLastShownByStage: {
          ...s.splitScreenQualifierLastShownByStage,
          [currentStage.id]: candidates.map((candidate) => candidate.code),
        },
      };
    });

    return true;
  },

  openSplitScreenQualifierModal: () => {
    if (get().splitScreenQualifierModalOpen) {
      return true;
    }

    const hasCandidates = get().computeSplitScreenQualifierCandidatesIfNeeded();
    if (!hasCandidates) {
      return false;
    }

    set({
      splitScreenQualifierModalOpen: true,
    });

    return true;
  },

  closeSplitScreenQualifierModal: () => {
    if (!get().splitScreenQualifierModalOpen) {
      return;
    }

    set({
      splitScreenQualifierModalOpen: false,
    });
  },

  pickQualifierFromSplitScreenCandidatesRandomly: () => {
    const state = get();
    if (state.splitScreenQualifierCandidates.length === 0) return;

    const randomIndex = Math.floor(
      Math.random() * state.splitScreenQualifierCandidates.length,
    );
    const selectedCandidate = state.splitScreenQualifierCandidates[randomIndex];
    if (!selectedCandidate) return;

    set({
      splitScreenQualifierModalOpen: false,
    });

    get().pickQualifier(selectedCandidate.code);
  },

  pickQualifier: (countryCode: string) => {
    const state = get();
    const currentStage = state.getCurrentStage();

    if (!currentStage || currentStage.isOver) return;

    const qualifiersAmount = getQualifiersAmount(currentStage);
    if (qualifiersAmount === 0) return;

    const stageCountryPoints = state.countryPoints[currentStage.id];
    if (!stageCountryPoints) return;

    const predefinedVotes = state.predefinedVotes[currentStage.id];
    if (!predefinedVotes) return;

    if (!currentStage.countries || currentStage.countries.length === 0) return;

    // Check if there are enough countries to qualify
    const availableCountries = currentStage.countries.filter(
      (country) => !hasQualifiedFromStage(country, currentStage.id),
    );
    if (availableCountries.length === 0) return;

    // Check if the selected country is already qualified for this stage
    const selectedCountry = currentStage.countries.find(
      (country) => country.code === countryCode,
    );
    if (!selectedCountry || hasQualifiedFromStage(selectedCountry, currentStage.id))
      return;

    // Get the top N countries by points (excluding already qualified ones)
    const countriesWithPoints = getRankedCountriesWithPoints(
      currentStage,
      stageCountryPoints,
    );

    const topCountries = countriesWithPoints
      .slice(0, qualifiersAmount)
      .filter((country) => !hasQualifiedFromStage(country, currentStage.id));

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

      // If stage is complete, assign points to all countries and mark stage as over
      if (isStageComplete) {
        const finalUpdatedEventStages = updatedEventStages.map((stage) =>
          stage.id === currentStage.id
            ? {
                ...stage,
                countries: stage.countries.map((country) =>
                  assignPointsToCountry(
                    currentStage,
                    stageCountryPoints[country.code],
                    country,
                  ),
                ),
                isOver: true,
              }
            : stage,
        );

        return {
          eventStages: finalUpdatedEventStages,
          showQualificationResults: true,
          qualificationOrder: newQualificationOrder,
          splitScreenQualifierModalOpen: false,
          splitScreenQualifierCandidates: [],
          splitScreenQualifierCandidatesStageId: null,
          splitScreenQualifierCandidatesQualifiedCount: null,
        };
      }

      // Otherwise, just update the stages and qualification order
      return {
        eventStages: updatedEventStages,
        qualificationOrder: newQualificationOrder,
        splitScreenQualifierModalOpen: false,
        splitScreenQualifierCandidates: [],
        splitScreenQualifierCandidatesStageId: null,
        splitScreenQualifierCandidatesQualifiedCount: null,
      };
    });
  },

  pickQualifierRandomly: () => {
    const state = get();
    const currentStage = state.getCurrentStage();

    if (!currentStage || currentStage.isOver) return;

    const qualifiersAmount = getQualifiersAmount(currentStage);
    if (qualifiersAmount === 0) return;

    const stageCountryPoints = state.countryPoints[currentStage.id];
    if (!stageCountryPoints) return;

    const predefinedVotes = state.predefinedVotes[currentStage.id];
    if (!predefinedVotes) return;

    if (!currentStage.countries || currentStage.countries.length === 0) return;

    // Check if there are enough countries to qualify
    const availableCountries = currentStage.countries.filter(
      (country) => !hasQualifiedFromStage(country, currentStage.id),
    );
    if (availableCountries.length === 0) return;

    const countriesWithPoints = getRankedCountriesWithPoints(
      currentStage,
      stageCountryPoints,
    );

    // TODO: go through .sort( to always use the running order; fix the issue when selecting televote active country
    const topCountries = countriesWithPoints
      .slice(0, qualifiersAmount)
      .filter((country) => !hasQualifiedFromStage(country, currentStage.id));

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

      // If stage is complete, assign points to all countries and mark stage as over
      if (isStageComplete) {
        const finalUpdatedEventStages = updatedEventStages.map((stage) =>
          stage.id === currentStage.id
            ? {
                ...stage,
                countries: stage.countries.map((country) =>
                  assignPointsToCountry(
                    currentStage,
                    stageCountryPoints[country.code],
                    country,
                  ),
                ),
                isOver: true,
              }
            : stage,
        );

        return {
          eventStages: finalUpdatedEventStages,
          showQualificationResults: true,
          qualificationOrder: newQualificationOrder,
          splitScreenQualifierModalOpen: false,
          splitScreenQualifierCandidates: [],
          splitScreenQualifierCandidatesStageId: null,
          splitScreenQualifierCandidatesQualifiedCount: null,
        };
      }

      // Otherwise, just update the stages and qualification order
      return {
        eventStages: updatedEventStages,
        qualificationOrder: newQualificationOrder,
        splitScreenQualifierModalOpen: false,
        splitScreenQualifierCandidates: [],
        splitScreenQualifierCandidatesStageId: null,
        splitScreenQualifierCandidatesQualifiedCount: null,
      };
    });
  },
});
