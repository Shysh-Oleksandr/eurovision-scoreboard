import { BaseCountry } from '../../models';

import { COMMON_COUNTRIES } from './common-countries';

export const COUNTRIES_2014: BaseCountry[] = [
  { ...COMMON_COUNTRIES.Armenia, isQualified: true, semiFinalGroup: 'SF1' },
  { ...COMMON_COUNTRIES.Austria, isQualified: true, semiFinalGroup: 'SF2' },
  { ...COMMON_COUNTRIES.Azerbaijan, isQualified: true, semiFinalGroup: 'SF1' },
  { ...COMMON_COUNTRIES.Belarus, isQualified: true, semiFinalGroup: 'SF2' },
  { ...COMMON_COUNTRIES.Denmark, isQualified: true, isAutoQualified: true },
  { ...COMMON_COUNTRIES.Finland, isQualified: true, semiFinalGroup: 'SF2' },
  { ...COMMON_COUNTRIES.France, isQualified: true, isAutoQualified: true },
  { ...COMMON_COUNTRIES.Germany, isQualified: true, isAutoQualified: true },
  { ...COMMON_COUNTRIES.Greece, isQualified: true, semiFinalGroup: 'SF2' },
  { ...COMMON_COUNTRIES.Hungary, isQualified: true, semiFinalGroup: 'SF1' },
  { ...COMMON_COUNTRIES.Iceland, isQualified: true, semiFinalGroup: 'SF1' },
  { ...COMMON_COUNTRIES.Italy, isQualified: true, isAutoQualified: true },
  { ...COMMON_COUNTRIES.Malta, isQualified: true, semiFinalGroup: 'SF2' },
  { ...COMMON_COUNTRIES.Montenegro, isQualified: true, semiFinalGroup: 'SF1' },
  { ...COMMON_COUNTRIES.Netherlands, isQualified: true, semiFinalGroup: 'SF1' },
  { ...COMMON_COUNTRIES.Norway, isQualified: true, semiFinalGroup: 'SF2' },
  { ...COMMON_COUNTRIES.Poland, isQualified: true, semiFinalGroup: 'SF2' },
  { ...COMMON_COUNTRIES.Romania, isQualified: true, semiFinalGroup: 'SF2' },
  { ...COMMON_COUNTRIES.Russia, isQualified: true, semiFinalGroup: 'SF1' },
  { ...COMMON_COUNTRIES.SanMarino, isQualified: true, semiFinalGroup: 'SF1' },
  { ...COMMON_COUNTRIES.Slovenia, isQualified: true, semiFinalGroup: 'SF2' },
  { ...COMMON_COUNTRIES.Spain, isQualified: true, isAutoQualified: true },
  { ...COMMON_COUNTRIES.Sweden, isQualified: true, semiFinalGroup: 'SF1' },
  { ...COMMON_COUNTRIES.Switzerland, isQualified: true, semiFinalGroup: 'SF2' },
  { ...COMMON_COUNTRIES.Ukraine, isQualified: true, semiFinalGroup: 'SF1' },
  {
    ...COMMON_COUNTRIES.UnitedKingdom,
    isQualified: true,
    isAutoQualified: true,
  },

  // Not qualified
  { ...COMMON_COUNTRIES.Albania, isQualified: false, semiFinalGroup: 'SF1' },
  { ...COMMON_COUNTRIES.Belgium, isQualified: false, semiFinalGroup: 'SF1' },
  { ...COMMON_COUNTRIES.Estonia, isQualified: false, semiFinalGroup: 'SF1' },
  { ...COMMON_COUNTRIES.Georgia, isQualified: false, semiFinalGroup: 'SF2' },
  { ...COMMON_COUNTRIES.Ireland, isQualified: false, semiFinalGroup: 'SF2' },
  { ...COMMON_COUNTRIES.Israel, isQualified: false, semiFinalGroup: 'SF2' },
  { ...COMMON_COUNTRIES.Latvia, isQualified: false, semiFinalGroup: 'SF1' },
  { ...COMMON_COUNTRIES.Lithuania, isQualified: false, semiFinalGroup: 'SF2' },
  { ...COMMON_COUNTRIES.Moldova, isQualified: false, semiFinalGroup: 'SF1' },
  {
    ...COMMON_COUNTRIES.NorthMacedonia,
    isQualified: false,
    semiFinalGroup: 'SF2',
  },
  { ...COMMON_COUNTRIES.Portugal, isQualified: false, semiFinalGroup: 'SF1' },
];
