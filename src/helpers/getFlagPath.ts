import { FlagShape } from '@/theme/types';
import { BaseCountry } from '../models';

const supportedCustomFlagShapes: FlagShape[] = ['round', 'round-border'];

const supportedRoundFlags = [
  'AL',
  'AD',
  'AM',
  'AU',
  'AT',
  'AZ',
  'BY',
  'BE',
  'BA',
  'BG',
  'HR',
  'CY',
  'CZ',
  'DK',
  'EE',
  'FI',
  'FR',
  'GE',
  'DE',
  'GR',
  'HU',
  'IS',
  'IE',
  'IL',
  'IT',
  'LV',
  'LT',
  'LU',
  'MT',
  'MD',
  'MC',
  'ME',
  'MA',
  'NL',
  'MK',
  'NO',
  'PL',
  'PT',
  'RO',
  'RU',
  'SM',
  'RS',
  'SK',
  'SI',
  'ES',
  'SE',
  'CH',
  'TR',
  'UA',
  'GB',
  'YU',
  'AF',
  'BH',
  'BD',
  'BT',
  'BN',
  'KH',
  'CN',
  'TL',
  'HK',
  'IN',
  'ID',
  'IR',
  'IQ',
  'JP',
  'JO',
  'KZ',
  'KW',
  'KG',
  'LA',
  'LB',
  'MO',
  'MY',
  'MV',
  'MN',
  'MM',
  'NP',
  'KP',
  'OM',
  'PK',
  'PS',
  'PH',
  'QA',
  'SA',
  'SG',
  'KR',
  'LK',
  'SY',
  'TW',
  'TJ',
  'TH',
  'TM',
  'AE',
  'UZ',
  'VN',
  'YE',
  'DZ',
  'AO',
  'BJ',
  'BW',
  'BF',
  'BI',
  'CM',
  'CV',
  'CF',
  'TD',
  'KM',
  'CG',
  'CD',
  'DJ',
  'EG',
  'GQ',
  'ER',
  'SZ',
  'ET',
  'GA',
  'GM',
  'GH',
  'GN',
  'GW',
  'CI',
  'KE',
  'LS',
  'LR',
  'LY',
  'MG',
  'MW',
  'ML',
  'MR',
  'MU',
  'MZ',
  'NA',
  'NE',
  'NG',
  'RW',
  'ST',
  'SN',
  'SC',
  'SL',
  'SO',
  'ZA',
  'SS',
  'SD',
  'TZ',
  'TG',
  'TN',
  'UG',
  'ZM',
  'ZW',
  'AG',
  'BS',
  'BB',
  'BZ',
  'CA',
  'CR',
  'CU',
  'DM',
  'DO',
  'SV',
  'GD',
  'GP',
  'GT',
  'HT',
  'HN',
  'JM',
  'MX',
  'NI',
  'PA',
  'LC',
  'KN',
  'TT',
  'US',
  'AR',
  'BO',
  'BR',
  'CL',
  'CO',
  'EC',
  'GY',
  'PY',
  'PE',
  'SR',
  'UY',
  'VE',
  'FJ',
  'PF',
  'KI',
  'NZ',
  'PW',
  'PG',
  'WS',
  'SB',
  'TO',
  'TV',
  'GB-ENG',
  'FO',
  'XK',
  'LI',
  'GB-NIR',
  'GB-SCT',
  'VA',
  'GB-WLS',
];

export const getFlagPath = (
  country: BaseCountry | string,
  shape: FlagShape = 'big-rectangle',
): string => {
  if (typeof country === 'string') {
    if (
      shape &&
      supportedCustomFlagShapes.includes(shape) &&
      supportedRoundFlags.includes(country.toUpperCase())
    ) {
      return `/flags-shapes/round/${country.toLowerCase()}.svg`;
    }

    return `/flags/${country.toLowerCase()}.svg`;
  }

  // Custom entry flag
  if (country.flag) return country.flag;

  if (country.code.startsWith('custom')) return '/flags/ww.svg';

  if (
    shape &&
    supportedCustomFlagShapes.includes(shape) &&
    supportedRoundFlags.includes(country.code.toUpperCase())
  ) {
    return `/flags-shapes/round/${country.code.toLowerCase()}.svg`;
  }

  return `/flags/${country.code.toLowerCase()}.svg`;
};

/**
 * Get flag path with proxy for external URLs to avoid CORS issues during image generation
 * Only use this for image generation contexts where CORS is a problem
 */
export const getFlagPathForImageGeneration = (
  country: BaseCountry | string,
  shape: FlagShape = 'big-rectangle',
): string => {
  const flagPath = getFlagPath(country, shape);

  // Check if it's an external URL (not from our domain)
  if (flagPath.startsWith('http://') || flagPath.startsWith('https://')) {
    // Check if it's already from our domain
    if (
      flagPath.includes('douzepoints.app') ||
      flagPath.includes('cdn.douzepoints.app')
    ) {
      return flagPath;
    }

    // Proxy external URLs through our image proxy
    return `/api/image-proxy?url=${encodeURIComponent(flagPath)}`;
  }

  // Return local paths as-is
  return flagPath;
};

export const getBackgroundImageForImageGeneration = (
  backgroundImage: string,
): string => {
  if (
    backgroundImage.startsWith('http://') ||
    backgroundImage.startsWith('https://')
  ) {
    if (
      backgroundImage.includes('douzepoints.app') ||
      backgroundImage.includes('cdn.douzepoints.app')
    ) {
      return backgroundImage;
    }

    return `/api/image-proxy?url=${encodeURIComponent(backgroundImage)}`;
  }
  return backgroundImage;
};

export const handleFlagError = (
  img: EventTarget & HTMLImageElement,
  country: BaseCountry | string,
  shape: FlagShape = 'big-rectangle',
) => {
  const preferredSrc = getFlagPath(country, shape);
  const baseSrc = getFlagPath(country, 'big-rectangle');
  const fallbackSrc = getFlagPath('ww');

  const stage = img.dataset.fallbackStage ?? '0';

  // stage 0: preferred (maybe round) failed -> try base rectangular if different, else ww
  if (stage === '0') {
    if (preferredSrc !== baseSrc) {
      img.dataset.fallbackStage = '1';
      img.src = baseSrc;

      return;
    }

    img.dataset.fallbackStage = '2';
    img.src = fallbackSrc;

    return;
  }

  // stage 1: base rectangular failed -> ww
  if (stage === '1') {
    img.dataset.fallbackStage = '2';
    img.src = fallbackSrc;

    return;
  }

  // stage 2+: give up (avoid infinite loops)
  img.onerror = null;
};

// After updating flags, run `yarn build` to update the flags in the build folder
