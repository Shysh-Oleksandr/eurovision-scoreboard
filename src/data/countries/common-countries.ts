import { BaseCountry } from '../../models';

type CommonCountry = Pick<BaseCountry, 'name' | 'code' | 'category'>;
export const COMMON_COUNTRIES: Record<string, CommonCountry> = {
  // Eurovision countries
  Albania: {
    name: 'Albania',
    code: 'AL',
    category: 'All-Time Participants',
  },
  Andorra: {
    name: 'Andorra',
    code: 'AD',
    category: 'All-Time Participants',
  },
  Armenia: {
    name: 'Armenia',
    code: 'AM',
    category: 'All-Time Participants',
  },
  Australia: {
    name: 'Australia',
    code: 'AU',
    category: 'All-Time Participants',
  },
  Austria: {
    name: 'Austria',
    code: 'AT',
    category: 'All-Time Participants',
  },
  Azerbaijan: {
    name: 'Azerbaijan',
    code: 'AZ',
    category: 'All-Time Participants',
  },
  Belarus: {
    name: 'Belarus',
    code: 'BY',
    category: 'All-Time Participants',
  },
  Belgium: {
    name: 'Belgium',
    code: 'BE',
    category: 'All-Time Participants',
  },
  BosniaHerzegovina: {
    name: 'Bosnia & Herzegovina',
    code: 'BA',
    category: 'All-Time Participants',
  },
  Bulgaria: {
    name: 'Bulgaria',
    code: 'BG',
    category: 'All-Time Participants',
  },
  Croatia: {
    name: 'Croatia',
    code: 'HR',
    category: 'All-Time Participants',
  },
  Cyprus: {
    name: 'Cyprus',
    code: 'CY',
    category: 'All-Time Participants',
  },
  Czechia: {
    name: 'Czechia',
    code: 'CZ',
    category: 'All-Time Participants',
  },
  Denmark: {
    name: 'Denmark',
    code: 'DK',
    category: 'All-Time Participants',
  },
  Estonia: {
    name: 'Estonia',
    code: 'EE',
    category: 'All-Time Participants',
  },
  Finland: {
    name: 'Finland',
    code: 'FI',
    category: 'All-Time Participants',
  },
  France: {
    name: 'France',
    code: 'FR',
    category: 'All-Time Participants',
  },
  Georgia: {
    name: 'Georgia',
    code: 'GE',
    category: 'All-Time Participants',
  },
  Germany: {
    name: 'Germany',
    code: 'DE',
    category: 'All-Time Participants',
  },
  Greece: {
    name: 'Greece',
    code: 'GR',
    category: 'All-Time Participants',
  },
  Hungary: {
    name: 'Hungary',
    code: 'HU',
    category: 'All-Time Participants',
  },
  Iceland: {
    name: 'Iceland',
    code: 'IS',
    category: 'All-Time Participants',
  },
  Ireland: {
    name: 'Ireland',
    code: 'IE',
    category: 'All-Time Participants',
  },
  Israel: {
    name: 'Israel',
    code: 'IL',
    category: 'All-Time Participants',
  },
  Italy: {
    name: 'Italy',
    code: 'IT',
    category: 'All-Time Participants',
  },
  Latvia: {
    name: 'Latvia',
    code: 'LV',
    category: 'All-Time Participants',
  },
  Lithuania: {
    name: 'Lithuania',
    code: 'LT',
    category: 'All-Time Participants',
  },
  Luxembourg: {
    name: 'Luxembourg',
    code: 'LU',
    category: 'All-Time Participants',
  },
  Malta: {
    name: 'Malta',
    code: 'MT',
    category: 'All-Time Participants',
  },
  Moldova: {
    name: 'Moldova',
    code: 'MD',
    category: 'All-Time Participants',
  },
  Monaco: {
    name: 'Monaco',
    code: 'MC',
    category: 'All-Time Participants',
  },
  Montenegro: {
    name: 'Montenegro',
    code: 'ME',
    category: 'All-Time Participants',
  },
  Morocco: {
    name: 'Morocco',
    code: 'MA',
    category: 'All-Time Participants',
  },
  Netherlands: {
    name: 'Netherlands',
    code: 'NL',
    category: 'All-Time Participants',
  },
  NorthMacedonia: {
    name: 'North Macedonia',
    code: 'MK',
    category: 'All-Time Participants',
  },
  Norway: {
    name: 'Norway',
    code: 'NO',
    category: 'All-Time Participants',
  },
  Poland: {
    name: 'Poland',
    code: 'PL',
    category: 'All-Time Participants',
  },
  Portugal: {
    name: 'Portugal',
    code: 'PT',
    category: 'All-Time Participants',
  },
  Romania: {
    name: 'Romania',
    code: 'RO',
    category: 'All-Time Participants',
  },
  Russia: {
    name: 'Russia',
    code: 'RU',
    category: 'All-Time Participants',
  },
  SanMarino: {
    name: 'San Marino',
    code: 'SM',
    category: 'All-Time Participants',
  },
  Serbia: {
    name: 'Serbia',
    code: 'RS',
    category: 'All-Time Participants',
  },
  SerbiaMontenegro: {
    name: 'Serbia & Montenegro',
    code: 'CS',
    category: 'All-Time Participants',
  },
  Slovakia: {
    name: 'Slovakia',
    code: 'SK',
    category: 'All-Time Participants',
  },
  Slovenia: {
    name: 'Slovenia',
    code: 'SI',
    category: 'All-Time Participants',
  },
  Spain: {
    name: 'Spain',
    code: 'ES',
    category: 'All-Time Participants',
  },
  Sweden: {
    name: 'Sweden',
    code: 'SE',
    category: 'All-Time Participants',
  },
  Switzerland: {
    name: 'Switzerland',
    code: 'CH',
    category: 'All-Time Participants',
  },
  Turkey: {
    name: 'Turkey',
    code: 'TR',
    category: 'All-Time Participants',
  },
  Ukraine: {
    name: 'Ukraine',
    code: 'UA',
    category: 'All-Time Participants',
  },
  UnitedKingdom: {
    name: 'United Kingdom',
    code: 'GB',
    category: 'All-Time Participants',
  },
  Yugoslavia: {
    name: 'Yugoslavia',
    code: 'YU',
    category: 'All-Time Participants',
  },

  // Not Eurovision countries by category
  // Asia
  Afghanistan: {
    name: 'Afghanistan',
    code: 'AF',
    category: 'Asia',
  },
  Bahrain: {
    name: 'Bahrain',
    code: 'BH',
    category: 'Asia',
  },
  Bangladesh: {
    name: 'Bangladesh',
    code: 'BD',
    category: 'Asia',
  },
  Bhutan: {
    name: 'Bhutan',
    code: 'BT',
    category: 'Asia',
  },
  Brunei: {
    name: 'Brunei',
    code: 'BN',
    category: 'Asia',
  },
  Cambodia: {
    name: 'Cambodia',
    code: 'KH',
    category: 'Asia',
  },
  China: {
    name: 'China',
    code: 'CN',
    category: 'Asia',
  },
  EastTimor: {
    name: 'East Timor',
    code: 'TL',
    category: 'Asia',
  },
  HongKong: {
    name: 'Hong Kong',
    code: 'HK',
    category: 'Asia',
  },
  India: {
    name: 'India',
    code: 'IN',
    category: 'Asia',
  },
  Indonesia: {
    name: 'Indonesia',
    code: 'ID',
    category: 'Asia',
  },
  Iran: {
    name: 'Iran',
    code: 'IR',
    category: 'Asia',
  },
  Iraq: {
    name: 'Iraq',
    code: 'IQ',
    category: 'Asia',
  },
  Japan: {
    name: 'Japan',
    code: 'JP',
    category: 'Asia',
  },
  Jordan: {
    name: 'Jordan',
    code: 'JO',
    category: 'Asia',
  },
  Kazakhstan: {
    name: 'Kazakhstan',
    code: 'KZ',
    category: 'Asia',
  },
  Kuwait: {
    name: 'Kuwait',
    code: 'KW',
    category: 'Asia',
  },
  Kyrgyzstan: {
    name: 'Kyrgyzstan',
    code: 'KG',
    category: 'Asia',
  },
  Laos: {
    name: 'Laos',
    code: 'LA',
    category: 'Asia',
  },
  Lebanon: {
    name: 'Lebanon',
    code: 'LB',
    category: 'Asia',
  },
  Macao: {
    name: 'Macao',
    code: 'MO',
    category: 'Asia',
  },
  Malaysia: {
    name: 'Malaysia',
    code: 'MY',
    category: 'Asia',
  },
  Maldives: {
    name: 'Maldives',
    code: 'MV',
    category: 'Asia',
  },
  Mongolia: {
    name: 'Mongolia',
    code: 'MN',
    category: 'Asia',
  },
  Myanmar: {
    name: 'Myanmar',
    code: 'MM',
    category: 'Asia',
  },
  Nepal: {
    name: 'Nepal',
    code: 'NP',
    category: 'Asia',
  },
  NorthKorea: {
    name: 'North Korea',
    code: 'KP',
    category: 'Asia',
  },
  Oman: {
    name: 'Oman',
    code: 'OM',
    category: 'Asia',
  },
  Pakistan: {
    name: 'Pakistan',
    code: 'PK',
    category: 'Asia',
  },
  Palestine: {
    name: 'Palestine',
    code: 'PS',
    category: 'Asia',
  },
  Philippines: {
    name: 'Philippines',
    code: 'PH',
    category: 'Asia',
  },
  Qatar: {
    name: 'Qatar',
    code: 'QA',
    category: 'Asia',
  },
  SaudiArabia: {
    name: 'Saudi Arabia',
    code: 'SA',
    category: 'Asia',
  },
  Singapore: {
    name: 'Singapore',
    code: 'SG',
    category: 'Asia',
  },
  SouthKorea: {
    name: 'South Korea',
    code: 'KR',
    category: 'Asia',
  },
  SriLanka: {
    name: 'Sri Lanka',
    code: 'LK',
    category: 'Asia',
  },
  Syria: {
    name: 'Syria',
    code: 'SY',
    category: 'Asia',
  },
  Tajikistan: {
    name: 'Tajikistan',
    code: 'TJ',
    category: 'Asia',
  },
  Thailand: {
    name: 'Thailand',
    code: 'TH',
    category: 'Asia',
  },
  Turkmenistan: {
    name: 'Turkmenistan',
    code: 'TM',
    category: 'Asia',
  },
  UnitedArabEmirates: {
    name: 'United Arab Emirates',
    code: 'AE',
    category: 'Asia',
  },
  Uzbekistan: {
    name: 'Uzbekistan',
    code: 'UZ',
    category: 'Asia',
  },
  Vietnam: {
    name: 'Vietnam',
    code: 'VN',
    category: 'Asia',
  },
  Yemen: {
    name: 'Yemen',
    code: 'YE',
    category: 'Asia',
  },

  // Africa
  Algeria: {
    name: 'Algeria',
    code: 'DZ',
    category: 'Africa',
  },
  Angola: {
    name: 'Angola',
    code: 'AO',
    category: 'Africa',
  },
  Benin: {
    name: 'Benin',
    code: 'BJ',
    category: 'Africa',
  },
  Botswana: {
    name: 'Botswana',
    code: 'BW',
    category: 'Africa',
  },
  BurkinaFaso: {
    name: 'Burkina Faso',
    code: 'BF',
    category: 'Africa',
  },
  Burundi: {
    name: 'Burundi',
    code: 'BI',
    category: 'Africa',
  },
  Cameroon: {
    name: 'Cameroon',
    code: 'CM',
    category: 'Africa',
  },
  CapeVerde: {
    name: 'Cape Verde',
    code: 'CV',
    category: 'Africa',
  },
  CentralAfricanRepublic: {
    name: 'Central African Republic',
    code: 'CF',
    category: 'Africa',
  },
  Chad: {
    name: 'Chad',
    code: 'TD',
    category: 'Africa',
  },
  Comoros: {
    name: 'Comoros',
    code: 'KM',
    category: 'Africa',
  },
  Congo: {
    name: 'Congo',
    code: 'CG',
    category: 'Africa',
  },
  DemocraticRepublicOfCongo: {
    name: 'The Democratic Republic of Congo',
    code: 'CD',
    category: 'Africa',
  },
  Djibouti: {
    name: 'Djibouti',
    code: 'DJ',
    category: 'Africa',
  },
  Egypt: {
    name: 'Egypt',
    code: 'EG',
    category: 'Africa',
  },
  EquatorialGuinea: {
    name: 'Equatorial Guinea',
    code: 'GQ',
    category: 'Africa',
  },
  Eritrea: {
    name: 'Eritrea',
    code: 'ER',
    category: 'Africa',
  },
  Eswatini: {
    name: 'Eswatini',
    code: 'SZ',
    category: 'Africa',
  },
  Ethiopia: {
    name: 'Ethiopia',
    code: 'ET',
    category: 'Africa',
  },
  Gabon: {
    name: 'Gabon',
    code: 'GA',
    category: 'Africa',
  },
  Gambia: {
    name: 'Gambia',
    code: 'GM',
    category: 'Africa',
  },
  Ghana: {
    name: 'Ghana',
    code: 'GH',
    category: 'Africa',
  },
  Guinea: {
    name: 'Guinea',
    code: 'GN',
    category: 'Africa',
  },
  GuineaBissau: {
    name: 'Guinea-Bissau',
    code: 'GW',
    category: 'Africa',
  },
  IvoryCoast: {
    name: 'Ivory Coast',
    code: 'CI',
    category: 'Africa',
  },
  Kenya: {
    name: 'Kenya',
    code: 'KE',
    category: 'Africa',
  },
  Lesotho: {
    name: 'Lesotho',
    code: 'LS',
    category: 'Africa',
  },
  Liberia: {
    name: 'Liberia',
    code: 'LR',
    category: 'Africa',
  },
  Libya: {
    name: 'Libya',
    code: 'LY',
    category: 'Africa',
  },
  Madagascar: {
    name: 'Madagascar',
    code: 'MG',
    category: 'Africa',
  },
  Malawi: {
    name: 'Malawi',
    code: 'MW',
    category: 'Africa',
  },
  Mali: {
    name: 'Mali',
    code: 'ML',
    category: 'Africa',
  },
  Mauritania: {
    name: 'Mauritania',
    code: 'MR',
    category: 'Africa',
  },
  Mauritius: {
    name: 'Mauritius',
    code: 'MU',
    category: 'Africa',
  },
  Mozambique: {
    name: 'Mozambique',
    code: 'MZ',
    category: 'Africa',
  },
  Namibia: {
    name: 'Namibia',
    code: 'NA',
    category: 'Africa',
  },
  Niger: {
    name: 'Niger',
    code: 'NE',
    category: 'Africa',
  },
  Nigeria: {
    name: 'Nigeria',
    code: 'NG',
    category: 'Africa',
  },
  Rwanda: {
    name: 'Rwanda',
    code: 'RW',
    category: 'Africa',
  },
  SaoTomeAndPrincipe: {
    name: 'Sao Tome and Principe',
    code: 'ST',
    category: 'Africa',
  },
  Senegal: {
    name: 'Senegal',
    code: 'SN',
    category: 'Africa',
  },
  Seychelles: {
    name: 'Seychelles',
    code: 'SC',
    category: 'Africa',
  },
  SierraLeone: {
    name: 'Sierra Leone',
    code: 'SL',
    category: 'Africa',
  },
  Somalia: {
    name: 'Somalia',
    code: 'SO',
    category: 'Africa',
  },
  SouthAfrica: {
    name: 'South Africa',
    code: 'ZA',
    category: 'Africa',
  },
  SouthSudan: {
    name: 'South Sudan',
    code: 'SS',
    category: 'Africa',
  },
  Sudan: {
    name: 'Sudan',
    code: 'SD',
    category: 'Africa',
  },
  Tanzania: {
    name: 'Tanzania',
    code: 'TZ',
    category: 'Africa',
  },
  Togo: {
    name: 'Togo',
    code: 'TG',
    category: 'Africa',
  },
  Tunisia: {
    name: 'Tunisia',
    code: 'TN',
    category: 'Africa',
  },
  Uganda: {
    name: 'Uganda',
    code: 'UG',
    category: 'Africa',
  },
  Zambia: {
    name: 'Zambia',
    code: 'ZM',
    category: 'Africa',
  },
  Zimbabwe: {
    name: 'Zimbabwe',
    code: 'ZW',
    category: 'Africa',
  },

  // North America
  AntiguaAndBarbuda: {
    name: 'Antigua and Barbuda',
    code: 'AG',
    category: 'North America',
  },
  Bahamas: {
    name: 'Bahamas',
    code: 'BS',
    category: 'North America',
  },
  Barbados: {
    name: 'Barbados',
    code: 'BB',
    category: 'North America',
  },
  Belize: {
    name: 'Belize',
    code: 'BZ',
    category: 'North America',
  },
  Canada: {
    name: 'Canada',
    code: 'CA',
    category: 'North America',
  },
  CostaRica: {
    name: 'Costa Rica',
    code: 'CR',
    category: 'North America',
  },
  Cuba: {
    name: 'Cuba',
    code: 'CU',
    category: 'North America',
  },
  Dominica: {
    name: 'Dominica',
    code: 'DM',
    category: 'North America',
  },
  DominicanRepublic: {
    name: 'Dominican Republic',
    code: 'DO',
    category: 'North America',
  },
  ElSalvador: {
    name: 'El Salvador',
    code: 'SV',
    category: 'North America',
  },
  Grenada: {
    name: 'Grenada',
    code: 'GD',
    category: 'North America',
  },
  Guadeloupe: {
    name: 'Guadeloupe',
    code: 'GP',
    category: 'North America',
  },
  Guatemala: {
    name: 'Guatemala',
    code: 'GT',
    category: 'North America',
  },
  Haiti: {
    name: 'Haiti',
    code: 'HT',
    category: 'North America',
  },
  Honduras: {
    name: 'Honduras',
    code: 'HN',
    category: 'North America',
  },
  Jamaica: {
    name: 'Jamaica',
    code: 'JM',
    category: 'North America',
  },
  Mexico: {
    name: 'Mexico',
    code: 'MX',
    category: 'North America',
  },
  Nicaragua: {
    name: 'Nicaragua',
    code: 'NI',
    category: 'North America',
  },
  Panama: {
    name: 'Panama',
    code: 'PA',
    category: 'North America',
  },
  TrinidadAndTobago: {
    name: 'Trinidad and Tobago',
    code: 'TT',
    category: 'North America',
  },
  UnitedStates: {
    name: 'United States',
    code: 'US',
    category: 'North America',
  },

  // South America
  Argentina: {
    name: 'Argentina',
    code: 'AR',
    category: 'South America',
  },
  Bolivia: {
    name: 'Bolivia',
    code: 'BO',
    category: 'South America',
  },
  Brazil: {
    name: 'Brazil',
    code: 'BR',
    category: 'South America',
  },
  Chile: {
    name: 'Chile',
    code: 'CL',
    category: 'South America',
  },
  Colombia: {
    name: 'Colombia',
    code: 'CO',
    category: 'South America',
  },
  Ecuador: {
    name: 'Ecuador',
    code: 'EC',
    category: 'South America',
  },
  Guyana: {
    name: 'Guyana',
    code: 'GY',
    category: 'South America',
  },
  Paraguay: {
    name: 'Paraguay',
    code: 'PY',
    category: 'South America',
  },
  Peru: {
    name: 'Peru',
    code: 'PE',
    category: 'South America',
  },
  Suriname: {
    name: 'Suriname',
    code: 'SR',
    category: 'South America',
  },
  Uruguay: {
    name: 'Uruguay',
    code: 'UY',
    category: 'South America',
  },
  Venezuela: {
    name: 'Venezuela',
    code: 'VE',
    category: 'South America',
  },

  // Oceania
  FijiIslands: {
    name: 'Fiji Islands',
    code: 'FJ',
    category: 'Oceania',
  },
  FrenchPolynesia: {
    name: 'French Polynesia',
    code: 'PF',
    category: 'Oceania',
  },
  Kiribati: {
    name: 'Kiribati',
    code: 'KI',
    category: 'Oceania',
  },
  NewZealand: {
    name: 'New Zealand',
    code: 'NZ',
    category: 'Oceania',
  },
  Palau: {
    name: 'Palau',
    code: 'PW',
    category: 'Oceania',
  },
  PapuaNewGuinea: {
    name: 'Papua New Guinea',
    code: 'PG',
    category: 'Oceania',
  },
  Samoa: {
    name: 'Samoa',
    code: 'WS',
    category: 'Oceania',
  },
  SolomonIslands: {
    name: 'Solomon Islands',
    code: 'SB',
    category: 'Oceania',
  },
  Tonga: {
    name: 'Tonga',
    code: 'TO',
    category: 'Oceania',
  },
  Tuvalu: {
    name: 'Tuvalu',
    code: 'TV',
    category: 'Oceania',
  },

  // Additional European countries
  England: {
    name: 'England',
    code: 'GB-ENG',
    category: 'Rest of Europe',
  },
  FaroeIslands: {
    name: 'Faroe Islands',
    code: 'FO',
    category: 'Rest of Europe',
  },
  Kosovo: {
    name: 'Kosovo',
    code: 'XK',
    category: 'Rest of Europe',
  },
  Liechtenstein: {
    name: 'Liechtenstein',
    code: 'LI',
    category: 'Rest of Europe',
  },
  NorthernIreland: {
    name: 'Northern Ireland',
    code: 'GB-NIR',
    category: 'Rest of Europe',
  },
  RestOfWorld: {
    name: 'Rest of the World',
    code: 'WW',
    category: 'Rest of Europe',
  },
  Scotland: {
    name: 'Scotland',
    code: 'GB-SCT',
    category: 'Rest of Europe',
  },
  VaticanCity: {
    name: 'Vatican City',
    code: 'VA',
    category: 'Rest of Europe',
  },
  Wales: {
    name: 'Wales',
    code: 'GB-WLS',
    category: 'Rest of Europe',
  },
};

export const ALL_COUNTRIES: CommonCountry[] = Object.values(COMMON_COUNTRIES);
