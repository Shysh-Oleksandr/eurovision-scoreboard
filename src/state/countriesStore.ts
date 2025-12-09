import { create } from 'zustand';

import { devtools, persist } from 'zustand/middleware';

import deepMerge from '@75lb/deep-merge';
import { Year } from '../config';
import { ALL_COUNTRIES } from '../data/countries/common-countries';
import {
  BaseCountry,
  CountryAssignmentGroup,
  EventStage,
  StageId,
  StageVotingMode,
  VotingCountry,
} from '../models';

import { RestOfWorld } from '@/data/countries';
import { useGeneralStore } from './generalStore';
import { useScoreboardStore } from './scoreboardStore';

export type CountryOdds = Record<
  string,
  { juryOdds?: number; televoteOdds?: number }
>;

export interface CountriesState {
  // State
  allCountriesForYear: BaseCountry[]; // All countries from the selected year, both qualified and not qualified
  selectedCountries: BaseCountry[]; // Countries selected for the current event
  eventSetupModalOpen: boolean;
  predefModalOpen: boolean;
  currentSetupStageType: 'initial' | 'next';
  postSetupModalOpen: boolean;
  customCountries: BaseCountry[];
  eventAssignments: Record<string, string>; // countryCode -> stageId | NOT_PARTICIPATING
  configuredEventStages: EventStage[];
  countryOdds: CountryOdds;

  // Actions
  setEventSetupModalOpen: (open: boolean) => void;
  setPredefModalOpen: (open: boolean) => void;
  setCurrentSetupStageType: (type: 'initial' | 'next') => void;
  setPostSetupModalOpen: (open: boolean) => void;
  getInitialVotingCountries: (stageId?: string) => VotingCountry[];
  getStageVotingCountries: (
    stageId?: string,
    fromScoreboard?: boolean,
    allowROTW?: boolean,
  ) => VotingCountry[];
  getContestParticipants: () => BaseCountry[];
  getVotingCountry: () => VotingCountry | undefined;
  getVotingCountriesLength: () => number;
  setSelectedCountries: (countries: BaseCountry[]) => void;
  updateCountriesForYear: (year: Year) => Promise<void>;
  setInitialCountriesForYear: (
    year: Year,
    options?: { force?: boolean; isJuniorContest?: boolean },
  ) => Promise<void>;
  getAllCountries: (includeCustomCountries?: boolean) => BaseCountry[];
  setEventAssignments: (assignments: Record<string, string>) => void;
  setConfiguredEventStages: (stages: EventStage[]) => void;
  updateCountryOdds: (
    countryCode: string,
    odds: { juryOdds?: number; televoteOdds?: number },
  ) => void;
  setBulkCountryOdds: (
    odds: Record<string, { juryOdds?: number; televoteOdds?: number }>,
  ) => void;
  loadYearOdds: (countries: BaseCountry[]) => void;
}

export const useCountriesStore = create<CountriesState>()(
  devtools(
    persist(
      (set, get) => {
        // Helpers (internal to store factory)
        const buildCountriesUrl = (year: Year, isJunior: boolean) =>
          isJunior
            ? `/data/countries/junior-countries-${year}.json`
            : `/data/countries/countries-${year}.json`;

        const loadCountriesByPreset = async (year: Year, isJunior: boolean) => {
          const url = buildCountriesUrl(year, isJunior);

          const toAbsolute = (path: string) => {
            if (typeof window !== 'undefined') return path;
            const baseEnv =
              process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';
            try {
              return new URL(path, baseEnv).toString();
            } catch {
              return `${baseEnv}${path}`;
            }
          };

          const res = await fetch(toAbsolute(url), { cache: 'force-cache' });
          if (res.ok) return (await res.json()) as BaseCountry[];

          if (isJunior && res.status === 404) {
            const escRes = await fetch(
              toAbsolute(buildCountriesUrl(year, false)),
              {
                cache: 'force-cache',
              },
            );
            if (escRes.ok) return (await escRes.json()) as BaseCountry[];
          }

          throw new Error(
            `Failed to load countries JSON for ${year} (${
              isJunior ? 'JESC' : 'ESC'
            })`,
          );
        };

        return {
          // Initial state
          allCountriesForYear: [],
          selectedCountries: [],
          eventSetupModalOpen: true,
          predefModalOpen: false,
          postSetupModalOpen: false,
          customCountries: [],
          eventAssignments: {},
          configuredEventStages: [],
          countryOdds: {},
          currentSetupStageType: 'initial',
          // Actions
          setEventSetupModalOpen: (open: boolean) => {
            set({
              eventSetupModalOpen: open,
            });
          },
          setPredefModalOpen: (open: boolean) => {
            set({
              predefModalOpen: open,
            });
          },
          setCurrentSetupStageType: (type: 'initial' | 'next') => {
            set({
              currentSetupStageType: type,
            });
          },
          setPostSetupModalOpen: (open: boolean) => {
            set({
              postSetupModalOpen: open,
            });
          },

          getInitialVotingCountries: (stageId?: string | StageId) => {
            const { allCountriesForYear } = get();
            const {
              year,
              settings: { isJuniorContest },
            } = useGeneralStore.getState();

            const allCountriesForYearCopy = [...allCountriesForYear];

            let initialVotingCountries: VotingCountry[] = [];

            const stageKey = stageId ?? StageId.GF.toUpperCase();

            if (stageKey.toUpperCase() !== StageId.GF.toUpperCase()) {
              // In a semi-final, only participating countries and a few AQs are voting.
              allCountriesForYearCopy.forEach((c) => {
                const isSemiFinalGroup =
                  c.semiFinalGroup?.toLowerCase() ===
                  String(stageKey).toLowerCase();

                const isAQSemiFinalGroup =
                  c.aqSemiFinalGroup?.toLowerCase() ===
                  String(stageKey).toLowerCase();

                if (isSemiFinalGroup || isAQSemiFinalGroup) {
                  initialVotingCountries.push(c);
                }
              });
            } else {
              // In the Grand Final, all selected countries for the event can vote.
              initialVotingCountries = allCountriesForYearCopy.sort(
                (a, b) =>
                  (a.spokespersonOrder ?? 0) - (b.spokespersonOrder ?? 0),
              );
            }

            const shouldAddRestOfWorld =
              !isJuniorContest && Number(year) >= 2023;

            if (
              RestOfWorld &&
              shouldAddRestOfWorld &&
              !initialVotingCountries.some((c) => c.code === 'WW')
            ) {
              initialVotingCountries.push({
                code: RestOfWorld.code,
                name: RestOfWorld.name,
              });
            }

            return initialVotingCountries.map(
              (c) =>
                ({
                  code: c.code,
                  name: c.name,
                  ...(c.flag ? { flag: c.flag } : {}),
                } as VotingCountry),
            );
          },

          getStageVotingCountries: (
            stageId?: string,
            fromScoreboard = true,
            allowROTW = true,
          ) => {
            const { configuredEventStages } = get();
            const { eventStages, currentStageId, predefinedVotes } =
              useScoreboardStore.getState();

            const relevantStageId = stageId ?? currentStageId;

            const configuredEventStage = configuredEventStages.find(
              (stage) => stage.id === relevantStageId,
            );
            const relevantStage =
              eventStages.find((stage) => stage.id === relevantStageId) ||
              configuredEventStage;

            if (!relevantStage) {
              return [];
            }

            const isRestOfWorldVoting =
              allowROTW &&
              (relevantStage?.votingMode === StageVotingMode.TELEVOTE_ONLY ||
                (relevantStage?.votingMode ===
                  StageVotingMode.JURY_AND_TELEVOTE &&
                  (!relevantStage.isJuryVoting ||
                    !predefinedVotes[relevantStageId!]?.televote)));

            const votingCountries =
              (fromScoreboard
                ? relevantStage
                : configuredEventStage
              )?.votingCountries?.filter(
                (country) => country.code !== 'WW' || isRestOfWorldVoting,
              ) || [];

            return votingCountries;
          },

          getVotingCountry: () => {
            const { getStageVotingCountries } = get();

            const { votingCountryIndex, getCurrentStage } =
              useScoreboardStore.getState();

            const currentStage = getCurrentStage();

            return currentStage?.isJuryVoting
              ? getStageVotingCountries()[votingCountryIndex]
              : currentStage?.countries[votingCountryIndex];
          },

          getVotingCountriesLength: () => {
            return get().getStageVotingCountries().length;
          },

          getContestParticipants: () => {
            const { getAllCountries, eventAssignments } = get();
            const participants: BaseCountry[] = [];
            getAllCountries().forEach((country) => {
              const assignedGroup = eventAssignments[country.code];

              const participatesSomewhere =
                assignedGroup &&
                assignedGroup !== CountryAssignmentGroup.NOT_PARTICIPATING &&
                assignedGroup !== CountryAssignmentGroup.NOT_QUALIFIED;
              if (participatesSomewhere) {
                participants.push(country);
              }
            });

            return participants;
          },

          setSelectedCountries: (countries: BaseCountry[]) => {
            set({
              selectedCountries: countries,
            });
          },

          updateCountriesForYear: async (year: Year) => {
            const { settings } = useGeneralStore.getState();
            const countries = await loadCountriesByPreset(
              year,
              settings.isJuniorContest,
            );

            const initialOdds: Record<
              string,
              { juryOdds?: number; televoteOdds?: number }
            > = {};

            countries.forEach((country) => {
              initialOdds[country.code] = {
                juryOdds: country.juryOdds ?? 50,
                televoteOdds: country.televoteOdds ?? 50,
              };
            });

            set({
              allCountriesForYear: countries,
              selectedCountries: [],
              configuredEventStages: [],
              eventAssignments: {},
              countryOdds: initialOdds,
            });
          },

          loadYearOdds: (countries: BaseCountry[]) => {
            const { allCountriesForYear } = get();
            const yearOdds: Record<
              string,
              { juryOdds?: number; televoteOdds?: number }
            > = {};

            countries.forEach((country) => {
              const yearCountryData = allCountriesForYear.find(
                (c) => c.code === country.code,
              );

              yearOdds[country.code] = {
                juryOdds: yearCountryData?.juryOdds ?? 50,
                televoteOdds: yearCountryData?.televoteOdds ?? 50,
              };
            });

            set((state) => ({
              countryOdds: {
                ...state.countryOdds,
                ...yearOdds,
              },
            }));
          },

          setInitialCountriesForYear: async (
            year: Year,
            options?: { force?: boolean; isJuniorContest?: boolean },
          ) => {
            const { force = false, isJuniorContest } = options || {};

            if (!force && get().allCountriesForYear.length > 0) return;

            const effectiveIsJunior =
              typeof isJuniorContest === 'boolean' ? isJuniorContest : false;

            const countries = await loadCountriesByPreset(
              year,
              effectiveIsJunior,
            );

            let initialOdds: Record<
              string,
              { juryOdds?: number; televoteOdds?: number }
            > = get().countryOdds;
            const shouldLoadOdds = Object.keys(initialOdds).length === 0;
            if (shouldLoadOdds) {
              initialOdds = {};

              countries.forEach((country) => {
                initialOdds[country.code] = {
                  juryOdds: country.juryOdds ?? 50,
                  televoteOdds: country.televoteOdds ?? 50,
                };
              });
            }

            set({
              allCountriesForYear: countries,
              countryOdds: initialOdds,
            });
          },

          getAllCountries: (includeCustomCountries = true) => {
            const { customCountries } = get();

            return includeCustomCountries
              ? [...ALL_COUNTRIES, ...customCountries]
              : ALL_COUNTRIES;
          },

          setEventAssignments: (assignments) => {
            set({ eventAssignments: assignments });
          },

          setConfiguredEventStages: (stages) => {
            set({ configuredEventStages: stages });
          },

          updateCountryOdds: (countryCode, odds) => {
            set((state) => ({
              countryOdds: {
                ...state.countryOdds,
                [countryCode]: {
                  ...state.countryOdds[countryCode],
                  ...odds,
                },
              },
            }));
          },

          setBulkCountryOdds: (odds) => {
            set((state) => ({
              countryOdds: {
                ...state.countryOdds,
                ...odds,
              },
            }));
          },
        };
      },
      {
        name: 'countries-storage',
        partialize: (state) => ({
          eventSetupModalOpen: state.eventSetupModalOpen,
          selectedCountries: state.selectedCountries,
          eventAssignments: state.eventAssignments,
          configuredEventStages: state.configuredEventStages,
          countryOdds: state.countryOdds,
        }),
        merge: (persistedState, currentState) => {
          const m = deepMerge(currentState, persistedState);

          return m;
        },
      },
    ),
    {
      name: 'countries-store',
      enabled: process.env.NODE_ENV === 'development',
    },
  ),
);
