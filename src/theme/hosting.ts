import { years, Year } from '../config';

import { BaseCountry } from '@/models';
import {
  getFlagPath,
  getFlagPathForImageGeneration,
} from '@/helpers/getFlagPath';

export type HostingCountryData = {
  code: string;
  logo: string;
};

// Hosting country logos by year (2004-2026)
const hostingLogosByYear: Record<Year, HostingCountryData> = {
  '2004': { code: 'TR', logo: '/hostingCountryLogos/Turkey2004.svg' },
  '2005': { code: 'UA', logo: '/hostingCountryLogos/Ukraine2023.svg' },
  '2006': { code: 'GR', logo: '/hostingCountryLogos/Greece2006.svg' },
  '2007': { code: 'FI', logo: '/hostingCountryLogos/Finland2007.svg' },
  '2008': { code: 'RS', logo: '/hostingCountryLogos/EuroServia.png' },
  '2009': { code: 'RU', logo: '/hostingCountryLogos/Russia2009.svg' },
  '2010': { code: 'NO', logo: '/hostingCountryLogos/Norway2010.svg' },
  '2011': { code: 'DE', logo: '/hostingCountryLogos/Germany2011.svg' },
  '2012': { code: 'AZ', logo: '/hostingCountryLogos/Azerbaijan2012.svg' },
  '2013': { code: 'SE', logo: '/hostingCountryLogos/Sweden2024.svg' },
  '2014': { code: 'DK', logo: '/hostingCountryLogos/Denmark2014.svg' },
  '2015': { code: 'AT', logo: '/hostingCountryLogos/Austria2015.svg' },
  '2016': { code: 'SE', logo: '/hostingCountryLogos/Sweden2024.svg' },
  '2017': { code: 'UA', logo: '/hostingCountryLogos/Ukraine2023.svg' },
  '2018': { code: 'PT', logo: '/hostingCountryLogos/EuroPortugal.png' },
  '2019': { code: 'IL', logo: '/hostingCountryLogos/Israel2019.svg' },
  '2020': { code: 'NL', logo: '/hostingCountryLogos/Netherlands2021.svg' },
  '2021': { code: 'NL', logo: '/hostingCountryLogos/Netherlands2021.svg' },
  '2022': { code: 'IT', logo: '/hostingCountryLogos/Italy2022.svg' },
  '2023': { code: 'UA', logo: '/hostingCountryLogos/Ukraine2023.svg' },
  '2024': { code: 'SE', logo: '/hostingCountryLogos/Sweden2024.svg' },
  '2025': { code: 'CH', logo: '/hostingCountryLogos/Switzerland2025.svg' },
  '2026': { code: 'AT', logo: '/hostingCountryLogos/Austria2015.svg' },
};

const juniorHostingLogosByYear: Record<string, HostingCountryData> = {
  '2016': { code: 'MT', logo: '/hostingCountryLogos/EuroMalta.svg' },
  '2017': { code: 'GE', logo: '/hostingCountryLogos/EuroGeorgia.svg' },
  '2018': { code: 'BY', logo: '/hostingCountryLogos/EuroBielorrusia.svg' },
  '2019': { code: 'PL', logo: '/hostingCountryLogos/EuroPolonia.svg' },
  '2020': { code: 'PL', logo: '/hostingCountryLogos/EuroPolonia.svg' },
  '2021': { code: 'FR', logo: '/hostingCountryLogos/EuroFrancia.svg' },
  '2022': { code: 'AM', logo: '/hostingCountryLogos/EuroArmenia.svg' },
  '2023': { code: 'FR', logo: '/hostingCountryLogos/EuroFrancia.svg' },
  '2024': { code: 'ES', logo: '/hostingCountryLogos/EuroEspana.png' },
  '2025': { code: 'GE', logo: '/hostingCountryLogos/EuroGeorgia.svg' },
  '2026': { code: 'FR', logo: '/hostingCountryLogos/EuroMalta.svg' },
};

// Optional per-country overrides for a default hosting logo not tied to a specific year
// Extend this with entries like: 'SE': '/hostingCountryLogos/SwedenDefault.svg'
const countryDefaultHostingLogos: Partial<Record<string, string>> = {
  AD: '/hostingCountryLogos/EuroAndorra.png',
  AE: '/hostingCountryLogos/EuroEmiratos_Arabes_Unidos.svg',
  AF: '/hostingCountryLogos/EuroAfganistan.png',
  AG: '/hostingCountryLogos/EuroAntigua_y_Barbuda.svg',
  AL: '/hostingCountryLogos/EuroAlbania.svg',
  AM: '/hostingCountryLogos/EuroArmenia.svg',
  AO: '/hostingCountryLogos/EuroAngola.svg',
  AR: '/hostingCountryLogos/EuroArgentina.svg',
  AT: '/hostingCountryLogos/Austria2015.svg',
  AU: '/hostingCountryLogos/EuroAustralia.svg',
  AZ: '/hostingCountryLogos/EuroAzerbaijan2015.svg',
  BA: '/hostingCountryLogos/EuroBosnia-Herzegovina.svg',
  BB: '/hostingCountryLogos/EuroBarbados.svg',
  BD: '/hostingCountryLogos/EuroBanglades.svg',
  BE: '/hostingCountryLogos/EuroBelgium.svg',
  BF: '/hostingCountryLogos/EuroBurkina_Faso.svg',
  BG: '/hostingCountryLogos/EuroBulgaria.svg',
  BH: '/hostingCountryLogos/EuroBarein.svg',
  BI: '/hostingCountryLogos/EuroBurundi.svg',
  BJ: '/hostingCountryLogos/EuroBenin.svg',
  BN: '/hostingCountryLogos/EuroBrunei.svg',
  BO: '/hostingCountryLogos/EuroBolivia.png',
  BR: '/hostingCountryLogos/EuroBrasil_(1968-1992).svg',
  BS: '/hostingCountryLogos/EuroBahamas.svg',
  BT: '/hostingCountryLogos/EuroButan.svg',
  BW: '/hostingCountryLogos/EuroBotsuana.svg',
  BY: '/hostingCountryLogos/EuroBielorrusia.svg',
  BZ: '/hostingCountryLogos/EuroBelice.png',
  CA: '/hostingCountryLogos/EuroCanada.svg',
  CF: '/hostingCountryLogos/EuroRepublica_Centroafricana.svg',
  CG: '/hostingCountryLogos/EuroRepublica_del_Congo.svg',
  CD: '/hostingCountryLogos/Democratic_Republic_of_the_Congo.svg',
  CH: '/hostingCountryLogos/Switzerland2025.svg',
  CI: '/hostingCountryLogos/EuroCosta_de_Marfil.svg',
  CL: '/hostingCountryLogos/EuroChile.svg',
  CM: '/hostingCountryLogos/EuroCamerun.svg',
  CN: '/hostingCountryLogos/EuroChina.svg',
  CO: '/hostingCountryLogos/EuroColombia.svg',
  CR: '/hostingCountryLogos/EuroCosta_Rica.svg',
  CS: '/hostingCountryLogos/EuroSerbia_and_Montenegro.svg',
  CU: '/hostingCountryLogos/EuroCuba.svg',
  CV: '/hostingCountryLogos/EuroCabo_Verde.svg',
  CY: '/hostingCountryLogos/EuroChipre.svg',
  CZ: '/hostingCountryLogos/EuroCzechia.svg',
  DE: '/hostingCountryLogos/Germany2011.svg',
  DJ: '/hostingCountryLogos/EuroYibuti.svg',
  DK: '/hostingCountryLogos/Denmark2014.svg',
  DM: '/hostingCountryLogos/EuroDominica.svg',
  DO: '/hostingCountryLogos/EuroRepublica_Dominicana.png',
  DZ: '/hostingCountryLogos/EuroAlgeria.svg',
  EC: '/hostingCountryLogos/EuroEcuador.png',
  EE: '/hostingCountryLogos/EuroEstonia.svg',
  EG: '/hostingCountryLogos/EuroEgipto.svg',
  ER: '/hostingCountryLogos/EuroEritrea.svg',
  ES: '/hostingCountryLogos/EuroEspana.png',
  ET: '/hostingCountryLogos/EuroEtiopia.svg',
  FI: '/hostingCountryLogos/Finland2007.svg',
  FJ: '/hostingCountryLogos/EuroFiyi.png',
  FO: '/hostingCountryLogos/EuroFeroe.svg',
  FR: '/hostingCountryLogos/EuroFrancia.svg',
  GA: '/hostingCountryLogos/EuroGabon.svg',
  GB: '/hostingCountryLogos/EuroReino_Unido.svg',
  'GB-ENG': '/hostingCountryLogos/EuroEngland.svg',
  'GB-NIR': '/hostingCountryLogos/EuroIrlanda_del_Norte.svg',
  'GB-SCT': '/hostingCountryLogos/EuroScotland2015.svg',
  'GB-WLS': '/hostingCountryLogos/EuroWales.svg',
  GD: '/hostingCountryLogos/EuroGranada.svg',
  GE: '/hostingCountryLogos/EuroGeorgia.svg',
  GH: '/hostingCountryLogos/EuroGhana.svg',
  GM: '/hostingCountryLogos/EuroGambia.svg',
  GN: '/hostingCountryLogos/EuroGuinea.svg',
  GP: '/hostingCountryLogos/Guadeloupe.svg',
  GQ: '/hostingCountryLogos/EuroGuinea_Ecuatorial.svg',
  GR: '/hostingCountryLogos/Greece2006.svg',
  GT: '/hostingCountryLogos/EuroGuatemala.png',
  GW: '/hostingCountryLogos/EuroGuinea-Bisau.svg',
  GY: '/hostingCountryLogos/EuroGuyana.svg',
  HN: '/hostingCountryLogos/EuroHonduras.svg',
  HK: '/hostingCountryLogos/EuroHong_Kong.svg',
  HR: '/hostingCountryLogos/EuroCroacia.png',
  HT: '/hostingCountryLogos/EuroHaiti.svg',
  HU: '/hostingCountryLogos/EuroHungary.svg',
  ID: '/hostingCountryLogos/EuroIndonesia.svg',
  IE: '/hostingCountryLogos/EuroIrlanda.svg',
  IL: '/hostingCountryLogos/Israel2019.svg',
  IN: '/hostingCountryLogos/EuroIndia.svg',
  IQ: '/hostingCountryLogos/EuroIrak.svg',
  IR: '/hostingCountryLogos/EuroIran.svg',
  IS: '/hostingCountryLogos/EuroIslandia.svg',
  IT: '/hostingCountryLogos/Italy2022.svg',
  JM: '/hostingCountryLogos/EuroJamaica.svg',
  JO: '/hostingCountryLogos/EuroJordania.svg',
  JP: '/hostingCountryLogos/EuroJapon.svg',
  KE: '/hostingCountryLogos/EuroKenia.svg',
  KG: '/hostingCountryLogos/EuroKirguistan.svg',
  KH: '/hostingCountryLogos/EuroCamboya.svg',
  KI: '/hostingCountryLogos/EuroKiribati.svg',
  KM: '/hostingCountryLogos/EuroComoras.svg',
  KN: '/hostingCountryLogos/EuroSaint_Kitts_and_Nevis.svg',
  KP: '/hostingCountryLogos/EuroCorea_del_Norte.svg',
  KR: '/hostingCountryLogos/EuroCorea_del_Sur.svg',
  KW: '/hostingCountryLogos/EuroKuwait.svg',
  KZ: '/hostingCountryLogos/Eurovision_2026_heart_-_Kazakhstan.svg',
  LA: '/hostingCountryLogos/EuroLaos.svg',
  LB: '/hostingCountryLogos/EuroLibano.png',
  LC: '/hostingCountryLogos/EuroSanta_Lucia.svg',
  LI: '/hostingCountryLogos/EuroLiechtenstein.svg',
  LK: '/hostingCountryLogos/EuroSri_Lanka.svg',
  LR: '/hostingCountryLogos/EuroLiberia.svg',
  LS: '/hostingCountryLogos/EuroLesoto.svg',
  LT: '/hostingCountryLogos/EuroLithuania.svg',
  LU: '/hostingCountryLogos/EuroLuxemburgo.svg',
  LV: '/hostingCountryLogos/EuroLetonia.svg',
  LY: '/hostingCountryLogos/EuroLibia.svg',
  MA: '/hostingCountryLogos/EuroMorocco.svg',
  MC: '/hostingCountryLogos/EuroMonaco.svg',
  MD: '/hostingCountryLogos/EuroMoldova.png',
  ME: '/hostingCountryLogos/EuroMontenegro.png',
  MG: '/hostingCountryLogos/EuroMadagascar.svg',
  MK: '/hostingCountryLogos/EuroMacedonia_del_Norte.svg',
  ML: '/hostingCountryLogos/EuroMali.svg',
  MM: '/hostingCountryLogos/EuroBirmania.svg',
  MN: '/hostingCountryLogos/EuroMongolia.svg',
  MO: '/hostingCountryLogos/EuroMacao.svg',
  MR: '/hostingCountryLogos/EuroMauritania.svg',
  MT: '/hostingCountryLogos/EuroMalta.svg',
  MU: '/hostingCountryLogos/EuroMauricio.svg',
  MV: '/hostingCountryLogos/EuroMaldivas.svg',
  MW: '/hostingCountryLogos/EuroMalaui.svg',
  MX: '/hostingCountryLogos/EuroMexico.png',
  MY: '/hostingCountryLogos/EuroMalasia.svg',
  MZ: '/hostingCountryLogos/EuroMozambique.svg',
  NA: '/hostingCountryLogos/EuroNamibia.svg',
  NE: '/hostingCountryLogos/EuroNiger.svg',
  NG: '/hostingCountryLogos/EuroNigeria.svg',
  NI: '/hostingCountryLogos/EuroNicaragua.png',
  NL: '/hostingCountryLogos/Netherlands2021.svg',
  NO: '/hostingCountryLogos/Norway2010.svg',
  NP: '/hostingCountryLogos/EuroNepal.svg',
  NZ: '/hostingCountryLogos/EuroNueva_Zelanda.svg',
  OM: '/hostingCountryLogos/EuroOman.svg',
  PA: '/hostingCountryLogos/EuroPanama.svg',
  PE: '/hostingCountryLogos/EuroPeru_(state).png',
  PF: '/hostingCountryLogos/EuroPolinesia_Francesa.svg',
  PG: '/hostingCountryLogos/EuroPapua_Nueva_Guinea.svg',
  PH: '/hostingCountryLogos/EuroFilipinas.svg',
  PK: '/hostingCountryLogos/EuroPakistan.svg',
  PL: '/hostingCountryLogos/EuroPolonia.svg',
  PS: '/hostingCountryLogos/EuroPalestine.svg',
  PT: '/hostingCountryLogos/EuroPortugal.png',
  PW: '/hostingCountryLogos/EuroPalau.svg',
  PY: '/hostingCountryLogos/EuroParaguay.png',
  QA: '/hostingCountryLogos/EuroQatar.svg',
  RO: '/hostingCountryLogos/EuroRumania.svg',
  RS: '/hostingCountryLogos/EuroServia.png',
  RU: '/hostingCountryLogos/Russia2009.svg',
  RW: '/hostingCountryLogos/EuroRuanda.svg',
  SA: '/hostingCountryLogos/Saudi_Arabia.png',
  SB: '/hostingCountryLogos/EuroIslas_Salomon.svg',
  SC: '/hostingCountryLogos/EuroSeychelles.svg',
  SD: '/hostingCountryLogos/EuroSudan.svg',
  SE: '/hostingCountryLogos/Sweden2024.svg',
  SG: '/hostingCountryLogos/EuroSingapur.svg',
  SI: '/hostingCountryLogos/EuroEslovenia.svg',
  SK: '/hostingCountryLogos/EuroEslovaquia.svg',
  SL: '/hostingCountryLogos/EuroSierra_Leona.svg',
  SM: '/hostingCountryLogos/EuroSan_Marino.png',
  SN: '/hostingCountryLogos/EuroSenegal.svg',
  SO: '/hostingCountryLogos/EuroSomalia.svg',
  SR: '/hostingCountryLogos/EuroSurinam.svg',
  SS: '/hostingCountryLogos/EuroSudan_del_Sur.svg',
  ST: '/hostingCountryLogos/EuroSanto_Tome_y_Principe.svg',
  SV: '/hostingCountryLogos/EuroEl_Salvador.png',
  SY: '/hostingCountryLogos/Eurovision_2026_heart_-_Syria.svg',
  SZ: '/hostingCountryLogos/EuroEsuatini.svg',
  TD: '/hostingCountryLogos/EuroChad.svg',
  TG: '/hostingCountryLogos/EuroTogo.svg',
  TH: '/hostingCountryLogos/EuroTailandia.svg',
  TJ: '/hostingCountryLogos/EuroTayikistan.svg',
  TL: '/hostingCountryLogos/EuroTimor_Oriental.svg',
  TM: '/hostingCountryLogos/EuroTurkmenistan.png',
  TN: '/hostingCountryLogos/EuroTunez.svg',
  TO: '/hostingCountryLogos/EuroTonga.svg',
  TR: '/hostingCountryLogos/Turkey2004.svg',
  TT: '/hostingCountryLogos/EuroTrinidad_y_Tobago.svg',
  TV: '/hostingCountryLogos/EuroTuvalu.svg',
  TW: '/hostingCountryLogos/EuroTaiwan.svg',
  TZ: '/hostingCountryLogos/EuroTanzania.svg',
  UA: '/hostingCountryLogos/Ukraine2023.svg',
  UG: '/hostingCountryLogos/EuroUganda.svg',
  US: '/hostingCountryLogos/EuroEstados_Unidos.svg',
  UY: '/hostingCountryLogos/EuroUruguay.svg',
  UZ: '/hostingCountryLogos/EuroUzbekistan.svg',
  VA: '/hostingCountryLogos/EuroVaticano.svg',
  VE: '/hostingCountryLogos/EuroVenezuela.svg',
  VN: '/hostingCountryLogos/EuroVietnam.svg',
  WS: '/hostingCountryLogos/EuroSamoa.svg',
  WW: '/hostingCountryLogos/EuroResto_del_Mundo.svg',
  XK: '/hostingCountryLogos/EuroKosovo.svg',
  YE: '/hostingCountryLogos/EuroYemen.svg',
  YU: '/hostingCountryLogos/EuroYugoslavia.svg',
  ZA: '/hostingCountryLogos/EuroSudafrica.svg',
  ZM: '/hostingCountryLogos/EuroZambia.svg',
  ZW: '/hostingCountryLogos/EuroZimbabwe.svg',
};

// Helper: latest-first list of years
const yearsDesc: Year[] = [...years].reverse() as Year[];

export function getHostingCountryByYear(
  year: Year,
  isJunior = false,
): HostingCountryData {
  if (isJunior) {
    return juniorHostingLogosByYear[year] || juniorHostingLogosByYear['2024'];
  }

  return hostingLogosByYear[year] || hostingLogosByYear['2026'];
}

export function getHostingLogoByCountryCode(
  countryCode: string,
): string | null {
  // Check explicit default override first
  const override = countryDefaultHostingLogos[countryCode];
  if (override) return override;

  // Otherwise, find the most recent hosting logo for that country
  const found = yearsDesc.find(
    (y) => hostingLogosByYear[y]?.code === countryCode,
  );
  return found ? hostingLogosByYear[found].logo : null;
}

export function getHostingCountryLogo(
  country: BaseCountry | string | undefined | null,
  shouldShowHeartFlagIcon = true,
): { logo: string; isExisting: boolean } {
  // Handle undefined/null country - return default flag
  if (!country) {
    return { logo: getFlagPath('WW'), isExisting: false };
  }

  if (!shouldShowHeartFlagIcon) {
    return { logo: getFlagPath(country), isExisting: false };
  }

  const countryCode = typeof country === 'string' ? country : country.code;

  const existing = getHostingLogoByCountryCode(countryCode);
  if (existing) {
    return { logo: existing, isExisting: true };
  }

  return { logo: getFlagPath(country), isExisting: false };
}

/**
 * Get hosting country logo with proxy for external URLs to avoid CORS issues during image generation
 * Only use this for image generation contexts where CORS is a problem
 */
export function getHostingCountryLogoForImageGeneration(
  country: BaseCountry | string | undefined | null,
  shouldShowHeartFlagIcon = true,
): { logo: string; isExisting: boolean } {
  // Handle undefined/null country - return default flag
  if (!country) {
    return { logo: getFlagPathForImageGeneration('WW'), isExisting: false };
  }

  if (!shouldShowHeartFlagIcon) {
    return { logo: getFlagPathForImageGeneration(country), isExisting: false };
  }

  const countryCode = typeof country === 'string' ? country : country.code;

  const existing = getHostingLogoByCountryCode(countryCode);
  if (existing) {
    return { logo: existing, isExisting: true };
  }

  return { logo: getFlagPathForImageGeneration(country), isExisting: false };
}
