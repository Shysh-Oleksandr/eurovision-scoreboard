/**
 * Get the path to a country flag SVG file
 * @param code - The country code (e.g., 'US', 'GB', 'FR')
 * @returns The path to the flag SVG file
 */
export const getFlagPath = (code: string): string => {
  return `/flags/${code.toLowerCase()}.svg`;
};

// After updating flags, run `yarn build` to update the flags in the build folder
