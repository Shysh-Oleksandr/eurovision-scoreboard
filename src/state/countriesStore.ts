import { create } from 'zustand';

import { devtools, persist } from 'zustand/middleware';

import { Year } from '../config';
import { ALL_COUNTRIES } from '../data/countries/common-countries';
import { getCountriesByYear } from '../data/data';
import { BaseCountry, Country } from '../models';

import { useScoreboardStore } from './scoreboardStore';

interface CountriesState {
  // State
  allCountriesForYear: BaseCountry[]; // All countries from the selected year, both qualified and not qualified
  selectedCountries: BaseCountry[]; // Countries selected for the current event
  eventSetupModalOpen: boolean;
  customCountries: BaseCountry[];

  // Actions
  setEventSetupModalOpen: (open: boolean) => void;
  getQualifiedCountries: () => BaseCountry[];
  getVotingCountries: () => BaseCountry[];
  getVotingCountry: () => BaseCountry;
  getVotingCountriesLength: () => number;
  getInitialCountries: () => Country[];
  setSelectedCountries: (countries: BaseCountry[]) => void;
  getAutoQualifiedCountries: () => BaseCountry[];
  updateCountriesForYear: (year: Year) => void;
  setInitialCountriesForYear: (year: Year) => void;
  addCustomCountry: (country: Omit<BaseCountry, 'code' | 'category'>) => void;
  updateCustomCountry: (country: BaseCountry) => void;
  deleteCustomCountry: (countryCode: string) => void;
  getAllCountries: () => BaseCountry[];
}

export const useCountriesStore = create<CountriesState>()(
  devtools(
    persist(
      (set, get) => ({
        // Initial state
        allCountriesForYear: [],
        selectedCountries: [],
        eventSetupModalOpen: true,
        customCountries: [],

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

          // If we have selected countries, use those
          if (selectedCountries.length > 0) {
            return selectedCountries.sort((a, b) =>
              a.name.localeCompare(b.name),
            );
          }

          // Otherwise fall back to all countries for the year
          return allCountriesForYear.sort((a, b) =>
            a.name.localeCompare(b.name),
          );
        },

        getVotingCountry: () => {
          const { getVotingCountries } = get();

          const { votingCountryIndex, getCurrentStage } =
            useScoreboardStore.getState();

          const currentStage = getCurrentStage();

          return currentStage.isJuryVoting
            ? getVotingCountries()[votingCountryIndex]
            : currentStage.countries[votingCountryIndex];
        },

        getVotingCountriesLength: () => {
          return get().getVotingCountries().length;
        },

        getInitialCountries: () => {
          const qualifiedCountries = get().getQualifiedCountries();

          return qualifiedCountries.map(
            (country) =>
              ({
                ...country,
                juryPoints: 0,
                televotePoints: 0,
                points: 0,
                lastReceivedPoints: null,
              } as Country),
          );
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

          set({
            allCountriesForYear: countries,
            selectedCountries: [],
          });
        },

        setInitialCountriesForYear: (year: Year) => {
          if (get().allCountriesForYear.length > 0) return;

          const countries = getCountriesByYear(year);

          set({
            allCountriesForYear: countries,
          });
        },

        addCustomCountry: (country: Omit<BaseCountry, 'code' | 'category'>) => {
          const newCountry: BaseCountry = {
            ...country,
            code: `custom-${country.name
              .toLowerCase()
              .replace(/\s/g, '-')}-${Date.now()}`,
            category: 'Custom',
          };

          set((state) => ({
            customCountries: [...state.customCountries, newCountry],
          }));
        },

        updateCustomCountry: (country: BaseCountry) => {
          set((state) => ({
            customCountries: state.customCountries.map((c) =>
              c.code === country.code ? country : c,
            ),
          }));
        },

        deleteCustomCountry: (countryCode: string) => {
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
      }),
      {
        name: 'countries-storage',
        partialize: (state) => ({ customCountries: state.customCountries }),
      },
    ),
    { name: 'countries-store' },
  ),
);
