import { StateCreator } from 'zustand';

import { POINTS_ARRAY } from '../../data/data';
import { getNextVotingPoints } from '../../helpers/getNextVotingPoints';
import {
  Country,
  CountryWithPoints,
  EventStage,
  StageVotingMode,
} from '../../models';
import { useCountriesStore } from '../countriesStore';

import {
  getLastCountryCodeByPoints,
  getLastCountryIndexByPoints,
  getRemainingCountries,
  handleStageEnd,
  isVotingOver,
} from './helpers';
import { ScoreboardState, Vote } from './types';

type VotingActions = {
  giveJuryPoints: (countryCode: string) => void;
  giveTelevotePoints: (countryCode: string, votingPoints: number) => void;
  giveRandomJuryPoints: () => void;
  finishJuryVotingRandomly: () => void;
  finishTelevoteVotingRandomly: () => void;
  givePredefinedJuryPoint: () => void;
  givePredefinedTelevotePoints: () => void;
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
    const currentStage = state.getCurrentStage();

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
        const voteForPointsIndex = votesForCountry.findIndex(
          (v) => v.points === state.votingPoints,
        );
        const originalCountryCode =
          voteForPointsIndex !== -1
            ? votesForCountry[voteForPointsIndex].countryCode
            : null;

        if (originalCountryCode && originalCountryCode !== countryCode) {
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
    const shouldReset = countriesWithPoints.length === POINTS_ARRAY.length;

    const isNextVotingCountry = state.votingPoints === 12;
    const nextVotingCountryIndex =
      state.votingCountryIndex + (isNextVotingCountry ? 1 : 0);
    const isJuryVotingOver =
      nextVotingCountryIndex === countriesStore.getVotingCountriesLength();

    const updatedCountries = currentStage.countries.map((country) => {
      if (country.code === countryCode) {
        return {
          ...country,
          juryPoints: country.juryPoints + state.votingPoints,
          points: country.points + state.votingPoints,
          lastReceivedPoints: state.votingPoints,
        };
      }

      return country;
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
      votingPoints: getNextVotingPoints(s.votingPoints),
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
    }));
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

  giveRandomJuryPoints: () => {
    const state = get();
    const countriesStore = useCountriesStore.getState();
    const currentStage = state.getCurrentStage();

    if (!currentStage) return;
    const votingCountries = countriesStore.getVotingCountries();

    const isJuryVotingOver =
      state.votingCountryIndex === votingCountries.length - 1;
    const votingCountryCode = votingCountries[state.votingCountryIndex].code;

    const isCombinedVoting =
      currentStage.votingMode === StageVotingMode.COMBINED;

    const predefinedJuryVotes =
      state.predefinedVotes[currentStage.id]?.[
        isCombinedVoting ? 'combined' : 'jury'
      ]?.[votingCountryCode];

    if (!predefinedJuryVotes) return;

    const countriesWithRecentPoints: CountryWithPoints[] = [];

    const pointsLeftArray = POINTS_ARRAY.filter(
      (points) => points >= state.votingPoints,
    );

    pointsLeftArray.forEach((points) => {
      const vote = predefinedJuryVotes.find((v) => v.points === points);

      if (vote) {
        countriesWithRecentPoints.push({
          code: vote.countryCode,
          points: vote.points,
        });
      }
    });

    const updatedCountries = currentStage.countries.map((country) => {
      const receivedPoints =
        countriesWithRecentPoints.find(
          (countryWithPoints) => countryWithPoints.code === country.code,
        )?.points || 0;

      return {
        ...country,
        juryPoints: country.juryPoints + receivedPoints,
        points: country.points + receivedPoints,
        lastReceivedPoints:
          receivedPoints ||
          (countriesWithRecentPoints.length >= POINTS_ARRAY.length
            ? null
            : country.lastReceivedPoints),
      };
    });

    if (
      isJuryVotingOver &&
      (currentStage.votingMode === StageVotingMode.JURY_ONLY ||
        currentStage.votingMode === StageVotingMode.COMBINED)
    ) {
      const { winnerCountry, showQualificationResults, countries } =
        handleStageEnd(updatedCountries, currentStage);

      set({
        votingPoints: 1,
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
      votingPoints: 1,
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

    if (!currentStage) return;

    const predefinedJuryVotes =
      state.predefinedVotes[currentStage.id]?.[
        currentStage.votingMode === StageVotingMode.COMBINED
          ? 'combined'
          : 'jury'
      ];

    if (!predefinedJuryVotes) return;

    const votingCountries = countriesStore.getVotingCountries();
    let countriesLeft = votingCountries.length - state.votingCountryIndex;

    let updatedCountries = [...currentStage.countries];

    while (countriesLeft > 0) {
      const votingCountryIndex = votingCountries.length - countriesLeft;
      const votingCountryCode = votingCountries[votingCountryIndex].code;

      const votesForCountry = predefinedJuryVotes[votingCountryCode];

      if (!votesForCountry) {
        countriesLeft = countriesLeft - 1;
        continue;
      }

      const countriesWithRecentPoints: CountryWithPoints[] = [];

      const isCurrentVotingCountry =
        votingCountryIndex === state.votingCountryIndex;

      const pointsToGive = isCurrentVotingCountry
        ? POINTS_ARRAY.filter((p) => p >= state.votingPoints)
        : POINTS_ARRAY;

      pointsToGive.forEach((points) => {
        const vote = votesForCountry.find((v) => v.points === points);

        if (vote) {
          countriesWithRecentPoints.push({
            code: vote.countryCode,
            points: vote.points,
          });
        }
      });

      updatedCountries = updatedCountries.map((country) => {
        const receivedPoints =
          countriesWithRecentPoints.find((c) => c.code === country.code)
            ?.points || 0;

        return {
          ...country,
          juryPoints: country.juryPoints + receivedPoints,
          points: country.points + receivedPoints,
          lastReceivedPoints: receivedPoints || country.lastReceivedPoints,
        };
      });

      countriesLeft = countriesLeft - 1;

      if (countriesLeft > 0) {
        updatedCountries = updatedCountries.map((c) => ({
          ...c,
          lastReceivedPoints: null,
        }));
      }
    }

    const isStageOver =
      currentStage.votingMode === StageVotingMode.JURY_ONLY ||
      currentStage.votingMode === StageVotingMode.COMBINED;

    if (isStageOver) {
      const { winnerCountry, showQualificationResults, countries } =
        handleStageEnd(updatedCountries, currentStage);

      set({
        votingPoints: 1,
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
        votingPoints: 1,
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
    const votingCountries = useCountriesStore.getState().getVotingCountries();

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

  givePredefinedJuryPoint: () => {
    const state = get();
    const currentStage = state.getCurrentStage();

    if (!currentStage) return;

    const votingCountry = useCountriesStore.getState().getVotingCountry();

    if (!votingCountry) return;

    const predefinedVotesForStage = state.predefinedVotes[currentStage.id];

    if (!predefinedVotesForStage) return;

    const votes =
      currentStage.votingMode === StageVotingMode.COMBINED
        ? predefinedVotesForStage.combined
        : predefinedVotesForStage.jury;

    const vote = votes?.[votingCountry.code]?.find(
      (v) => v.points === state.votingPoints,
    );

    if (!vote) return;

    get().giveJuryPoints(vote.countryCode);
  },

  givePredefinedTelevotePoints: () => {
    const state = get();
    const currentStage = state.getCurrentStage();

    if (!currentStage) return;

    const votingCountry = useCountriesStore.getState().getVotingCountry(); // This is the country receiving points

    if (!votingCountry) return;

    const predefinedTelevoteVotes =
      state.predefinedVotes[currentStage.id]?.televote;

    if (!predefinedTelevoteVotes) return;

    const votingCountries = useCountriesStore.getState().getVotingCountries();
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
      get().resetLastPoints();
    }

    get().giveTelevotePoints(votingCountry.code, totalPoints);
  },
});
