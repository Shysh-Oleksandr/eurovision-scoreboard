import { BaseCountry } from '../models';

export const getFlagPath = (country: BaseCountry | string): string => {
  if (typeof country === 'string') {
    return `/flags/${country.toLowerCase()}.svg`;
  }

  if (country.flag) return country.flag;

  if (country.code.startsWith('custom')) return 'ww';

  return `/flags/${country.code.toLowerCase()}.svg`;
};

// After updating flags, run `yarn build` to update the flags in the build folder
