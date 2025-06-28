import { create } from 'zustand';

import { devtools } from 'zustand/middleware';

import { Year } from '../config';
import { getCountriesByYear } from '../data/data';
import { BaseCountry, SemiFinalGroup } from '../models';

import { INITIAL_YEAR } from './generalStore';

interface CountriesState {
  // State
  allCountriesForYear: BaseCountry[]; // All countries from the selected year, both qualified and not qualified
  selectedCountries: BaseCountry[]; // Countries selected for the current event
  eventSetupModalOpen: boolean;
  semiFinalResults: Record<string, number>;

  // Actions
  setEventSetupModalOpen: (open: boolean) => void;
  getQualifiedCountries: () => BaseCountry[];
  getVotingCountries: () => BaseCountry[];
  getVotingCountry: () => BaseCountry;
  getVotingCountriesLength: () => number;
  getInitialCountries: () => {
    name: string;
    code: string;
    isQualified: boolean;
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
}

export const useCountriesStore = create<CountriesState>()(
  devtools(
    (set, get) => ({
      // Initial state
      allCountriesForYear: getCountriesByYear(INITIAL_YEAR),
      selectedCountries: [],
      eventSetupModalOpen: true,
      semiFinalResults: {},

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
          return selectedCountries.filter(
            (country) =>
              country.isSelected ||
              country.isAutoQualified ||
              country.isQualifiedFromSemi,
          );
        }

        // Otherwise fall back to the default qualified countries
        return allCountriesForYear.filter((country) => country.isQualified);
      },

      getVotingCountries: () => {
        const { selectedCountries, allCountriesForYear } = get();

        // If we have selected countries, use those
        if (selectedCountries.length > 0) {
          return selectedCountries;
        }

        // Otherwise fall back to all countries for the year
        return allCountriesForYear;
      },

      getVotingCountry: () => {
        const { getVotingCountries } = get();

        const { votingCountryIndex, isJuryVoting, countries } =
          require('./scoreboardStore').useScoreboardStore.getState();

        return isJuryVoting
          ? getVotingCountries()[votingCountryIndex]
          : countries[votingCountryIndex];
      },

      getVotingCountriesLength: () => {
        return get().getVotingCountries().length;
      },

      getInitialCountries: () => {
        const qualifiedCountries = get().getQualifiedCountries();

        return qualifiedCountries.map((country) => ({
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
          return selectedCountries.filter(
            (country) => country.isAutoQualified && country.isSelected,
          );
        }

        return allCountriesForYear.filter((country) => country.isAutoQualified);
      },

      getQualifiedFromSemiCountries: () => {
        const { selectedCountries } = get();

        return selectedCountries.filter(
          (country) => country.isQualifiedFromSemi,
        );
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
    }),
    { name: 'countries-store' },
  ),
);
