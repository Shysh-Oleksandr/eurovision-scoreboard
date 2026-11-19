/**
 * Sports-style three-letter codes (the Olympics' IOC codes, the football
 * ones where there is none: England, Scotland, Wales, Northern Ireland,
 * Macao, Guadeloupe, French Polynesia), keyed by the country's `code`. Fans
 * know these from broadcasts (GER, SUI, NED, CRO), unlike several ISO
 * alpha-3 ones (DEU, CHE, NLD, HRV). The phone board uses them in place of
 * names when two columns are asked for and a name doesn't fit.
 *
 * A map rather than a field on the countries: country objects are copied
 * into saved contests and line-ups, which then wouldn't carry it (or would
 * carry it into the backend); looking up by `code` also covers contests
 * saved before. Custom entries use the code their owner picked
 * (`BaseCountry.shortCode`, saved with the entry and in contests), else one
 * made from the name (`getShortCodes`).
 */
export const SHORT_CODES: Record<string, string> = {
  // Eurovision participants
  AL: 'ALB',
  AD: 'AND',
  AM: 'ARM',
  AU: 'AUS',
  AT: 'AUT',
  AZ: 'AZE',
  BY: 'BLR',
  BE: 'BEL',
  BA: 'BIH',
  BG: 'BUL',
  CA: 'CAN',
  HR: 'CRO',
  CY: 'CYP',
  CZ: 'CZE',
  DK: 'DEN',
  EE: 'EST',
  FI: 'FIN',
  FR: 'FRA',
  GE: 'GEO',
  DE: 'GER',
  GR: 'GRE',
  HU: 'HUN',
  IS: 'ISL',
  IE: 'IRL',
  IL: 'ISR',
  IT: 'ITA',
  LV: 'LAT',
  LT: 'LTU',
  LU: 'LUX',
  MT: 'MLT',
  MD: 'MDA',
  MC: 'MON',
  ME: 'MNE',
  MA: 'MAR',
  NL: 'NED',
  MK: 'MKD',
  NO: 'NOR',
  PL: 'POL',
  PT: 'POR',
  RO: 'ROU',
  RU: 'RUS',
  SM: 'SMR',
  RS: 'SRB',
  CS: 'SCG',
  SK: 'SVK',
  SI: 'SLO',
  ES: 'ESP',
  SE: 'SWE',
  CH: 'SUI',
  TR: 'TUR',
  UA: 'UKR',
  GB: 'GBR',
  YU: 'YUG',
  // Asia
  AF: 'AFG',
  BH: 'BRN',
  BD: 'BAN',
  BT: 'BHU',
  BN: 'BRU',
  KH: 'CAM',
  CN: 'CHN',
  TL: 'TLS',
  HK: 'HKG',
  IN: 'IND',
  ID: 'INA',
  IR: 'IRI',
  IQ: 'IRQ',
  JP: 'JPN',
  JO: 'JOR',
  KZ: 'KAZ',
  KW: 'KUW',
  KG: 'KGZ',
  LA: 'LAO',
  LB: 'LBN',
  MO: 'MAC',
  MY: 'MAS',
  MV: 'MDV',
  MN: 'MGL',
  MM: 'MYA',
  NP: 'NEP',
  KP: 'PRK',
  OM: 'OMA',
  PK: 'PAK',
  PS: 'PLE',
  PH: 'PHI',
  QA: 'QAT',
  SA: 'KSA',
  SG: 'SGP',
  KR: 'KOR',
  LK: 'SRI',
  SY: 'SYR',
  TW: 'TPE',
  TJ: 'TJK',
  TH: 'THA',
  TM: 'TKM',
  AE: 'UAE',
  UZ: 'UZB',
  VN: 'VIE',
  YE: 'YEM',
  // Africa
  DZ: 'ALG',
  AO: 'ANG',
  BJ: 'BEN',
  BW: 'BOT',
  BF: 'BUR',
  BI: 'BDI',
  CM: 'CMR',
  CV: 'CPV',
  CF: 'CAF',
  TD: 'CHA',
  KM: 'COM',
  CG: 'CGO',
  CD: 'COD',
  DJ: 'DJI',
  EG: 'EGY',
  GQ: 'GEQ',
  ER: 'ERI',
  SZ: 'SWZ',
  ET: 'ETH',
  GA: 'GAB',
  GM: 'GAM',
  GH: 'GHA',
  GN: 'GUI',
  GW: 'GBS',
  CI: 'CIV',
  KE: 'KEN',
  LS: 'LES',
  LR: 'LBR',
  LY: 'LBA',
  MG: 'MAD',
  MW: 'MAW',
  ML: 'MLI',
  MR: 'MTN',
  MU: 'MRI',
  MZ: 'MOZ',
  NA: 'NAM',
  NE: 'NIG',
  NG: 'NGR',
  RW: 'RWA',
  ST: 'STP',
  SN: 'SEN',
  SC: 'SEY',
  SL: 'SLE',
  SO: 'SOM',
  ZA: 'RSA',
  SS: 'SSD',
  SD: 'SUD',
  TZ: 'TAN',
  TG: 'TOG',
  TN: 'TUN',
  UG: 'UGA',
  ZM: 'ZAM',
  ZW: 'ZIM',
  // The Americas
  AG: 'ANT',
  BS: 'BAH',
  BB: 'BAR',
  BZ: 'BIZ',
  CR: 'CRC',
  CU: 'CUB',
  DM: 'DMA',
  DO: 'DOM',
  SV: 'ESA',
  GD: 'GRN',
  GP: 'GLP',
  GT: 'GUA',
  HT: 'HAI',
  HN: 'HON',
  JM: 'JAM',
  MX: 'MEX',
  NI: 'NCA',
  PA: 'PAN',
  LC: 'LCA',
  KN: 'SKN',
  TT: 'TTO',
  US: 'USA',
  AR: 'ARG',
  BO: 'BOL',
  BR: 'BRA',
  CL: 'CHI',
  CO: 'COL',
  EC: 'ECU',
  GY: 'GUY',
  PY: 'PAR',
  PE: 'PER',
  SR: 'SUR',
  UY: 'URU',
  VE: 'VEN',
  // Oceania
  FJ: 'FIJ',
  PF: 'TAH',
  KI: 'KIR',
  NZ: 'NZL',
  PW: 'PLW',
  PG: 'PNG',
  WS: 'SAM',
  SB: 'SOL',
  TO: 'TGA',
  TV: 'TUV',
  // The rest of Europe and the world
  'GB-ENG': 'ENG',
  FO: 'FRO',
  XK: 'KOS',
  LI: 'LIE',
  'GB-NIR': 'NIR',
  WW: 'ROW',
  'GB-SCT': 'SCO',
  VA: 'VAT',
  'GB-WLS': 'WAL',
};

/** A name's letters, accents dropped, upper-cased ("Türkiye" → TURKIYE). */
const lettersOf = (name: string) =>
  name.normalize('NFD').replace(/\p{M}/gu, '').toUpperCase().match(/\p{L}/gu) ??
  [];

const VOWELS = new Set(['A', 'E', 'I', 'O', 'U', 'Y']);

/**
 * Codes a name could take, best first: the initials of a name of three
 * words or more, its first three letters, the first letter and the next two
 * consonants, then the first letter with any two later letters in order.
 */
const candidatesFor = (name: string): string[] => {
  const letters = lettersOf(name);

  if (letters.length === 0) return [];
  if (letters.length <= 3) return [letters.join('')];

  const words = name
    .split(/[\s\-&]+/)
    .map(lettersOf)
    .filter((w) => w.length);
  const [first, ...rest] = letters;
  const consonants = rest.filter((letter) => !VOWELS.has(letter));
  const list: string[] = [];

  if (words.length >= 3)
    list.push(
      words
        .slice(0, 3)
        .map((w) => w[0])
        .join(''),
    );
  list.push(letters.slice(0, 3).join(''));
  if (consonants.length >= 2) list.push(first + consonants[0] + consonants[1]);

  for (let i = 0; i < rest.length; i += 1) {
    for (let j = i + 1; j < rest.length; j += 1) {
      list.push(first + rest[i] + rest[j]);
    }
  }

  return Array.from(new Set(list));
};

/** What a custom entry's own code may be: up to 3 letters or digits. */
const SHORT_CODE_PATTERN = /^[\p{L}\p{N}]{1,3}$/u;

/**
 * A typed code as it is stored: composed accents, upper case, letters and
 * digits only, at most 3 ("fl o!" → "FLO"). The backend checks the same.
 */
export const normalizeShortCode = (value: string): string =>
  Array.from(
    value
      .normalize('NFC')
      .toUpperCase()
      .replace(/[^\p{L}\p{N}]/gu, ''),
  )
    .slice(0, 3)
    .join('');

/** The code a name makes on its own ("Floptropica" → FLO), or "". */
export const suggestShortCode = (name: string): string =>
  candidatesFor(name)[0] ?? '';

/**
 * The codes users picked for custom entries, keyed by `code`, for
 * `getShortCodes`. Read from the custom entries (the user's own and a loaded
 * contest's), not the line-up's copies: voters and copies made before an
 * edit don't carry it. Anything that isn't a valid code (a hand-made
 * contest file) is left out.
 */
export const getChosenShortCodes = (
  entries: readonly { code: string; shortCode?: string }[],
): Record<string, string> => {
  const chosen: Record<string, string> = {};

  entries.forEach(({ code, shortCode }) => {
    if (shortCode && SHORT_CODE_PATTERN.test(shortCode)) {
      chosen[code] = shortCode;
    }
  });

  return chosen;
};

/**
 * Short codes for a line-up, keyed by `code`: the sports codes above, the
 * codes picked for custom entries (`chosen`, kept even if another entry uses
 * the same one: the owner asked for it), and for every other custom entry a
 * code from the name that no other entry in the line-up uses ("Floptropica"
 * → FLO, a second "Flopland" → FLP). Deterministic for the same line-up in
 * the same order.
 */
export const getShortCodes = (
  countries: readonly { code: string; name: string }[],
  chosen: Readonly<Record<string, string>> = {},
): Record<string, string> => {
  const codes: Record<string, string> = {};
  const taken = new Set<string>();
  const unknown: { code: string; name: string }[] = [];

  countries.forEach((country) => {
    if (country.code in codes) return;

    const known =
      SHORT_CODES[country.code.toUpperCase()] ?? chosen[country.code];

    if (known) {
      codes[country.code] = known;
      taken.add(known);
    } else {
      unknown.push(country);
    }
  });

  unknown.forEach(({ code, name }) => {
    if (code in codes) return;

    const candidates = candidatesFor(name);
    let picked = candidates.find((candidate) => !taken.has(candidate));

    if (!picked) {
      const stem = (candidates[0] ?? '?').slice(0, 2);

      for (let n = 2; !picked; n += 1) {
        if (!taken.has(`${stem}${n}`)) picked = `${stem}${n}`;
      }
    }

    codes[code] = picked;
    taken.add(picked);
  });

  return codes;
};
