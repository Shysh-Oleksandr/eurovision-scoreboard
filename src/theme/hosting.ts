import { years, Year } from '../config';

import { BaseCountry } from '@/models';
import { getFlagPath } from '@/helpers/getFlagPath';

export type HostingCountryData = {
  code: string;
  logo: string;
};

// Hosting country logos by year (2004-2025)
const hostingLogosByYear: Record<Year, HostingCountryData> = {
  '2004': { code: 'TR', logo: '/hostingCountryLogos/Turkey2004.svg' },
  '2005': { code: 'UA', logo: '/hostingCountryLogos/Ukraine2023.svg' },
  '2006': { code: 'GR', logo: '/hostingCountryLogos/Greece2006.svg' },
  '2007': { code: 'FI', logo: '/hostingCountryLogos/Finland2007.svg' },
  '2008': { code: 'RS', logo: '/hostingCountryLogos/Serbia2008.svg' },
  '2009': { code: 'RU', logo: '/hostingCountryLogos/Russia2009.svg' },
  '2010': { code: 'NO', logo: '/hostingCountryLogos/Norway2010.svg' },
  '2011': { code: 'DE', logo: '/hostingCountryLogos/Germany2011.svg' },
  '2012': { code: 'AZ', logo: '/hostingCountryLogos/Azerbaijan2012.svg' },
  '2013': { code: 'SE', logo: '/hostingCountryLogos/Sweden2024.svg' },
  '2014': { code: 'DK', logo: '/hostingCountryLogos/Denmark2014.svg' },
  '2015': { code: 'AT', logo: '/hostingCountryLogos/Austria2015.svg' },
  '2016': { code: 'SE', logo: '/hostingCountryLogos/Sweden2024.svg' },
  '2017': { code: 'UA', logo: '/hostingCountryLogos/Ukraine2023.svg' },
  '2018': { code: 'PT', logo: '/hostingCountryLogos/Portugal2018.svg' },
  '2019': { code: 'IL', logo: '/hostingCountryLogos/Israel2019.svg' },
  '2020': { code: 'NL', logo: '/hostingCountryLogos/Netherlands2021.svg' },
  '2021': { code: 'NL', logo: '/hostingCountryLogos/Netherlands2021.svg' },
  '2022': { code: 'IT', logo: '/hostingCountryLogos/Italy2022.svg' },
  '2023': { code: 'UA', logo: '/hostingCountryLogos/Ukraine2023.svg' },
  '2024': { code: 'SE', logo: '/hostingCountryLogos/Sweden2024.svg' },
  '2025': { code: 'CH', logo: '/hostingCountryLogos/Switzerland2025.svg' },
};

// Optional per-country overrides for a default hosting logo not tied to a specific year
// Extend this with entries like: 'SE': '/hostingCountryLogos/SwedenDefault.svg'
const countryDefaultHostingLogos: Partial<Record<string, string>> = {
  AM: '/hostingCountryLogos/EuroArmenia.svg',
  AL: '/hostingCountryLogos/EuroAlbania.svg',
  AD: '/hostingCountryLogos/EuroAndorra.svg',
  AU: '/hostingCountryLogos/EuroAustralia.svg',
  BE: '/hostingCountryLogos/EuroBelgium.svg',
  BY: '/hostingCountryLogos/EuroBielorrusia.svg',
  BA: '/hostingCountryLogos/EuroBosnia-Herzegovina.svg',
  BG: '/hostingCountryLogos/EuroBulgaria.svg',
  HR: '/hostingCountryLogos/EuroCroacia.svg',
  CZ: '/hostingCountryLogos/EuroCzechia.svg',
  CY: '/hostingCountryLogos/EuroChipre.svg',
  GE: '/hostingCountryLogos/EuroGeorgia.svg',
  HU: '/hostingCountryLogos/EuroHungary.svg',
  SK: '/hostingCountryLogos/EuroEslovaquia.svg',
  SI: '/hostingCountryLogos/EuroEslovenia.svg',
  ES: '/hostingCountryLogos/EuroSpain.svg',
  EE: '/hostingCountryLogos/EuroEstonia.svg',
  FR: '/hostingCountryLogos/EuroFrancia.svg',
  IE: '/hostingCountryLogos/EuroIrlanda.svg',
  IS: '/hostingCountryLogos/EuroIslandia.svg',
  LV: '/hostingCountryLogos/EuroLetonia.svg',
  LT: '/hostingCountryLogos/EuroLithuania.svg',
  LU: '/hostingCountryLogos/EuroLuxemburgo.svg',
  MK: '/hostingCountryLogos/EuroMacedonia_del_Norte.svg',
  MT: '/hostingCountryLogos/EuroMalta.svg',
  MC: '/hostingCountryLogos/EuroMonaco.svg',
  MD: '/hostingCountryLogos/EuroMoldova.svg',
  ME: '/hostingCountryLogos/EuroMontenegro.svg',
  MA: '/hostingCountryLogos/EuroMorocco.svg',
  PL: '/hostingCountryLogos/EuroPolonia.svg',
  SM: '/hostingCountryLogos/EuroSan_Marino.svg',
  GB: '/hostingCountryLogos/EuroReino_Unido.svg',
  WW: '/hostingCountryLogos/EuroResto_del_Mundo.svg',
  RO: '/hostingCountryLogos/EuroRumania.svg',
  CS: '/hostingCountryLogos/EuroSerbia_and_Montenegro.svg',
  YU: '/hostingCountryLogos/EuroYugoslavia.svg',
};

// Helper: latest-first list of years
const yearsDesc: Year[] = [...years].reverse() as Year[];

export function getHostingCountryByYear(year: Year): HostingCountryData {
  return hostingLogosByYear[year] || hostingLogosByYear['2025'];
}

export function getHostingLogoByCountryCode(countryCode: string): string | null {
  // Check explicit default override first
  const override = countryDefaultHostingLogos[countryCode];
  if (override) return override;

  // Otherwise, find the most recent hosting logo for that country
  const found = yearsDesc.find((y) => hostingLogosByYear[y]?.code === countryCode);
  return found ? hostingLogosByYear[found].logo : null;
}

export function getHostingCountryLogo(
  country: BaseCountry,
  shouldShowHeartFlagIcon = true
): { logo: string; isExisting: boolean } {
  if (!shouldShowHeartFlagIcon) {
    return { logo: getFlagPath(country), isExisting: false };
  }

  const existing = getHostingLogoByCountryCode(country.code);
  if (existing) {
    return { logo: existing, isExisting: true };
  }

  return { logo: getFlagPath(country), isExisting: false };
}
