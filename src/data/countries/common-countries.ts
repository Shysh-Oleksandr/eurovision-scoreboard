import { BaseCountry } from '../../models';

// Flags from https://geotargetly.com/free-flags
export const COMMON_COUNTRIES = {
  Albania: {
    name: 'Albania',
    code: 'AL',
    flag: 'https://cdn.prod.website-files.com/5e6988439312b5bbb3f95631/66be049cf07bd10fefca7b53_al.svg',
  },
  Andorra: {
    name: 'Andorra',
    code: 'AD',
    flag: 'https://cdn.prod.website-files.com/5e6988439312b5bbb3f95631/66be049c8cd530e3bd4eb474_ad.svg',
  },
  Armenia: {
    name: 'Armenia',
    code: 'AM',
    flag: 'https://cdn.prod.website-files.com/5e6988439312b5bbb3f95631/66be049c18580316e57fd94b_am.svg',
  },
  Australia: {
    name: 'Australia',
    code: 'AU',
    flag: 'https://cdn.prod.website-files.com/5e6988439312b5bbb3f95631/66bf1ca1a9040d4ad6005302_au.svg',
  },
  Austria: {
    name: 'Austria',
    code: 'AT',
    flag: 'https://cdn.prod.website-files.com/5e6988439312b5bbb3f95631/66be0b937d9508ec39cdb04a_at.svg',
  },
  Azerbaijan: {
    name: 'Azerbaijan',
    code: 'AZ',
    flag: 'https://cdn.prod.website-files.com/5e6988439312b5bbb3f95631/66bf1ca1622ffbe99280f2d2_az.svg',
  },
  Belgium: {
    name: 'Belgium',
    code: 'BE',
    flag: 'https://cdn.prod.website-files.com/5e6988439312b5bbb3f95631/66bf1ca15aa291bbcca0a86b_be.svg',
  },
  Belarus: {
    name: 'Belarus',
    code: 'BY',
    flag: 'https://cdn.prod.website-files.com/5e6988439312b5bbb3f95631/66bf1f35dfe3396b5dd9880e_by.svg',
  },
  BosniaHerzegovina: {
    name: 'Bosnia & Herzegovina',
    code: 'BA',
    flag: 'https://cdn.prod.website-files.com/5e6988439312b5bbb3f95631/66bf1ca15eba5d4654214c13_ba.svg',
  },
  Bulgaria: {
    name: 'Bulgaria',
    code: 'BG',
    flag: 'https://cdn.prod.website-files.com/5e6988439312b5bbb3f95631/66bf1ca1e0e5dccc20382df3_bg.svg',
  },
  Croatia: {
    name: 'Croatia',
    code: 'HR',
    flag: 'https://cdn.prod.website-files.com/5e6988439312b5bbb3f95631/66bf25a6c2e1936cd3a84d70_hr.svg',
  },
  Cyprus: {
    name: 'Cyprus',
    code: 'CY',
    flag: 'https://cdn.prod.website-files.com/5e6988439312b5bbb3f95631/66bf25a1bc05c830d8b956a4_cy.svg',
  },
  Czechia: {
    name: 'Czechia',
    code: 'CZ',
    flag: 'https://cdn.prod.website-files.com/5e6988439312b5bbb3f95631/66bf25a1bcf606ad88f87e7e_cz.svg',
  },
  Denmark: {
    name: 'Denmark',
    code: 'DK',
    flag: 'https://cdn.prod.website-files.com/5e6988439312b5bbb3f95631/66bf25a1c671b1a7680bf756_dk.svg',
  },
  Estonia: {
    name: 'Estonia',
    code: 'EE',
    flag: 'https://cdn.prod.website-files.com/5e6988439312b5bbb3f95631/66bf25a13cfe7fd4f257cd6f_ee.svg',
  },
  Finland: {
    name: 'Finland',
    code: 'FI',
    flag: 'https://cdn.prod.website-files.com/5e6988439312b5bbb3f95631/66bf25a2105c325ee744520d_fi.svg',
  },
  France: {
    name: 'France',
    code: 'FR',
    flag: 'https://cdn.prod.website-files.com/5e6988439312b5bbb3f95631/66bf25a3cbeffadf364a88e3_fr.svg',
  },
  Georgia: {
    name: 'Georgia',
    code: 'GE',
    flag: 'https://cdn.prod.website-files.com/5e6988439312b5bbb3f95631/66bf25a3622ffbe9928955a6_ge.svg',
  },
  Germany: {
    name: 'Germany',
    code: 'DE',
    flag: 'https://cdn.prod.website-files.com/5e6988439312b5bbb3f95631/66bf25a1cdd4f45da9d4eb38_de.svg',
  },
  Greece: {
    name: 'Greece',
    code: 'GR',
    flag: 'https://cdn.prod.website-files.com/5e6988439312b5bbb3f95631/66bf25a5aba7827ebf258495_gr.svg',
  },
  Hungary: {
    name: 'Hungary',
    code: 'HU',
    flag: 'https://cdn.prod.website-files.com/5e6988439312b5bbb3f95631/66bf25a7c671b1a7680bfc12_hu.svg',
  },
  Iceland: {
    name: 'Iceland',
    code: 'IS',
    flag: 'https://cdn.prod.website-files.com/5e6988439312b5bbb3f95631/66bf25a8115be590e9bd1462_is.svg',
  },
  Ireland: {
    name: 'Ireland',
    code: 'IE',
    flag: 'https://cdn.prod.website-files.com/5e6988439312b5bbb3f95631/66bf25a78ee7dfc71806b3cc_ie.svg',
  },
  Israel: {
    name: 'Israel',
    code: 'IL',
    flag: 'https://cdn.prod.website-files.com/5e6988439312b5bbb3f95631/66bf25a7fda0ce5d675ef41b_il.svg',
  },
  Italy: {
    name: 'Italy',
    code: 'IT',
    flag: 'https://cdn.prod.website-files.com/5e6988439312b5bbb3f95631/66bf25a8e02b1117419105ba_it.svg',
  },
  Latvia: {
    name: 'Latvia',
    code: 'LV',
    flag: 'https://cdn.prod.website-files.com/5e6988439312b5bbb3f95631/66bf4378f0869fbe66a78b9b_lv.svg',
  },
  Lithuania: {
    name: 'Lithuania',
    code: 'LT',
    flag: 'https://cdn.prod.website-files.com/5e6988439312b5bbb3f95631/66bf437bac957ca74af9dfe1_lt.svg',
  },
  Luxembourg: {
    name: 'Luxembourg',
    code: 'LU',
    flag: 'https://cdn.prod.website-files.com/5e6988439312b5bbb3f95631/66bf437811e45df915df8222_lu.svg',
  },
  Malta: {
    name: 'Malta',
    code: 'MT',
    flag: 'https://cdn.prod.website-files.com/5e6988439312b5bbb3f95631/66bf437cde561af29d224ce0_mt.svg',
  },
  Moldova: {
    name: 'Moldova',
    code: 'MD',
    flag: 'https://cdn.prod.website-files.com/5e6988439312b5bbb3f95631/66bf437a8c1cf7591b9a48c3_md.svg',
  },
  Monaco: {
    name: 'Monaco',
    code: 'MC',
    flag: 'https://cdn.prod.website-files.com/5e6988439312b5bbb3f95631/66bf437bfd208d55c8ac5bcb_mc.svg',
  },
  Montenegro: {
    name: 'Montenegro',
    code: 'ME',
    flag: 'https://cdn.prod.website-files.com/5e6988439312b5bbb3f95631/66bf437a577b84668e260847_me.svg',
  },
  Netherlands: {
    name: 'Netherlands',
    code: 'NL',
    flag: 'https://cdn.prod.website-files.com/5e6988439312b5bbb3f95631/66bf4384aaebf8633cc754a0_nl.svg',
  },
  NorthMacedonia: {
    name: 'North Macedonia',
    code: 'MK',
    flag: 'https://cdn.prod.website-files.com/5e6988439312b5bbb3f95631/66bf437bfd208d55c8ac5c07_mk.svg',
  },
  Norway: {
    name: 'Norway',
    code: 'NO',
    flag: 'https://cdn.prod.website-files.com/5e6988439312b5bbb3f95631/66bf1f353a1353fba261110f_bv.svg',
  },
  Poland: {
    name: 'Poland',
    code: 'PL',
    flag: 'https://cdn.prod.website-files.com/5e6988439312b5bbb3f95631/66bf43851cec61ee4c3e53ab_pl.svg',
  },
  Portugal: {
    name: 'Portugal',
    code: 'PT',
    flag: 'https://cdn.prod.website-files.com/5e6988439312b5bbb3f95631/66bf4385cc482afeb9d7a1b3_pt.svg',
  },
  Romania: {
    name: 'Romania',
    code: 'RO',
    flag: 'https://cdn.prod.website-files.com/5e6988439312b5bbb3f95631/66bf438655e2bbac5000efa6_ro.svg',
  },
  Russia: {
    name: 'Russia',
    code: 'RU',
    flag: 'https://upload.wikimedia.org/wikipedia/en/f/f3/Flag_of_Russia.svg',
  },
  SanMarino: {
    name: 'San Marino',
    code: 'SM',
    flag: 'https://cdn.prod.website-files.com/5e6988439312b5bbb3f95631/66bf43889c24820a55ffddfc_sm.svg',
  },
  Serbia: {
    name: 'Serbia',
    code: 'RS',
    flag: 'https://cdn.prod.website-files.com/5e6988439312b5bbb3f95631/66bf4386ecc7703ef117562a_rs.svg',
  },
  SerbiaMontenegro: {
    name: 'Serbia & Montenegro',
    code: 'CS',
    flag: 'https://upload.wikimedia.org/wikipedia/commons/thumb/3/3e/Flag_of_Serbia_and_Montenegro_%281992%E2%80%932006%29.svg/1200px-Flag_of_Serbia_and_Montenegro_%281992%E2%80%932006%29.svg.png',
  },
  Slovakia: {
    name: 'Slovakia',
    code: 'SK',
    flag: 'https://cdn.prod.website-files.com/5e6988439312b5bbb3f95631/66bf43885b07a53217a12132_sk.svg',
  },
  Slovenia: {
    name: 'Slovenia',
    code: 'SI',
    flag: 'https://cdn.prod.website-files.com/5e6988439312b5bbb3f95631/66bf438822b571db555ba767_si.svg',
  },
  Spain: {
    name: 'Spain',
    code: 'ES',
    flag: 'https://cdn.prod.website-files.com/5e6988439312b5bbb3f95631/66bf25a1a87268259b6202ac_es.svg',
  },
  Sweden: {
    name: 'Sweden',
    code: 'SE',
    flag: 'https://cdn.prod.website-files.com/5e6988439312b5bbb3f95631/66bf4388d00ff1711f3be415_se.svg',
  },
  Switzerland: {
    name: 'Switzerland',
    code: 'CH',
    flag: 'https://cdn.prod.website-files.com/5e6988439312b5bbb3f95631/66bf1f351f0d5cf3a03db26a_ch.svg',
  },
  Turkey: {
    name: 'Turkey',
    code: 'TR',
    flag: 'https://cdn.prod.website-files.com/5e6988439312b5bbb3f95631/66bf438be043e403da7d1717_tr.svg',
  },
  Ukraine: {
    name: 'Ukraine',
    code: 'UA',
    flag: 'https://cdn.prod.website-files.com/5e6988439312b5bbb3f95631/66bf438b9759cc2db4055158_ua.svg',
  },
  UnitedKingdom: {
    name: 'United Kingdom',
    code: 'GB',
    flag: 'https://cdn.prod.website-files.com/5e6988439312b5bbb3f95631/66bf25a3d774008a7088f805_gb.svg',
  },
};

export const ALL_COUNTRIES: Omit<BaseCountry, 'isQualified'>[] =
  Object.values(COMMON_COUNTRIES);
