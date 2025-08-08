import { create } from 'zustand';

import { devtools } from 'zustand/middleware';

import { Year } from '../config';
import {
  ALL_COUNTRIES,
  COMMON_COUNTRIES,
} from '../data/countries/common-countries';
import { getCountriesByYear } from '../data/data';
import {
  deleteCustomCountryFromDB,
  getCustomCountries,
  saveCustomCountry,
} from '../helpers/indexedDB';
import {
  BaseCountry,
  CountryAssignmentGroup,
  EventMode,
  EventStage,
  StageId,
  StageVotingMode,
} from '../models';

import { useGeneralStore } from './generalStore';
import { useScoreboardStore } from './scoreboardStore';

export type CountryOdds = Record<
  string,
  { juryOdds?: number; televoteOdds?: number }
>;

interface CountriesState {
  // State
  allCountriesForYear: BaseCountry[]; // All countries from the selected year, both qualified and not qualified
  selectedCountries: BaseCountry[]; // Countries selected for the current event
  eventSetupModalOpen: boolean;
  customCountries: BaseCountry[];
  eventAssignments: Record<EventMode, Record<string, string>>;
  configuredEventStages: EventStage[];
  countryOdds: CountryOdds;
  activeMode: EventMode;

  // Actions
  setEventSetupModalOpen: (open: boolean) => void;
  getQualifiedCountries: () => BaseCountry[];
  getInitialVotingCountries: (stageId?: string) => {
    initialVotingCountries: BaseCountry[];
    extraVotingCountries: BaseCountry[];
  };
  getStageVotingCountries: (stageId?: string) => BaseCountry[];
  getVotingCountry: () => BaseCountry;
  getVotingCountriesLength: () => number;
  setSelectedCountries: (countries: BaseCountry[]) => void;
  getAutoQualifiedCountries: () => BaseCountry[];
  updateCountriesForYear: (year: Year) => void;
  setInitialCountriesForYear: (year: Year) => void;
  addCustomCountry: (
    country: Omit<BaseCountry, 'code' | 'category'>,
  ) => Promise<void>;
  updateCustomCountry: (country: BaseCountry) => Promise<void>;
  deleteCustomCountry: (countryCode: string) => Promise<void>;
  getAllCountries: () => BaseCountry[];
  setEventAssignments: (
    assignments: Record<EventMode, Record<string, string>>,
  ) => void;
  setConfiguredEventStages: (stages: EventStage[]) => void;
  loadCustomCountries: () => Promise<void>;
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
    (set, get) => ({
      // Initial state
      allCountriesForYear: [],
      selectedCountries: [],
      eventSetupModalOpen: true,
      customCountries: [],
      eventAssignments: {
        [EventMode.SEMI_FINALS_AND_GRAND_FINAL]: {},
        [EventMode.GRAND_FINAL_ONLY]: {},
      },
      configuredEventStages: [],
      countryOdds: {},
      activeMode: EventMode.SEMI_FINALS_AND_GRAND_FINAL,
      // Actions
      setEventSetupModalOpen: (open: boolean) => {
        set({
          eventSetupModalOpen: open,
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

      getInitialVotingCountries: (stageId: StageId) => {
        const { allCountriesForYear } = get();
        const { year } = useGeneralStore.getState();

        const allCountriesForYearCopy = [...allCountriesForYear];

        let initialVotingCountries: BaseCountry[] = [];
        const extraVotingCountries: BaseCountry[] = [];

        if (stageId !== StageId.GF) {
          // In a semi-final, only participating countries and a few AQs are voting.
          allCountriesForYearCopy.forEach((c) => {
            const isSemiFinalGroup =
              c.semiFinalGroup?.toLowerCase() === stageId.toLowerCase();

            const isAQSemiFinalGroup =
              c.aqSemiFinalGroup?.toLowerCase() === stageId.toLowerCase();

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
            (a, b) => (a.spokespersonOrder ?? 0) - (b.spokespersonOrder ?? 0),
          );
        }

        const restOfWorld = COMMON_COUNTRIES['RestOfWorld'];
        const shouldAddRestOfWorld = Number(year) >= 2023;

        if (
          restOfWorld &&
          shouldAddRestOfWorld &&
          !initialVotingCountries.some((c) => c.code === 'WW')
        ) {
          initialVotingCountries.push(restOfWorld);
          extraVotingCountries.push(restOfWorld);
        }

        return { initialVotingCountries, extraVotingCountries };
      },

      getStageVotingCountries: (stageId?: string) => {
        const { configuredEventStages } = get();
        const { eventStages, currentStageId, predefinedVotes } =
          useScoreboardStore.getState();

        const relevantStageId = stageId ?? currentStageId;
        const relevantStage = eventStages.find(
          (stage) => stage.id === relevantStageId,
        );

        if (!relevantStage) {
          return [];
        }

        const isRestOfWorldVoting =
          relevantStage?.votingMode === StageVotingMode.TELEVOTE_ONLY ||
          (relevantStage?.votingMode === StageVotingMode.JURY_AND_TELEVOTE &&
            (!relevantStage.isJuryVoting ||
              !predefinedVotes[relevantStageId!]?.televote));

        const votingCountries =
          configuredEventStages
            .find((stage) => stage.id === relevantStageId)
            ?.votingCountries?.filter(
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

      updateCountriesForYear: (year: Year) => {
        const countries = getCountriesByYear(year);

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

      setInitialCountriesForYear: (year: Year) => {
        if (get().allCountriesForYear.length > 0) return;

        const countries = getCountriesByYear(year);

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
          countryOdds: initialOdds,
        });
      },

      addCustomCountry: async (
        country: Omit<BaseCountry, 'code' | 'category'>,
      ) => {
        const newCountry: BaseCountry = {
          ...country,
          code: `custom-${country.name
            .toLowerCase()
            .replace(/\s/g, '-')}-${Date.now()}`,
          category: 'Custom',
        };

        await saveCustomCountry(newCountry);

        set((state) => ({
          customCountries: [...state.customCountries, newCountry],
        }));
      },

      updateCustomCountry: async (country: BaseCountry) => {
        await saveCustomCountry(country);
        set((state) => ({
          customCountries: state.customCountries.map((c) =>
            c.code === country.code ? country : c,
          ),
        }));
      },

      deleteCustomCountry: async (countryCode: string) => {
        await deleteCustomCountryFromDB(countryCode);
        set((state) => ({
          customCountries: state.customCountries.filter(
            (c) => c.code !== countryCode,
          ),
        }));
      },

      getAllCountries: () => {
        const { customCountries } = get();

        return [...ALL_COUNTRIES, ...customCountries];
      },

      setEventAssignments: (assignments) => {
        const { syncVotersWithParticipants } = get();

        syncVotersWithParticipants(assignments);

        set({ eventAssignments: assignments });
      },

      setConfiguredEventStages: (stages) => {
        set({ configuredEventStages: stages });
      },

      loadCustomCountries: async () => {
        const customCountries = await getCustomCountries();

        set({ customCountries });
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
        const previousAssignments = get().eventAssignments?.[currentActiveMode] || {};

        // Build a quick lookup for BaseCountry by code
        const allCountries = getAllCountries();
        const codeToCountry = new Map<string, BaseCountry>();
        allCountries.forEach((c) => codeToCountry.set(c.code, c));

        const updatedConfiguredEventStages = configuredEventStages.map((stage) => {
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

          if (currentActiveMode === EventMode.SEMI_FINALS_AND_GRAND_FINAL) {
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
                  if (group === stage.id) participantCodesNow.add(countryCode);
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
        });

        set({ configuredEventStages: updatedConfiguredEventStages });
      },

      setActiveMode: (mode: EventMode) => {
        set({ activeMode: mode });

        get().syncVotersWithParticipants(get().eventAssignments, mode);
      },
    }),
    { name: 'countries-store' },
  ),
);
