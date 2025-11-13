import { create } from 'zustand';

import { devtools, persist } from 'zustand/middleware';

import deepMerge from '@75lb/deep-merge';
import { Year } from '../config';
import { ALL_COUNTRIES } from '../data/countries/common-countries';
import {
  BaseCountry,
  CountryAssignmentGroup,
  EventMode,
  EventStage,
  StageId,
  StageVotingMode,
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
  predefModalStageType: 'initial' | 'next';
  customCountries: BaseCountry[];
  eventAssignments: Record<EventMode, Record<string, string>>;
  configuredEventStages: EventStage[];
  countryOdds: CountryOdds;
  activeMode: EventMode;

  // Actions
  setEventSetupModalOpen: (open: boolean) => void;
  setPredefModalOpen: (open: boolean) => void;
  setPredefModalStageType: (type: 'initial' | 'next') => void;
  getQualifiedCountries: () => BaseCountry[];
  getInitialVotingCountries: (stageId?: string) => {
    initialVotingCountries: BaseCountry[];
    extraVotingCountries: BaseCountry[];
  };
  getStageVotingCountries: (
    stageId?: string,
    fromScoreboard?: boolean,
    allowROTW?: boolean,
  ) => BaseCountry[];
  getVotingCountry: () => BaseCountry;
  getVotingCountriesLength: () => number;
  setSelectedCountries: (countries: BaseCountry[]) => void;
  getAutoQualifiedCountries: () => BaseCountry[];
  updateCountriesForYear: (year: Year) => Promise<void>;
  setInitialCountriesForYear: (
    year: Year,
    options?: { force?: boolean; isJuniorContest?: boolean },
  ) => Promise<void>;
  getAllCountries: (includeCustomCountries?: boolean) => BaseCountry[];
  setEventAssignments: (
    assignments: Record<EventMode, Record<string, string>>,
  ) => void;
  setConfiguredEventStages: (stages: EventStage[]) => void;
  updateCountryOdds: (
    countryCode: string,
    odds: { juryOdds?: number; televoteOdds?: number },
  ) => void;
  setBulkCountryOdds: (
    odds: Record<string, { juryOdds?: number; televoteOdds?: number }>,
  ) => void;
  loadYearOdds: (countries: BaseCountry[]) => void;
  syncVotersWithParticipants: (
    assignments: Record<EventMode, Record<string, string>>,
    newActiveMode?: EventMode,
  ) => void;
  setActiveMode: (mode: EventMode) => void;
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
          customCountries: [],
          eventAssignments: {
            [EventMode.SEMI_FINALS_AND_GRAND_FINAL]: {},
            [EventMode.GRAND_FINAL_ONLY]: {},
          },
          configuredEventStages: [],
          countryOdds: {},
          activeMode: EventMode.SEMI_FINALS_AND_GRAND_FINAL,
          predefModalStageType: 'initial',
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
          setPredefModalStageType: (type: 'initial' | 'next') => {
            set({
              predefModalStageType: type,
            });
          },

          getQualifiedCountries: () => {
            const { selectedCountries, allCountriesForYear } = get();

            // If we have selected countries, use those
            if (selectedCountries.length > 0) {
              return selectedCountries
                .filter(
                  (country) =>
                    country.isAutoQualified ||
                    country.isQualifiedFromSemi ||
                    country.isQualified,
                )
                .sort((a, b) => a.name.localeCompare(b.name));
            }

            // Otherwise fall back to the default qualified countries
            return allCountriesForYear
              .filter((country) => country.isQualified)
              .sort((a, b) => a.name.localeCompare(b.name));
          },

          getInitialVotingCountries: (stageId?: string | StageId) => {
            const { allCountriesForYear } = get();
            const {
              year,
              settings: { isJuniorContest },
            } = useGeneralStore.getState();

            const allCountriesForYearCopy = [...allCountriesForYear];

            let initialVotingCountries: BaseCountry[] = [];
            const extraVotingCountries: BaseCountry[] = [];

            const stageKey = stageId ?? StageId.GF;

            if (stageKey !== StageId.GF) {
              // In a semi-final, only participating countries and a few AQs are voting.
              allCountriesForYearCopy.forEach((c) => {
                const isSemiFinalGroup =
                  c.semiFinalGroup?.toLowerCase() ===
                  String(stageKey).toLowerCase();

                const isAQSemiFinalGroup =
                  c.aqSemiFinalGroup?.toLowerCase() ===
                  String(stageKey).toLowerCase();

                if (isAQSemiFinalGroup) {
                  extraVotingCountries.push(c);
                }

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
              initialVotingCountries.push(RestOfWorld);
              extraVotingCountries.push(RestOfWorld);
            }

            return { initialVotingCountries, extraVotingCountries };
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

          setSelectedCountries: (countries: BaseCountry[]) => {
            set({
              selectedCountries: countries,
            });
          },

          getAutoQualifiedCountries: () => {
            const { selectedCountries, allCountriesForYear } = get();

            if (selectedCountries.length > 0) {
              return selectedCountries
                .filter((country) => country.isAutoQualified)
                .sort((a, b) => a.name.localeCompare(b.name));
            }

            return allCountriesForYear
              .filter((country) => country.isAutoQualified)
              .sort((a, b) => a.name.localeCompare(b.name));
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
              eventAssignments: {
                [EventMode.SEMI_FINALS_AND_GRAND_FINAL]: {},
                [EventMode.GRAND_FINAL_ONLY]: {},
              },
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
            const { syncVotersWithParticipants } = get();

            syncVotersWithParticipants(assignments);

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

          syncVotersWithParticipants: (
            assignments: Record<EventMode, Record<string, string>>,
            newActiveMode?: EventMode,
          ) => {
            const {
              configuredEventStages,
              activeMode,
              getAllCountries,
              getInitialVotingCountries,
            } = get();

            const currentActiveMode = newActiveMode ?? activeMode;

            const currentAssignments = assignments[currentActiveMode] || {};
            const previousAssignments =
              get().eventAssignments?.[currentActiveMode] || {};

            // Build a quick lookup for BaseCountry by code
            const allCountries = getAllCountries();
            const codeToCountry = new Map<string, BaseCountry>();
            allCountries.forEach((c) => codeToCountry.set(c.code, c));

            const updatedConfiguredEventStages = configuredEventStages.map(
              (stage) => {
                // Respect stage-level toggle
                if (!stage.syncVotersWithParticipants) {
                  return stage;
                }

                const { extraVotingCountries } =
                  getInitialVotingCountries(stage.id as StageId) ||
                  ({ extraVotingCountries: [] } as {
                    extraVotingCountries: BaseCountry[];
                  });

                const extrasCodes = new Set(
                  (extraVotingCountries || []).map((c) => c.code),
                );

                // Resolve participants for this stage depending on active mode and stage type
                const participantCodesNow = new Set<string>();
                const participantCodesBefore = new Set<string>();

                if (
                  currentActiveMode === EventMode.SEMI_FINALS_AND_GRAND_FINAL
                ) {
                  if (stage.id === StageId.GF) {
                    // In All Shows, GF voters are all participants from ANY semi-final stage + AQs
                    const semiStageIds = new Set(
                      configuredEventStages
                        .filter((s) => s.id !== StageId.GF)
                        .map((s) => s.id),
                    );

                    Object.entries(currentAssignments).forEach(
                      ([countryCode, group]) => {
                        if (
                          semiStageIds.has(group) ||
                          group === CountryAssignmentGroup.AUTO_QUALIFIER
                        ) {
                          participantCodesNow.add(countryCode);
                        }
                      },
                    );
                    Object.entries(previousAssignments).forEach(
                      ([countryCode, group]) => {
                        if (
                          semiStageIds.has(group) ||
                          group === CountryAssignmentGroup.AUTO_QUALIFIER
                        ) {
                          participantCodesBefore.add(countryCode);
                        }
                      },
                    );
                  } else {
                    // Semi-finals: only participants assigned to this stage id
                    Object.entries(currentAssignments).forEach(
                      ([countryCode, group]) => {
                        if (group === stage.id)
                          participantCodesNow.add(countryCode);
                      },
                    );
                    Object.entries(previousAssignments).forEach(
                      ([countryCode, group]) => {
                        if (group === stage.id)
                          participantCodesBefore.add(countryCode);
                      },
                    );
                  }
                } else if (currentActiveMode === EventMode.GRAND_FINAL_ONLY) {
                  // In GF-only mode, GF voters are GF participants + NOT_QUALIFIED
                  // (other stages shouldn't exist, but we still guard by stage.id)
                  if (stage.id === StageId.GF) {
                    Object.entries(currentAssignments).forEach(
                      ([countryCode, group]) => {
                        if (
                          group === StageId.GF ||
                          group === CountryAssignmentGroup.NOT_QUALIFIED
                        ) {
                          participantCodesNow.add(countryCode);
                        }
                      },
                    );
                    Object.entries(previousAssignments).forEach(
                      ([countryCode, group]) => {
                        if (
                          group === StageId.GF ||
                          group === CountryAssignmentGroup.NOT_QUALIFIED
                        ) {
                          participantCodesBefore.add(countryCode);
                        }
                      },
                    );
                  }
                }

                const currentList: BaseCountry[] = stage.votingCountries || [];

                // 1) Keep items from current list in their existing order when:
                //    - still participants now, OR
                //    - are extras (AQs / Rest of World), OR
                //    - were NOT previously participants of this stage (manual additions)
                const kept: BaseCountry[] = [];
                const keptCodes = new Set<string>();

                for (const country of currentList) {
                  const code = country.code;
                  const isParticipantNow = participantCodesNow.has(code);
                  const isExtra = extrasCodes.has(code);
                  const wasParticipantBefore = participantCodesBefore.has(code);

                  if (isParticipantNow || isExtra || !wasParticipantBefore) {
                    if (!keptCodes.has(code)) {
                      kept.push(country);
                      keptCodes.add(code);
                    }
                  }
                  // Else: it was previously a participant in this stage but is no longer
                  // assigned here → remove it from the voting list.
                }

                // 2) Append any NEW participants (now assigned to this stage) that are not yet kept
                for (const code of participantCodesNow) {
                  if (!keptCodes.has(code)) {
                    const country = codeToCountry.get(code);
                    if (country) {
                      kept.push(country);
                      keptCodes.add(code);
                    }
                  }
                }

                // 3) Extras handling
                // For semi-finals, always ensure extras are present (AQs + RoW)
                // For GF, only keep extras that were already present (e.g. Rest of World if the user kept it)
                const shouldAppendExtras = stage.id !== StageId.GF;
                if (shouldAppendExtras) {
                  for (const extra of extraVotingCountries || []) {
                    if (!keptCodes.has(extra.code)) {
                      kept.push(extra);
                      keptCodes.add(extra.code);
                    }
                  }
                }

                return {
                  ...stage,
                  votingCountries: kept,
                };
              },
            );

            set({ configuredEventStages: updatedConfiguredEventStages });
          },

          setActiveMode: (mode: EventMode) => {
            set({ activeMode: mode });

            get().syncVotersWithParticipants(get().eventAssignments, mode);
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
          activeMode: state.activeMode,
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

// Initialize once at app startup using current settings.
// We must pass the correct contest type to avoid defaulting to ESC.
(() => {
  const { settings, year } = useGeneralStore.getState();
  useCountriesStore.getState().setInitialCountriesForYear(year, {
    force: true,
    isJuniorContest: settings.isJuniorContest,
  });
})();
