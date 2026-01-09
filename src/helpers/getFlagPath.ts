import { BaseCountry } from '../models';

export const getFlagPath = (country: BaseCountry | string): string => {
  if (typeof country === 'string') {
    return `/flags/${country.toLowerCase()}.svg`;
  }

  if (country.flag) return country.flag;

  if (country.code.startsWith('custom')) return '/flags/ww.svg';

  return `/flags/${country.code.toLowerCase()}.svg`;
};

/**
 * Get flag path with proxy for external URLs to avoid CORS issues during image generation
 * Only use this for image generation contexts where CORS is a problem
 */
export const getFlagPathForImageGeneration = (country: BaseCountry | string): string => {
  const flagPath = getFlagPath(country);

  // Check if it's an external URL (not from our domain)
  if (flagPath.startsWith('http://') || flagPath.startsWith('https://')) {
    // Check if it's already from our domain
    if (flagPath.includes('douzepoints.app') || flagPath.includes('cdn.douzepoints.app')) {
      return flagPath;
    }

    // Proxy external URLs through our image proxy
    return `/api/image-proxy?url=${encodeURIComponent(flagPath)}`;
  }

  // Return local paths as-is
  return flagPath;
};

// After updating flags, run `yarn build` to update the flags in the build folder
