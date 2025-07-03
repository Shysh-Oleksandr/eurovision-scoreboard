import { create } from 'zustand';

import { devtools, persist } from 'zustand/middleware';

import { Year } from '../config';
import { ALL_COUNTRIES } from '../data/countries/common-countries';
import { getCountriesByYear } from '../data/data';
import { BaseCountry, SemiFinalGroup } from '../models';

import { INITIAL_YEAR } from './generalStore';
import { useScoreboardStore } from './scoreboardStore';

interface CountriesState {
  // State
  allCountriesForYear: BaseCountry[]; // All countries from the selected year, both qualified and not qualified
  selectedCountries: BaseCountry[]; // Countries selected for the current event
  eventSetupModalOpen: boolean;
  semiFinalResults: Record<string, number>;
  customCountries: BaseCountry[];

  // Actions
  setEventSetupModalOpen: (open: boolean) => void;
  getQualifiedCountries: () => BaseCountry[];
  getVotingCountries: () => BaseCountry[];
  getVotingCountry: () => BaseCountry;
  getVotingCountriesLength: () => number;
  getInitialCountries: () => {
    name: string;
    code: string;
    isQualified?: boolean;
    semiFinalGroup?: SemiFinalGroup;
    isAutoQualified?: boolean;
    isSelected?: boolean;
    isQualifiedFromSemi?: boolean;
    points: number;
    lastReceivedPoints: null;
  }[];
  setSelectedCountries: (countries: BaseCountry[]) => void;
  getAutoQualifiedCountries: () => BaseCountry[];
  getQualifiedFromSemiCountries: () => BaseCountry[];
  setQualifiedFromSemi: (
    countryCodes: string[],
    semiFinalGroup: SemiFinalGroup,
  ) => void;
  setSemiFinalResults: (results: Record<string, number>) => void;
  getSemiFinalPoints: (countryCode: string) => number;
  updateCountriesForYear: (year: Year) => void;
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
        allCountriesForYear: getCountriesByYear(INITIAL_YEAR),
        selectedCountries: [],
        eventSetupModalOpen: true,
        semiFinalResults: {},
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
                  country.isSelected ||
                  country.isAutoQualified ||
                  country.isQualifiedFromSemi,
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

          const { votingCountryIndex, isJuryVoting, countries } =
            useScoreboardStore.getState();

          return isJuryVoting
            ? getVotingCountries()[votingCountryIndex]
            : countries[votingCountryIndex];
        },

        getVotingCountriesLength: () => {
          return get().getVotingCountries().length;
        },

        getInitialCountries: () => {
          const qualifiedCountries = get().getQualifiedCountries();

          return qualifiedCountries
            .sort((a, b) => a.name.localeCompare(b.name))
            .map((country) => ({
              ...country,
              points: 0,
              lastReceivedPoints: null,
            }));
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
              .filter(
                (country) => country.isAutoQualified && country.isSelected,
              )
              .sort((a, b) => a.name.localeCompare(b.name));
          }

          return allCountriesForYear
            .filter((country) => country.isAutoQualified)
            .sort((a, b) => a.name.localeCompare(b.name));
        },

        getQualifiedFromSemiCountries: () => {
          const { selectedCountries } = get();

          return selectedCountries
            .filter((country) => country.isQualifiedFromSemi)
            .sort((a, b) => a.name.localeCompare(b.name));
        },

        setQualifiedFromSemi: (
          countryCodes: string[],
          semiFinalGroup: SemiFinalGroup,
        ) => {
          const { selectedCountries } = get();

          const updatedCountries = selectedCountries.map((country) => {
            if (
              country.semiFinalGroup === semiFinalGroup &&
              countryCodes.includes(country.code)
            ) {
              return {
                ...country,
                isQualifiedFromSemi: true,
              };
            }

            return country;
          });

          set({
            selectedCountries: updatedCountries,
          });
        },

        setSemiFinalResults: (results: Record<string, number>) => {
          set({
            semiFinalResults: results,
          });
        },

        getSemiFinalPoints: (countryCode: string) => {
          return get().semiFinalResults[countryCode] || 0;
        },

        updateCountriesForYear: (year: Year) => {
          const countries = getCountriesByYear(year);

          set({
            allCountriesForYear: countries,
            selectedCountries: [],
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
