import { create } from 'zustand';

import { devtools } from 'zustand/middleware';

import { Year } from '../config';
import { ALL_COUNTRIES } from '../data/countries/common-countries';
import { getCountriesByYear } from '../data/data';
import {
  deleteCustomCountryFromDB,
  getCustomCountries,
  saveCustomCountry,
} from '../helpers/indexedDB';
import { BaseCountry, EventMode, EventStage, StageId } from '../models';

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

  // Actions
  setEventSetupModalOpen: (open: boolean) => void;
  getQualifiedCountries: () => BaseCountry[];
  getVotingCountries: () => BaseCountry[];
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

      getVotingCountries: () => {
        const { selectedCountries, allCountriesForYear } = get();
        const { getCurrentStage } = useScoreboardStore.getState();
        const currentStage = getCurrentStage();

        // In a semi-final, only participating countries are voting.
        if (currentStage && currentStage.id !== StageId.GF) {
          return currentStage.countries.sort((a, b) =>
            a.name.localeCompare(b.name),
          );
        }

        // In the Grand Final, all selected countries for the event can vote.
        if (selectedCountries.length > 0) {
          return selectedCountries.sort((a, b) => a.name.localeCompare(b.name));
        }

        // Otherwise, fall back to all countries for the year.
        return allCountriesForYear.sort((a, b) => a.name.localeCompare(b.name));
      },

      getVotingCountry: () => {
        const { getVotingCountries } = get();

        const { votingCountryIndex, getCurrentStage } =
          useScoreboardStore.getState();

        const currentStage = getCurrentStage();

        return currentStage?.isJuryVoting
          ? getVotingCountries()[votingCountryIndex]
          : currentStage?.countries[votingCountryIndex];
      },

      getVotingCountriesLength: () => {
        return get().getVotingCountries().length;
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
    }),
    { name: 'countries-store' },
  ),
);
