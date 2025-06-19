import { create } from 'zustand';

import { devtools } from 'zustand/middleware';

import { Year } from '../config';
import { getCountriesByYear, SUPPORTED_YEARS } from '../data/data';
import { BaseCountry } from '../models';
import { getThemeForYear } from '../theme/themes';
import { themesInfo } from '../theme/themesInfo';
import { Theme, ThemeInfo } from '../theme/types';

interface CountriesState {
  // State
  allCountries: BaseCountry[]; // All countries from the selected year, both qualified and not qualified
  year: Year;
  theme: Theme;
  themeInfo: ThemeInfo;

  // Actions
  setYear: (year: Year) => void;
  getQualifiedCountries: () => BaseCountry[];
  getCountriesLength: () => number;
  getInitialCountries: () => {
    name: string;
    code: string;
    flag: string;
    isQualified: boolean;
    points: number;
    lastReceivedPoints: null;
  }[];
}

export const useCountriesStore = create<CountriesState>()(
  devtools(
    (set, get) => ({
      // Initial state
      allCountries: getCountriesByYear('2025'),
      year: '2025',
      theme: getThemeForYear('2025'),
      themeInfo: themesInfo['2025'],

      // Actions
      setYear: (year: Year) => {
        // Remove all theme classes
        document.documentElement.classList.remove(
          ...SUPPORTED_YEARS.map((year) => `theme-${year}`),
        );
        // Add the new theme class
        document.documentElement.classList.add(`theme-${year}`);

        set({
          allCountries: getCountriesByYear(year),
          year,
          theme: getThemeForYear(year),
          themeInfo: themesInfo[year],
        });
      },

      getQualifiedCountries: () => {
        const { allCountries } = get();

        return allCountries.filter((country) => country.isQualified);
      },

      getCountriesLength: () => {
        const { allCountries } = get();

        return allCountries.length;
      },

      getInitialCountries: () => {
        const qualifiedCountries = get().getQualifiedCountries();

        return qualifiedCountries.map((country) => ({
          ...country,
          points: 0,
          lastReceivedPoints: null,
        }));
      },
    }),
    { name: 'countries-store' },
  ),
);
