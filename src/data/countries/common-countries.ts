import { BaseCountry } from '../../models';

export const COMMON_COUNTRIES: Record<
  string,
  Omit<BaseCountry, 'isQualified'>
> = {
  Albania: {
    name: 'Albania',
    code: 'AL',
    flag: 'https://www.worldometers.info//img/flags/small/tn_al-flag.gif',
  },
  Armenia: {
    name: 'Armenia',
    code: 'AM',
    flag: 'https://www.worldometers.info//img/flags/small/tn_am-flag.gif',
  },
  Australia: {
    name: 'Australia',
    code: 'AU',
    flag: 'https://www.worldometers.info//img/flags/small/tn_as-flag.gif',
  },
  Austria: {
    name: 'Austria',
    code: 'AT',
    flag: 'https://www.worldometers.info//img/flags/small/tn_au-flag.gif',
  },
  Azerbaijan: {
    name: 'Azerbaijan',
    code: 'AZ',
    flag: 'https://www.worldometers.info//img/flags/small/tn_aj-flag.gif',
  },
  Belgium: {
    name: 'Belgium',
    code: 'BE',
    flag: 'https://www.worldometers.info//img/flags/small/tn_be-flag.gif',
  },
  Croatia: {
    name: 'Croatia',
    code: 'HR',
    flag: 'https://www.worldometers.info//img/flags/small/tn_hr-flag.gif',
  },
  Cyprus: {
    name: 'Cyprus',
    code: 'CY',
    flag: 'https://www.worldometers.info//img/flags/small/tn_cy-flag.gif',
  },
  Czechia: {
    name: 'Czechia',
    code: 'CZ',
    flag: 'https://www.worldometers.info//img/flags/small/tn_ez-flag.gif',
  },
  Denmark: {
    name: 'Denmark',
    code: 'DK',
    flag: 'https://www.worldometers.info//img/flags/small/tn_da-flag.gif',
  },
  Estonia: {
    name: 'Estonia',
    code: 'EE',
    flag: 'https://www.worldometers.info//img/flags/small/tn_en-flag.gif',
  },
  Finland: {
    name: 'Finland',
    code: 'FI',
    flag: 'https://www.worldometers.info//img/flags/small/tn_fi-flag.gif',
  },
  France: {
    name: 'France',
    code: 'FR',
    flag: 'https://www.worldometers.info//img/flags/small/tn_fr-flag.gif',
  },
  Georgia: {
    name: 'Georgia',
    code: 'GE',
    flag: 'https://www.worldometers.info//img/flags/small/tn_gg-flag.gif',
  },
  Germany: {
    name: 'Germany',
    code: 'DE',
    flag: 'https://www.worldometers.info//img/flags/small/tn_gm-flag.gif',
  },
  Greece: {
    name: 'Greece',
    code: 'GR',
    flag: 'https://www.worldometers.info//img/flags/small/tn_gr-flag.gif',
  },
  Iceland: {
    name: 'Iceland',
    code: 'IS',
    flag: 'https://www.worldometers.info//img/flags/small/tn_ic-flag.gif',
  },
  Ireland: {
    name: 'Ireland',
    code: 'IE',
    flag: 'https://www.worldometers.info//img/flags/small/tn_ei-flag.gif',
  },
  Israel: {
    name: 'Israel',
    code: 'IL',
    flag: 'https://www.worldometers.info//img/flags/small/tn_is-flag.gif',
  },
  Italy: {
    name: 'Italy',
    code: 'IT',
    flag: 'https://www.worldometers.info//img/flags/small/tn_it-flag.gif',
  },
  Latvia: {
    name: 'Latvia',
    code: 'LV',
    flag: 'https://www.worldometers.info//img/flags/small/tn_lg-flag.gif',
  },
  Lithuania: {
    name: 'Lithuania',
    code: 'LT',
    flag: 'https://www.worldometers.info//img/flags/small/tn_lh-flag.gif',
  },
  Luxembourg: {
    name: 'Luxembourg',
    code: 'LU',
    flag: 'https://www.worldometers.info//img/flags/small/tn_lu-flag.gif',
  },
  Malta: {
    name: 'Malta',
    code: 'MT',
    flag: 'https://www.worldometers.info//img/flags/small/tn_mt-flag.gif',
  },
  Montenegro: {
    name: 'Montenegro',
    code: 'ME',
    flag: 'https://www.worldometers.info//img/flags/small/tn_me-flag.gif',
  },
  Moldova: {
    name: 'Moldova',
    code: 'MD',
    flag: 'https://www.worldometers.info//img/flags/small/tn_md-flag.gif',
  },
  Netherlands: {
    name: 'Netherlands',
    code: 'NL',
    flag: 'https://www.worldometers.info//img/flags/small/tn_nl-flag.gif',
  },
  Norway: {
    name: 'Norway',
    code: 'NO',
    flag: 'https://www.worldometers.info//img/flags/small/tn_no-flag.gif',
  },
  Poland: {
    name: 'Poland',
    code: 'PL',
    flag: 'https://www.worldometers.info//img/flags/small/tn_pl-flag.gif',
  },
  Portugal: {
    name: 'Portugal',
    code: 'PT',
    flag: 'https://www.worldometers.info//img/flags/small/tn_po-flag.gif',
  },
  Romania: {
    name: 'Romania',
    code: 'RO',
    flag: 'https://www.worldometers.info//img/flags/small/tn_ro-flag.gif',
  },
  SanMarino: {
    name: 'San Marino',
    code: 'SM',
    flag: 'https://www.worldometers.info//img/flags/small/tn_sm-flag.gif',
  },
  Serbia: {
    name: 'Serbia',
    code: 'RS',
    flag: 'https://www.worldometers.info//img/flags/small/tn_ri-flag.gif',
  },
  Slovenia: {
    name: 'Slovenia',
    code: 'SI',
    flag: 'https://www.worldometers.info//img/flags/small/tn_si-flag.gif',
  },
  Spain: {
    name: 'Spain',
    code: 'ES',
    flag: 'https://www.worldometers.info//img/flags/small/tn_sp-flag.gif',
  },
  Sweden: {
    name: 'Sweden',
    code: 'SE',
    flag: 'https://www.worldometers.info//img/flags/small/tn_sw-flag.gif',
  },
  Switzerland: {
    name: 'Switzerland',
    code: 'CH',
    flag: 'https://www.worldometers.info//img/flags/small/tn_sz-flag.gif',
  },
  Ukraine: {
    name: 'Ukraine',
    code: 'UA',
    flag: 'https://upload.wikimedia.org/wikipedia/commons/thumb/4/49/Flag_of_Ukraine.svg/250px-Flag_of_Ukraine.svg.png',
  },
  UnitedKingdom: {
    name: 'United Kingdom',
    code: 'GB',
    flag: 'https://www.worldometers.info//img/flags/small/tn_uk-flag.gif',
  },
};
