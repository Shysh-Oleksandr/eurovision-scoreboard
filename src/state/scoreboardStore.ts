import { create } from 'zustand';

import { devtools } from 'zustand/middleware';

import { POINTS_ARRAY } from '../data/data';
import { getNextVotingPoints } from '../helpers/getNextVotingPoints';
import {
  BaseCountry,
  Country,
  CountryWithPoints,
  EventMode,
  SemiFinalQualifiersAmount,
  EventStage,
  StageVotingMode,
  StageId,
} from '../models';

import { useCountriesStore } from './countriesStore';

interface ScoreboardState {
  // State
  eventStages: EventStage[];
  currentStageId: string | null;
  votingCountryIndex: number;
  votingPoints: number;
  shouldShowLastPoints: boolean;
  shouldClearPoints: boolean;
  winnerCountry: Country | null;
  eventMode: EventMode;
  showQualificationResults: boolean;
  qualifiedCountries: Country[]; // TODO:save only codes
  semiFinalQualifiers: SemiFinalQualifiersAmount;
  restartCounter: number;
  showAllParticipants: boolean;
  isFinalAnimationFinished: boolean;
  canDisplayPlaceAnimation: boolean;
  televotingProgress: number;

  // Actions
  getCurrentStage: () => EventStage;
  getCountryInSemiFinal: (countryCode: string) => Country | null;
  setEventStages: (stages: EventStage[]) => void;
  initializeCountries: () => void;
  giveJuryPoints: (countryCode: string) => void;
  giveTelevotePoints: (countryCode: string, votingPoints: number) => void;
  giveRandomJuryPoints: (isRandomFinishing?: boolean) => void;
  resetLastPoints: () => void;
  hideLastReceivedPoints: () => void;
  startEvent: (mode: EventMode, selectedCountries: BaseCountry[]) => void;
  continueToNextPhase: () => void;
  closeQualificationResults: () => void;
  setSemiFinalQualifiers: (
    semiFinalQualifiers: SemiFinalQualifiersAmount,
  ) => void;
  toggleShowAllParticipants: () => void;
  setFinalAnimationFinished: (isFinished: boolean) => void;
  setCanDisplayPlaceAnimation: (canDisplay: boolean) => void;
}

const getSemiFinalStage = (
  countries: BaseCountry[],
  isFirstSF: boolean,
): EventStage => {
  return {
    id: isFirstSF ? StageId.SF1 : StageId.SF2,
    name: isFirstSF ? 'Semi-Final 1' : 'Semi-Final 2',
    votingMode: StageVotingMode.TELEVOTE_ONLY,
    countries: countries
      .sort((a, b) => a.name.localeCompare(b.name))
      .map((country) => ({
        ...country,
        juryPoints: 0,
        televotePoints: 0,
        points: 0,
        lastReceivedPoints: null,
      })),
    isOver: false,
    isJuryVoting: false,
  };
};
const getRemainingCountries = (
  countries: Country[],
  countryCode: string | undefined,
) =>
  countries.filter(
    (country) => !country.isVotingFinished && country.code !== countryCode,
  );

const getLastCountryCodeByPoints = (remainingCountries: Country[]) =>
  remainingCountries.length
    ? remainingCountries.slice().sort((a, b) => {
        const pointsComparison = b.points - a.points;

        return pointsComparison !== 0
          ? pointsComparison
          : a.name.localeCompare(b.name);
      })[remainingCountries.length - 1].code
    : '';

const getLastCountryIndexByPoints = (
  countries: Country[],
  countryCode: string,
) => countries.findIndex((country) => country.code === countryCode);

const isVotingOver = (lastCountryIndexByPoints: number) =>
  lastCountryIndexByPoints === -1;

export const useScoreboardStore = create<ScoreboardState>()(
  devtools(
    (set, get) => ({
      // Initial state
      eventStages: [],
      currentStageId: null,
      votingCountryIndex: 0,
      votingPoints: 1,
      shouldShowLastPoints: true,
      shouldClearPoints: false,
      winnerCountry: null,
      eventMode: EventMode.GRAND_FINAL_ONLY,
      showQualificationResults: false,
      qualifiedCountries: [],
      semiFinalQualifiers: { SF1: 10, SF2: 10 },
      restartCounter: 0,
      showAllParticipants: false,
      isFinalAnimationFinished: false,
      canDisplayPlaceAnimation: true,
      televotingProgress: 0,

      // Actions
      setEventStages: (stages: EventStage[]) => {
        set({ eventStages: stages });
      },

      startEvent: (mode: EventMode, selectedCountries: BaseCountry[]) => {
        const countriesStore = useCountriesStore.getState();

        countriesStore.setSelectedCountries(selectedCountries);

        const newEventStages: EventStage[] = [];

        if (mode === EventMode.SEMI_FINALS_AND_GRAND_FINAL) {
          const sf1Countries: BaseCountry[] = [];
          const sf2Countries: BaseCountry[] = [];
          const autoQualifiers: BaseCountry[] = [];

          selectedCountries.forEach((c) => {
            if (c.semiFinalGroup === 'SF1') {
              sf1Countries.push(c);
            } else if (c.semiFinalGroup === 'SF2') {
              sf2Countries.push(c);
            } else if (c.isAutoQualified) {
              autoQualifiers.push(c);
            }
          });

          if (sf1Countries.length > 0) {
            newEventStages.push(getSemiFinalStage(sf1Countries, true));
          }
          if (sf2Countries.length > 0) {
            newEventStages.push(getSemiFinalStage(sf2Countries, false));
          }

          const autoQualifiersCountries = autoQualifiers.map((country) => ({
            ...country,
            juryPoints: 0,
            televotePoints: 0,
            points: 0,
            lastReceivedPoints: null,
          }));

          newEventStages.push({
            id: StageId.GF,
            name: 'Grand Final',
            votingMode: StageVotingMode.TELEVOTE_AND_JURY,
            countries: autoQualifiersCountries,
            isOver: false,
            isJuryVoting: true,
            isLastStage: true,
          });
        } else {
          // GRAND_FINAL_ONLY
          const stage: EventStage = {
            id: StageId.GF,
            name: 'Grand Final',
            votingMode: StageVotingMode.TELEVOTE_AND_JURY,
            countries: countriesStore.getInitialCountries(),
            isOver: false,
            isJuryVoting: true,
            isLastStage: true,
          };

          newEventStages.push(stage);
        }

        const firstStage = newEventStages[0] ?? null;

        let firstVotingCountryIndex = 0;

        if (
          firstStage &&
          firstStage.votingMode === StageVotingMode.TELEVOTE_ONLY
        ) {
          firstVotingCountryIndex = firstStage.countries.length - 1;
        }

        set({
          eventStages: newEventStages,
          currentStageId: firstStage?.id ?? null,
          eventMode: mode,
          votingCountryIndex: firstVotingCountryIndex,
          votingPoints: 1,
          shouldShowLastPoints: true,
          shouldClearPoints: false,
          winnerCountry: null,
          showQualificationResults: false,
          qualifiedCountries: [],
          restartCounter: get().restartCounter + 1,
          showAllParticipants: false,
          isFinalAnimationFinished: false,
          canDisplayPlaceAnimation: true,
          televotingProgress: 0,
        });
      },

      continueToNextPhase: () => {
        const state = get();
        const currentStage = state.eventStages.find(
          (s) => s.id === state.currentStageId,
        );

        if (!currentStage) return;

        const currentStageIndex = state.eventStages.findIndex(
          (s) => s.id === state.currentStageId,
        );
        const nextStage =
          currentStageIndex !== -1
            ? state.eventStages[currentStageIndex + 1]
            : undefined;

        if (!nextStage) return;

        const updatedEventStages = [...state.eventStages];
        let nextStageCountries = nextStage.countries;

        let nextVotingCountryIndex = nextStageCountries.length - 1;

        if (nextStage.id === StageId.GF) {
          nextVotingCountryIndex = 0;

          const qualifiedFromSemiCountries = state.eventStages
            .slice(0, currentStageIndex + 1)
            .flatMap((s) => s.countries)
            .filter((c) => c.isQualifiedFromSemi)
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
          qualifiedCountries: [],
          showAllParticipants: false,
          isFinalAnimationFinished: false,
          televotingProgress: 0,
        });
      },
      getCurrentStage() {
        const state = get();
        const currentStage = state.eventStages.find(
          (s) => s.id === state.currentStageId,
        );

        return currentStage;
      },

      getCountryInSemiFinal(countryCode: string) {
        const state = get();
        const stage = state.eventStages.find(
          (s) =>
            s.countries.some((c) => c.code === countryCode) &&
            s.id !== StageId.GF,
        );
        const country = stage?.countries.find((c) => c.code === countryCode);

        return country ?? null;
      },

      giveJuryPoints: (countryCode: string) => {
        const state = get();
        const countriesStore = useCountriesStore.getState();
        const currentStage = state.getCurrentStage();

        if (!currentStage) return;

        const countriesWithPoints = currentStage.countries.filter(
          (country) => country.lastReceivedPoints !== null,
        );
        const shouldReset = countriesWithPoints.length === POINTS_ARRAY.length;

        const isNextVotingCountry = state.votingPoints === 12;
        const nextVotingCountryIndex =
          state.votingCountryIndex + (isNextVotingCountry ? 1 : 0);
        const isJuryVotingOver =
          nextVotingCountryIndex === countriesStore.getVotingCountriesLength();

        set({
          votingPoints: getNextVotingPoints(state.votingPoints),
          votingCountryIndex: isJuryVotingOver
            ? getLastCountryIndexByPoints(
                currentStage.countries,
                getLastCountryCodeByPoints(
                  getRemainingCountries(currentStage.countries, countryCode),
                ),
              )
            : nextVotingCountryIndex,
          eventStages: state.eventStages.map((stage) => {
            if (stage.id === state.currentStageId) {
              return {
                ...stage,
                isJuryVoting: !isJuryVotingOver,
                countries: stage.countries.map((country) => {
                  if (country.code === countryCode) {
                    return {
                      ...country,
                      juryPoints: country.juryPoints + state.votingPoints,
                      points: country.points + state.votingPoints,
                      lastReceivedPoints: state.votingPoints,
                    };
                  }

                  return country;
                }),
              };
            }

            return stage;
          }),
          shouldShowLastPoints: !shouldReset,
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

        const winnerCountry =
          isVotingFinished && currentStage.isLastStage
            ? updatedCountries.reduce((prev, current) =>
                (() => {
                  if (prev.points > current.points) return prev;
                  if (prev.points < current.points) return current;

                  return prev.name.localeCompare(current.name) <= 0
                    ? prev
                    : current;
                })(),
              )
            : null;

        const showQualificationResults =
          isVotingFinished && !currentStage.isLastStage;

        if (showQualificationResults) {
          const sortedCountries = [...updatedCountries].sort((a, b) => {
            const pointsComparison = b.points - a.points;

            return pointsComparison !== 0
              ? pointsComparison
              : a.name.localeCompare(b.name);
          });
          const qualifiedCountries = sortedCountries.slice(
            0,
            state.semiFinalQualifiers[
              state.currentStageId === StageId.SF1 ? 'SF1' : 'SF2'
            ],
          );

          updatedCountries = updatedCountries.map((country) => ({
            ...country,
            isQualifiedFromSemi: qualifiedCountries.some(
              (c) => c.code === country.code,
            ),
          }));
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

      giveRandomJuryPoints: (isRandomFinishing = false) => {
        const state = get();
        const countriesStore = useCountriesStore.getState();
        const currentStage = state.getCurrentStage();

        if (!currentStage) return;
        const votingCountries = countriesStore.getVotingCountries();

        const isJuryVotingOver =
          state.votingCountryIndex === votingCountries.length - 1;
        const votingCountryCode =
          votingCountries[state.votingCountryIndex].code;

        const countriesWithRecentPoints: CountryWithPoints[] = [];
        const initialCountriesWithPointsLength = currentStage.countries.filter(
          (country) => country.lastReceivedPoints !== null,
        ).length;

        const pointsLeftArray = POINTS_ARRAY.filter(
          (points) => points >= state.votingPoints,
        );

        pointsLeftArray.forEach((points) => {
          const availableCountries = currentStage.countries.filter(
            (country) =>
              !countriesWithRecentPoints.some(
                (countryWithPoints) => countryWithPoints.code === country.code,
              ) &&
              country.code !== votingCountryCode &&
              (country.lastReceivedPoints === null ||
                initialCountriesWithPointsLength >= POINTS_ARRAY.length),
          );

          const randomCountryIndex = Math.floor(
            Math.random() * availableCountries.length,
          );
          const randomCountry = availableCountries[randomCountryIndex];

          if (randomCountry) {
            countriesWithRecentPoints.push({
              code: randomCountry.code,
              points,
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
          shouldShowLastPoints: !isRandomFinishing,
        });
      },

      resetLastPoints: () => {
        const state = get();
        const currentStage = state.eventStages.find(
          (s) => s.id === state.currentStageId,
        );

        if (!currentStage) return;

        set({
          eventStages: state.eventStages.map((stage) => {
            if (stage.id === state.currentStageId) {
              return {
                ...stage,
                countries: stage.countries.map((country) => ({
                  ...country,
                  lastReceivedPoints: null,
                })),
              };
            }

            return stage;
          }),
        });
      },

      hideLastReceivedPoints: () => {
        set({
          shouldShowLastPoints: false,
        });
      },

      setSemiFinalQualifiers: (
        semiFinalQualifiers: SemiFinalQualifiersAmount,
      ) => {
        set({
          semiFinalQualifiers,
        });
      },

      closeQualificationResults: () => {
        set({
          showQualificationResults: false,
        });
      },

      toggleShowAllParticipants: () => {
        set((state) => ({
          showAllParticipants: !state.showAllParticipants,
        }));
      },

      setFinalAnimationFinished: (isFinished: boolean) => {
        set({
          isFinalAnimationFinished: isFinished,
        });
      },

      setCanDisplayPlaceAnimation: (canDisplay: boolean) => {
        set({
          canDisplayPlaceAnimation: canDisplay,
        });
      },
    }),
    { name: 'scoreboard-store' },
  ),
);
