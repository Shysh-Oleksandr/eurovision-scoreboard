import React from 'react';

/**
 * Map button background classes to override keys that may support gradients.
 */
const BG_CLASS_TO_OVERRIDE_KEY: Record<string, string> = {
  'bg-countryItem-juryBg': 'countryItem.juryBg',
  'bg-countryItem-televoteUnfinishedBg': 'countryItem.televoteUnfinishedBg',
  'bg-countryItem-televoteActiveBg': 'countryItem.televoteActiveBg',
  'bg-countryItem-televoteFinishedBg': 'countryItem.televoteFinishedBg',
  'bg-countryItem-unqualifiedBg': 'countryItem.unqualifiedBg',
  'bg-countryItem-douzePointsBg': 'countryItem.douzePointsBg',
  'bg-countryItem-placeContainerBg': 'countryItem.placeContainerBg',
};

/**
 * Given a className that contains bg-countryItem-* classes and the current overrides,
 * returns an inline style with a gradient background if the corresponding override
 * contains a CSS gradient string. Otherwise returns undefined.
 */
export function getGradientBackgroundStyle(
  className: string,
  overrides?: Record<string, string> | null,
): React.CSSProperties | undefined {
  if (!className || !overrides) return undefined;

  const classes = className.split(/\s+/).filter(Boolean);

  for (const cls of classes) {
    const key = BG_CLASS_TO_OVERRIDE_KEY[cls];
    if (!key) continue;

    const value = overrides[key];
    if (typeof value === 'string' && /gradient\(/i.test(value)) {
      // Use shorthand background to fully override any background-color
      return { background: value } as React.CSSProperties;
    }
  }

  return undefined;
}
