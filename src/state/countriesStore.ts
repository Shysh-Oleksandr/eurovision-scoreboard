import { create } from 'zustand';

import { devtools, persist } from 'zustand/middleware';

import { Year } from '../config';
import { ALL_COUNTRIES } from '../data/countries/common-countries';
import {
  BaseCountry,
  CountriesPreset,
  Country,
  CountryAssignmentGroup,
  EventStage,
  StageId,
  StageVotingMode,
  VotingCountry,
} from '../models';

import { useAllocationDrawStore } from './allocationDrawStore';
import deepMerge from './deepMerge';
import { useGeneralStore } from './generalStore';
import { useScoreboardStore } from './scoreboardStore';

import type { ContestType } from '@/data/contestTypes';
import { RestOfWorld } from '@/data/countries';
import { buildCountriesUrl } from '@/data/countries/countriesDataUrl';
import {
  applyEntryOverride,
  changedEntryOverrideCodes,
  EntryOverrides,
  freshEntryOverrides,
  normalizeEntryOverride,
  reapplyEntryOverridesToStages,
  rebaseHistoricalNames,
  sanitizeEntryOverrides,
  withEntryOverrides,
} from '@/data/countries/entryOverrides';
import { safeLocalStorage } from '@/state/safeLocalStorage';
import {
  filterVotersByChannel,
  getEffectiveVoterChannels,
  getStagePhaseChannel,
  VoteChannel,
} from '@/state/scoreboard/voterChannels';

export type CountryOdds = Record<
  string,
  { juryOdds?: number; televoteOdds?: number }
>;

/**
 * Builds an odds map for `countries` from the selected year's JSON defaults
 * (falling back to 50/50 when a country isn't in the year list). Shared by the
 * store's `loadYearOdds` and the per-stage odds-override draft's "Load year data".
 */
export const resolveYearOddsFor = (
  countries: BaseCountry[],
  allCountriesForYear: BaseCountry[],
): CountryOdds => {
  const yearOdds: CountryOdds = {};

  countries.forEach((country) => {
    const yearCountryData = allCountriesForYear.find(
      (c) => c.code === country.code,
    );

    yearOdds[country.code] = {
      juryOdds: yearCountryData?.juryOdds ?? 50,
      televoteOdds: yearCountryData?.televoteOdds ?? 50,
    };
  });

  return yearOdds;
};

export interface StageVotingCountriesOptions {
  fromScoreboard?: boolean;
  channel?: VoteChannel | 'all';
}

interface CountriesState {
  // State
  allCountriesForYear: BaseCountry[]; // All countries from the selected year, both qualified and not qualified
  eventSetupModalOpen: boolean;
  predefModalOpen: boolean;
  currentSetupStageType: 'initial' | 'next';
  postSetupModalOpen: boolean;
  customCountries: BaseCountry[];
  eventAssignments: Record<string, string>; // countryCode -> stageId | NOT_PARTICIPATING
  configuredEventStages: EventStage[];
  countryOdds: CountryOdds;
  semiFinalVotingMode: StageVotingMode;
  /**
   * This contest's own names and flags for standard countries
   * (`data/countries/entryOverrides.ts`). `getAllCountries` and the voter
   * lists apply them; saved with the contest.
   */
  entryOverrides: EntryOverrides;

  // Actions
  setEventSetupModalOpen: (open: boolean) => void;
  setPredefModalOpen: (open: boolean) => void;
  setCurrentSetupStageType: (type: 'initial' | 'next') => void;
  setPostSetupModalOpen: (open: boolean) => void;
  getInitialVotingCountries: (stageId?: string) => VotingCountry[];
  /**
   * Voters of a stage filtered to a vote channel. `channel` defaults to the
   * stage's current phase (jury / televote / combined); pass `'all'` for the
   * raw list. `fromScoreboard: false` reads the configured (setup) stage.
   */
  getStageVotingCountries: (
    stageId?: string,
    options?: StageVotingCountriesOptions,
  ) => VotingCountry[];
  getContestParticipants: () => BaseCountry[];
  getVotingCountry: () => VotingCountry | undefined;
  getVotingCountriesLength: () => number;
  updateCountriesForYear: (year: Year) => Promise<void>;
  setInitialCountriesForYear: (
    year: Year,
    options?: { force?: boolean; contestType?: ContestType },
  ) => Promise<void>;
  /**
   * Every country as this contest shows it: the standard ones with the
   * contest's entry overrides applied, then the custom entries.
   */
  getAllCountries: (includeCustomCountries?: boolean) => BaseCountry[];
  /**
   * The same list with the built-in names and flags, for surfaces that span
   * contests (stats, leaderboards, the profile, relations, flag pickers).
   */
  getCanonicalCountries: (includeCustomCountries?: boolean) => BaseCountry[];
  /**
   * Gives a standard country its own name and/or flag in this contest, or
   * (null, or nothing that differs) shows it as it ships again. Every copy
   * already made (setup voters, the running show, its undo history) is
   * redrawn.
   */
  setEntryOverride: (
    code: string,
    override: { name?: string; flag?: string } | null,
  ) => void;
  /** Swaps the whole map (a loaded contest, a new edition) and redraws the copies. */
  replaceEntryOverrides: (overrides: EntryOverrides) => void;
  /**
   * Moves the contest from one set of historical names to another
   * (`rebaseHistoricalNames`): the setting switched, Next year crossing a
   * rename. The user's own names and every flag stay.
   */
  swapHistoricalNames: (from: EntryOverrides, to: EntryOverrides) => void;
  setEventAssignments: (assignments: Record<string, string>) => void;
  setConfiguredEventStages: (stages: EventStage[]) => void;
  updateCountryOdds: (
    countryCode: string,
    odds: { juryOdds?: number; televoteOdds?: number },
  ) => void;
  setBulkCountryOdds: (
    odds: Record<string, { juryOdds?: number; televoteOdds?: number }>,
    replace?: boolean,
  ) => void;
  loadYearOdds: (countries: BaseCountry[]) => void;
}

/** The standard countries with one overrides map applied, kept while the map is. */
let overriddenStandard: {
  overrides: EntryOverrides;
  countries: BaseCountry[];
} | null = null;

const standardCountriesFor = (overrides: EntryOverrides): BaseCountry[] => {
  if (overriddenStandard?.overrides !== overrides) {
    overriddenStandard = {
      overrides,
      countries: withEntryOverrides(ALL_COUNTRIES, overrides),
    };
  }

  return overriddenStandard.countries;
};

type SimulationCopies = {
  eventStages?: EventStage[];
  winnerCountry?: Country | null;
};

/**
 * Redraws the running show's copies of the changed countries: its stages,
 * the winner and every undo/redo step, so Undo never brings an old name
 * back. Recording is paused: a redraw isn't a step of its own.
 */
const redrawSimulationCopies = (
  previous: EntryOverrides,
  next: EntryOverrides,
) => {
  const redraw = <S extends SimulationCopies>(state: S): S => {
    const eventStages = state.eventStages
      ? reapplyEntryOverridesToStages(state.eventStages, previous, next)
      : state.eventStages;
    const winnerCountry = state.winnerCountry
      ? applyEntryOverride(
          state.winnerCountry,
          next[state.winnerCountry.code],
          previous[state.winnerCountry.code],
        )
      : state.winnerCountry;

    return eventStages === state.eventStages &&
      winnerCountry === state.winnerCountry
      ? state
      : { ...state, eventStages, winnerCountry };
  };

  const history = useScoreboardStore.temporal.getState();
  const current = useScoreboardStore.getState();
  const redrawn = redraw(current);

  if (redrawn !== current) {
    const wasTracking = history.isTracking;

    if (wasTracking) history.pause();
    useScoreboardStore.setState({
      eventStages: redrawn.eventStages,
      winnerCountry: redrawn.winnerCountry,
    });
    if (wasTracking) history.resume();
  }

  if (history.pastStates.length > 0 || history.futureStates.length > 0) {
    useScoreboardStore.temporal.setState({
      pastStates: history.pastStates.map(redraw),
      futureStates: history.futureStates.map(redraw),
    });
  }
};

export const useCountriesStore = create<CountriesState>()(
  devtools(
    persist(
      (set, get) => {
        const redrawEntryCopies = (
          previous: EntryOverrides,
          next: EntryOverrides,
        ) => {
          if (changedEntryOverrideCodes(previous, next).length === 0) return;

          set((state) => ({
            configuredEventStages: reapplyEntryOverridesToStages(
              state.configuredEventStages,
              previous,
              next,
            ),
          }));
          redrawSimulationCopies(previous, next);
        };

        // Helpers (internal to store factory)
        const parseCountriesJson = (json: unknown): CountriesPreset => {
          if (Array.isArray(json)) {
            return { countries: json };
          }
          const preset = json as CountriesPreset;

          return {
            semiFinalVotingMode: preset.semiFinalVotingMode,
            countries: preset.countries,
          };
        };

        const loadCountriesByPreset = async (
          year: Year,
          contestType: ContestType,
        ): Promise<CountriesPreset> => {
          const url = buildCountriesUrl(year, contestType);

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

          if (res.ok) return parseCountriesJson(await res.json());

          if (contestType === 'jesc' && res.status === 404) {
            const escRes = await fetch(
              toAbsolute(buildCountriesUrl(year, 'esc')),
              {
                cache: 'force-cache',
              },
            );

            if (escRes.ok) return parseCountriesJson(await escRes.json());
          }

          throw new Error(
            `Failed to load countries JSON for ${year} (${contestType.toUpperCase()})`,
          );
        };

        return {
          // Initial state
          allCountriesForYear: [],
          eventSetupModalOpen: true,
          predefModalOpen: false,
          postSetupModalOpen: false,
          customCountries: [],
          eventAssignments: {},
          configuredEventStages: [],
          countryOdds: {},
          semiFinalVotingMode: StageVotingMode.TELEVOTE_ONLY,
          currentSetupStageType: 'initial',
          entryOverrides: {},
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
              settings: { contestType },
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

            // Junior Eurovision has no Rest of the World vote
            const shouldAddRestOfWorld =
              contestType !== 'jesc' && Number(year) >= 2023;

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

            const { entryOverrides } = get();

            return initialVotingCountries.map((c) =>
              applyEntryOverride(
                {
                  code: c.code,
                  name: c.name,
                  ...(c.flag ? { flag: c.flag } : {}),
                } as VotingCountry,
                entryOverrides[c.code],
              ),
            );
          },

          getStageVotingCountries: (
            stageId?: string,
            {
              fromScoreboard = true,
              channel,
            }: StageVotingCountriesOptions = {},
          ) => {
            const { configuredEventStages } = get();
            const { eventStages, currentStageId } =
              useScoreboardStore.getState();

            const relevantStageId = stageId ?? currentStageId;

            const configuredEventStage = configuredEventStages.find(
              (stage) => stage.id === relevantStageId,
            );
            const relevantStage = fromScoreboard
              ? eventStages.find((stage) => stage.id === relevantStageId) ||
                configuredEventStage
              : configuredEventStage;

            if (!relevantStage) {
              return [];
            }

            return filterVotersByChannel(
              relevantStage.votingCountries || [],
              channel ?? getStagePhaseChannel(relevantStage),
              getEffectiveVoterChannels(relevantStage),
            );
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
                assignedGroup !== CountryAssignmentGroup.NOT_PARTICIPATING;

              if (participatesSomewhere) {
                participants.push(country);
              }
            });

            return participants;
          },

          updateCountriesForYear: async (year: Year) => {
            const { settings } = useGeneralStore.getState();
            const preset = await loadCountriesByPreset(
              year,
              settings.contestType,
            );

            const initialOdds: Record<
              string,
              { juryOdds?: number; televoteOdds?: number }
            > = {};

            preset.countries.forEach((country) => {
              initialOdds[country.code] = {
                juryOdds: country.juryOdds ?? 50,
                televoteOdds: country.televoteOdds ?? 50,
              };
            });

            set({
              allCountriesForYear: preset.countries,
              semiFinalVotingMode:
                preset.semiFinalVotingMode ?? StageVotingMode.TELEVOTE_ONLY,
              configuredEventStages: [],
              eventAssignments: {},
              countryOdds: initialOdds,
            });
            // Names and flags belong to the line-up: a new edition starts
            // from its own (historical names, then the account's defaults).
            const { useHistoricalNames, defaultEntryOverrides } =
              useGeneralStore.getState().settings;

            get().replaceEntryOverrides(
              freshEntryOverrides({
                year: Number(year),
                historicalNames: useHistoricalNames,
                defaults: defaultEntryOverrides,
              }),
            );
            // A new line-up has no draw state (waiting countries, pins, chips).
            useAllocationDrawStore.getState().reset();
          },

          loadYearOdds: (countries: BaseCountry[]) => {
            const yearOdds = resolveYearOddsFor(
              countries,
              get().allCountriesForYear,
            );

            set((state) => ({
              countryOdds: {
                ...state.countryOdds,
                ...yearOdds,
              },
            }));
          },

          setInitialCountriesForYear: async (
            year: Year,
            options?: { force?: boolean; contestType?: ContestType },
          ) => {
            const { force = false, contestType = 'esc' } = options || {};

            if (!force && get().allCountriesForYear.length > 0) return;

            const preset = await loadCountriesByPreset(year, contestType);

            let initialOdds: Record<
              string,
              { juryOdds?: number; televoteOdds?: number }
            > = get().countryOdds;
            const shouldLoadOdds = Object.keys(initialOdds).length === 0;

            if (shouldLoadOdds) {
              initialOdds = {};

              preset.countries.forEach((country) => {
                initialOdds[country.code] = {
                  juryOdds: country.juryOdds ?? 50,
                  televoteOdds: country.televoteOdds ?? 50,
                };
              });
            }

            set({
              allCountriesForYear: preset.countries,
              semiFinalVotingMode:
                preset.semiFinalVotingMode ?? StageVotingMode.TELEVOTE_ONLY,
              countryOdds: initialOdds,
            });
          },

          getAllCountries: (includeCustomCountries = true) => {
            const { customCountries, entryOverrides } = get();
            const standard = standardCountriesFor(entryOverrides);

            return includeCustomCountries
              ? [...standard, ...customCountries]
              : standard;
          },

          getCanonicalCountries: (includeCustomCountries = true) => {
            const { customCountries } = get();

            return includeCustomCountries
              ? [...ALL_COUNTRIES, ...customCountries]
              : ALL_COUNTRIES;
          },

          setEntryOverride: (code, override) => {
            const previous = get().entryOverrides;
            const normalized = normalizeEntryOverride(code, override);
            const next = { ...previous };

            if (normalized) next[code] = normalized;
            else delete next[code];

            if (changedEntryOverrideCodes(previous, next).length === 0) return;

            set({ entryOverrides: next });
            redrawEntryCopies(previous, next);
          },

          swapHistoricalNames: (from, to) => {
            get().replaceEntryOverrides(
              rebaseHistoricalNames(get().entryOverrides, from, to),
            );
          },

          replaceEntryOverrides: (overrides) => {
            const previous = get().entryOverrides;

            if (changedEntryOverrideCodes(previous, overrides).length === 0) {
              return;
            }

            set({ entryOverrides: overrides });
            redrawEntryCopies(previous, overrides);
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

          setBulkCountryOdds: (odds, replace = false) => {
            set((state) => ({
              // `replace` fully swaps the odds map (used on contest load so stale
              // odds — e.g. custom entries from a previously loaded contest — are
              // cleared). Default merges, as the settings panel expects.
              countryOdds: replace
                ? { ...odds }
                : { ...state.countryOdds, ...odds },
            }));
          },
        };
      },
      {
        name: 'countries-storage',
        storage: safeLocalStorage(),
        partialize: (state) => ({
          eventSetupModalOpen: state.eventSetupModalOpen,
          eventAssignments: state.eventAssignments,
          configuredEventStages: state.configuredEventStages,
          countryOdds: state.countryOdds,
          // Line-ups store codes; an offline launch can't fetch the user's
          // custom entries, so keep their names and flags here
          // (SyncCustomEntries replaces them once the account's list loads).
          customCountries: state.customCountries,
          entryOverrides: state.entryOverrides,
        }),
        merge: (persistedState, currentState) => {
          const m = deepMerge(currentState, persistedState);

          return {
            ...m,
            entryOverrides: sanitizeEntryOverrides(
              (persistedState as Partial<CountriesState> | undefined)
                ?.entryOverrides,
            ),
          };
        },
      },
    ),
    {
      name: 'countries-store',
      enabled: process.env.NODE_ENV === 'development',
    },
  ),
);
