import { create } from 'zustand';

import { devtools } from 'zustand/middleware';

import { POINTS_ARRAY } from '../data/data';
import { getNextVotingPoints } from '../helpers/getNextVotingPoints';
import {
  BaseCountry,
  Country,
  CountryWithPoints,
  EventMode,
  EventPhase,
  SemiFinalQualifiersAmount,
} from '../models';

import { useCountriesStore } from './countriesStore';

interface ScoreboardState {
  // State
  countries: Country[]; // countries for event, e.g., only for semi-final 1, 2 or grand final
  isJuryVoting: boolean;
  votingCountryIndex: number;
  votingPoints: number;
  shouldShowLastPoints: boolean;
  shouldClearPoints: boolean;
  winnerCountry: Country | null;
  eventMode: EventMode;
  eventPhase: EventPhase;
  showQualificationResults: boolean;
  qualifiedCountries: Country[];
  semiFinalQualifiers: SemiFinalQualifiersAmount;
  restartCounter: number;
  showAllParticipants: boolean;
  isFinalAnimationFinished: boolean;
  canDisplayPlaceAnimation: boolean;

  // Actions
  giveJuryPoints: (countryCode: string) => void;
  giveTelevotePoints: (countryCode: string, votingPoints: number) => void;
  giveRandomJuryPoints: (isRandomFinishing?: boolean) => void;
  resetLastPoints: () => void;
  hideLastReceivedPoints: () => void;
  startEvent: (mode: EventMode, selectedCountries: BaseCountry[]) => void;
  setEventPhase: (phase: EventPhase) => void;
  continueToNextPhase: () => void;
  closeQualificationResults: () => void;
  setSemiFinalQualifiers: (
    semiFinalQualifiers: SemiFinalQualifiersAmount,
  ) => void;
  toggleShowAllParticipants: () => void;
  setFinalAnimationFinished: (isFinished: boolean) => void;
  setCanDisplayPlaceAnimation: (canDisplay: boolean) => void;
}

const shouldResetLastPoints = (countriesWithPoints: CountryWithPoints[]) =>
  countriesWithPoints.length === POINTS_ARRAY.length;

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
      countries: useCountriesStore.getState().getInitialCountries(),
      isJuryVoting: true,
      votingCountryIndex: 0,
      votingPoints: 1,
      shouldShowLastPoints: true,
      shouldClearPoints: false,
      winnerCountry: null,
      eventMode: EventMode.GRAND_FINAL_ONLY,
      eventPhase: EventPhase.COUNTRY_SELECTION,
      showQualificationResults: false,
      qualifiedCountries: [],
      semiFinalQualifiers: { SF1: 10, SF2: 10 },
      restartCounter: 0,
      showAllParticipants: false,
      isFinalAnimationFinished: false,
      canDisplayPlaceAnimation: true,

      // Actions
      giveJuryPoints: (countryCode: string) => {
        const state = get();
        const countriesStore = useCountriesStore.getState();

        const countriesWithPoints = state.countries.filter(
          (country) => country.lastReceivedPoints !== null,
        );
        const shouldReset = shouldResetLastPoints(countriesWithPoints);

        const isNextVotingCountry = state.votingPoints === 12;
        const nextVotingCountryIndex =
          state.votingCountryIndex + (isNextVotingCountry ? 1 : 0);
        const isJuryVotingOver =
          nextVotingCountryIndex === countriesStore.getVotingCountriesLength();

        set({
          votingPoints: getNextVotingPoints(state.votingPoints),
          votingCountryIndex: isJuryVotingOver
            ? getLastCountryIndexByPoints(
                state.countries,
                getLastCountryCodeByPoints(
                  getRemainingCountries(state.countries, countryCode),
                ),
              )
            : nextVotingCountryIndex,
          isJuryVoting: !isJuryVotingOver,
          shouldShowLastPoints: !shouldReset,
          countries: state.countries.map((country) => {
            if (country.code === countryCode) {
              return {
                ...country,
                points: country.points + state.votingPoints,
                lastReceivedPoints: state.votingPoints,
              };
            }

            return country;
          }),
        });
      },

      giveTelevotePoints: (countryCode: string, votingPoints: number) => {
        const state = get();

        const updatedCountries = state.countries.map((country) => {
          if (country.code === countryCode) {
            return {
              ...country,
              points: country.points + (votingPoints ?? 0),
              lastReceivedPoints: votingPoints ?? null,
              isVotingFinished: true,
            } as Country;
          }

          return country;
        });

        const lastCountryIndexByPoints = getLastCountryIndexByPoints(
          state.countries,
          getLastCountryCodeByPoints(
            getRemainingCountries(state.countries, countryCode),
          ),
        );
        const isVotingFinished = isVotingOver(lastCountryIndexByPoints);

        const winnerCountry = isVotingFinished
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

        // If this is a semi-final and voting is finished, we'll show qualification results
        const showQualificationResults =
          isVotingFinished &&
          (state.eventPhase === EventPhase.SEMI_FINAL_1 ||
            state.eventPhase === EventPhase.SEMI_FINAL_2);

        let { qualifiedCountries } = state;

        if (showQualificationResults) {
          const countriesStore = useCountriesStore.getState();

          // Sort countries by points to get qualifiers
          const sortedCountries = [...updatedCountries].sort((a, b) => {
            const pointsComparison = b.points - a.points;

            return pointsComparison !== 0
              ? pointsComparison
              : a.name.localeCompare(b.name);
          });
          const newQualifiedCountries = sortedCountries.slice(
            0,
            state.semiFinalQualifiers[
              state.eventPhase === EventPhase.SEMI_FINAL_1 ? 'SF1' : 'SF2'
            ],
          );

          // Update the qualified status in the store
          const qualifiedCodes = newQualifiedCountries.map((c) => c.code);
          const currentPhase = state.eventPhase;
          const semiFinalGroup =
            currentPhase === EventPhase.SEMI_FINAL_1 ? 'SF1' : 'SF2';

          countriesStore.setQualifiedFromSemi(qualifiedCodes, semiFinalGroup);

          qualifiedCountries = newQualifiedCountries;
        }

        set({
          votingCountryIndex: lastCountryIndexByPoints,
          isJuryVoting: false,
          shouldShowLastPoints: false,
          shouldClearPoints: true,
          winnerCountry:
            state.eventPhase === EventPhase.GRAND_FINAL ? winnerCountry : null,
          countries: updatedCountries,
          showQualificationResults,
          qualifiedCountries,
        });
      },

      giveRandomJuryPoints: (isRandomFinishing = false) => {
        const state = get();
        const countriesStore = useCountriesStore.getState();
        const votingCountries = countriesStore.getVotingCountries();

        const isJuryVotingOver =
          state.votingCountryIndex === votingCountries.length - 1;
        const votingCountryCode =
          votingCountries[state.votingCountryIndex].code;

        const countriesWithRecentPoints: CountryWithPoints[] = [];
        const initialCountriesWithPointsLength = state.countries.filter(
          (country) => country.lastReceivedPoints !== null,
        ).length;

        const pointsLeftArray = POINTS_ARRAY.filter(
          (points) => points >= state.votingPoints,
        );

        pointsLeftArray.forEach((points) => {
          const availableCountries = state.countries.filter(
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

        const updatedCountries = state.countries.map((country) => {
          const receivedPoints =
            countriesWithRecentPoints.find(
              (countryWithPoints) => countryWithPoints.code === country.code,
            )?.points || 0;

          return {
            ...country,
            points: country.points + receivedPoints,
            lastReceivedPoints:
              receivedPoints ||
              (shouldResetLastPoints(countriesWithRecentPoints)
                ? null
                : country.lastReceivedPoints),
          };
        });

        const televoteCountryIndex = getLastCountryIndexByPoints(
          state.countries,
          getLastCountryCodeByPoints(updatedCountries),
        );

        set({
          votingPoints: 1,
          votingCountryIndex: isJuryVotingOver
            ? televoteCountryIndex
            : state.votingCountryIndex + 1,
          isJuryVoting: !isJuryVotingOver,
          shouldShowLastPoints: !isRandomFinishing,
          countries: updatedCountries,
        });
      },

      resetLastPoints: () => {
        const state = get();

        set({
          countries: state.countries.map((country) => ({
            ...country,
            lastReceivedPoints: null,
          })),
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

      startEvent: (mode: EventMode, selectedCountries: BaseCountry[]) => {
        const countriesStore = useCountriesStore.getState();

        countriesStore.setSelectedCountries(selectedCountries);

        let nextPhase = EventPhase.GRAND_FINAL;

        if (mode === EventMode.SEMI_FINALS_AND_GRAND_FINAL) {
          nextPhase = EventPhase.SEMI_FINAL_1;
        }

        const initialCountries =
          mode === EventMode.SEMI_FINALS_AND_GRAND_FINAL &&
          nextPhase === EventPhase.SEMI_FINAL_1
            ? selectedCountries
                .filter((c) => c.semiFinalGroup === 'SF1' && c.isSelected)
                .sort((a, b) => a.name.localeCompare(b.name))
                .map((country) => ({
                  ...country,
                  points: 0,
                  lastReceivedPoints: null,
                }))
            : countriesStore.getInitialCountries();

        set({
          eventMode: mode,
          eventPhase: nextPhase,
          countries: initialCountries,
          isJuryVoting: nextPhase === EventPhase.GRAND_FINAL, // Only grand final has jury voting
          votingCountryIndex:
            nextPhase === EventPhase.GRAND_FINAL
              ? 0
              : initialCountries.length - 1,
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
        });
      },

      setEventPhase: (phase: EventPhase) => {
        set({ eventPhase: phase });
      },

      continueToNextPhase: () => {
        const state = get();
        const countriesStore = useCountriesStore.getState();

        // Save semi-final results before moving to next phase
        if (
          state.eventPhase === EventPhase.SEMI_FINAL_1 ||
          state.eventPhase === EventPhase.SEMI_FINAL_2
        ) {
          const currentSemiFinalResults = countriesStore.semiFinalResults;
          const newSemiFinalResults: Record<string, number> = {};

          state.countries.forEach((country) => {
            newSemiFinalResults[country.code] = country.points;
          });

          // Merge with existing results
          const mergedResults = {
            ...currentSemiFinalResults,
            ...newSemiFinalResults,
          };

          countriesStore.setSemiFinalResults(mergedResults);
        }

        let nextPhase: EventPhase;
        let initialCountries: Country[];

        const sf2Countries = countriesStore.selectedCountries.filter(
          (c) => c.semiFinalGroup === 'SF2' && c.isSelected,
        );

        if (
          state.eventPhase === EventPhase.SEMI_FINAL_1 &&
          sf2Countries.length > 0
        ) {
          nextPhase = EventPhase.SEMI_FINAL_2;

          initialCountries = sf2Countries
            .sort((a, b) => a.name.localeCompare(b.name))
            .map((country) => ({
              ...country,
              points: 0,
              lastReceivedPoints: null,
            }));
        } else {
          nextPhase = EventPhase.GRAND_FINAL;

          // Get countries for grand final: auto-qualifiers + qualified from semis
          const qualifiedCountries = [
            ...countriesStore
              .getAutoQualifiedCountries()
              .filter((c) => c.isSelected),
            ...countriesStore.getQualifiedFromSemiCountries(),
          ];

          initialCountries = qualifiedCountries
            .sort((a, b) => a.name.localeCompare(b.name))
            .map((country) => ({
              ...country,
              points: 0,
              lastReceivedPoints: null,
            }));
        }

        set({
          eventPhase: nextPhase,
          countries: initialCountries,
          isJuryVoting: nextPhase === EventPhase.GRAND_FINAL, // Only grand final has jury voting
          votingCountryIndex:
            nextPhase === EventPhase.GRAND_FINAL
              ? 0
              : initialCountries.length - 1,
          votingPoints: 1,
          shouldShowLastPoints: true,
          shouldClearPoints: false,
          winnerCountry: null,
          showQualificationResults: false,
          qualifiedCountries: [],
          showAllParticipants: false,
          isFinalAnimationFinished: false,
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
