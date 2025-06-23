import { BaseCountry } from '../../models';

import { COMMON_COUNTRIES } from './common-countries';

export const COUNTRIES_2013: BaseCountry[] = [
  { ...COMMON_COUNTRIES.Armenia, isQualified: true, semiFinalGroup: 'SF2' },
  { ...COMMON_COUNTRIES.Azerbaijan, isQualified: true, semiFinalGroup: 'SF2' },
  { ...COMMON_COUNTRIES.Belarus, isQualified: true, semiFinalGroup: 'SF1' },
  { ...COMMON_COUNTRIES.Belgium, isQualified: true, semiFinalGroup: 'SF1' },
  { ...COMMON_COUNTRIES.Denmark, isQualified: true, semiFinalGroup: 'SF1' },
  { ...COMMON_COUNTRIES.Estonia, isQualified: true, semiFinalGroup: 'SF1' },
  { ...COMMON_COUNTRIES.Finland, isQualified: true, semiFinalGroup: 'SF2' },
  { ...COMMON_COUNTRIES.France, isQualified: true, isAutoQualified: true },
  { ...COMMON_COUNTRIES.Germany, isQualified: true, isAutoQualified: true },
  { ...COMMON_COUNTRIES.Georgia, isQualified: true, semiFinalGroup: 'SF2' },
  { ...COMMON_COUNTRIES.Greece, isQualified: true, semiFinalGroup: 'SF2' },
  { ...COMMON_COUNTRIES.Hungary, isQualified: true, semiFinalGroup: 'SF2' },
  { ...COMMON_COUNTRIES.Iceland, isQualified: true, semiFinalGroup: 'SF2' },
  { ...COMMON_COUNTRIES.Ireland, isQualified: true, semiFinalGroup: 'SF1' },
  { ...COMMON_COUNTRIES.Italy, isQualified: true, isAutoQualified: true },
  { ...COMMON_COUNTRIES.Lithuania, isQualified: true, semiFinalGroup: 'SF1' },
  { ...COMMON_COUNTRIES.Malta, isQualified: true, semiFinalGroup: 'SF2' },
  { ...COMMON_COUNTRIES.Moldova, isQualified: true, semiFinalGroup: 'SF1' },
  { ...COMMON_COUNTRIES.Netherlands, isQualified: true, semiFinalGroup: 'SF1' },
  { ...COMMON_COUNTRIES.Norway, isQualified: true, semiFinalGroup: 'SF2' },
  { ...COMMON_COUNTRIES.Romania, isQualified: true, semiFinalGroup: 'SF2' },
  { ...COMMON_COUNTRIES.Russia, isQualified: true, semiFinalGroup: 'SF1' },
  { ...COMMON_COUNTRIES.Spain, isQualified: true, isAutoQualified: true },
  { ...COMMON_COUNTRIES.Sweden, isQualified: true, isAutoQualified: true },
  { ...COMMON_COUNTRIES.Ukraine, isQualified: true, semiFinalGroup: 'SF1' },
  {
    ...COMMON_COUNTRIES.UnitedKingdom,
    isQualified: true,
    isAutoQualified: true,
  },

  // Not qualified
  { ...COMMON_COUNTRIES.Albania, isQualified: false, semiFinalGroup: 'SF2' },
  { ...COMMON_COUNTRIES.Austria, isQualified: false, semiFinalGroup: 'SF1' },
  { ...COMMON_COUNTRIES.Bulgaria, isQualified: false, semiFinalGroup: 'SF2' },
  { ...COMMON_COUNTRIES.Croatia, isQualified: false, semiFinalGroup: 'SF1' },
  { ...COMMON_COUNTRIES.Cyprus, isQualified: false, semiFinalGroup: 'SF1' },
  { ...COMMON_COUNTRIES.Israel, isQualified: false, semiFinalGroup: 'SF2' },
  { ...COMMON_COUNTRIES.Latvia, isQualified: false, semiFinalGroup: 'SF2' },
  { ...COMMON_COUNTRIES.Montenegro, isQualified: false, semiFinalGroup: 'SF1' },
  {
    ...COMMON_COUNTRIES.NorthMacedonia,
    isQualified: false,
    semiFinalGroup: 'SF2',
  },
  { ...COMMON_COUNTRIES.SanMarino, isQualified: false, semiFinalGroup: 'SF2' },
  { ...COMMON_COUNTRIES.Serbia, isQualified: false, semiFinalGroup: 'SF1' },
  { ...COMMON_COUNTRIES.Slovenia, isQualified: false, semiFinalGroup: 'SF1' },
  {
    ...COMMON_COUNTRIES.Switzerland,
    isQualified: false,
    semiFinalGroup: 'SF2',
  },
];
