import { CSSProperties, useMemo } from 'react';

import { getSpecialBackgroundStyle } from '@/components/countryItem/utils/gradientUtils';
import { useGeneralStore } from '@/state/generalStore';
import { FlagShape, PointsContainerShape } from '@/theme/types';
import useThemeSpecifics from '@/theme/useThemeSpecifics';

/**
 * How a stage tile mirrors the theme's jury-state board row: row shape, case
 * and flag shape from the theme specifics, plus inline backgrounds for the
 * colours tw-colors can't express (gradients, alpha).
 */
export type BoardRowLook = {
  rounded: boolean;
  uppercase: boolean;
  flagShape: FlagShape;
  minimalisticFlags: boolean;
  pointsShape: PointsContainerShape;
  rowStyle?: CSSProperties;
  placeStyle?: CSSProperties;
};

/** The active theme's board row look. */
export const useBoardRowLook = (): BoardRowLook => {
  const {
    uppercaseEntryName,
    flagShape,
    pointsContainerShape,
    roundedCountryContainer,
  } = useThemeSpecifics();
  const minimalisticFlags = useGeneralStore(
    (s) => s.settings.enableMinimalisticFlags,
  );
  const overrides = useGeneralStore((s) => s.customTheme?.overrides || null);
  const themeYear = useGeneralStore(
    (s) => s.customTheme?.baseThemeYear ?? s.themeYear,
  );

  return useMemo(
    () => ({
      rounded: roundedCountryContainer,
      uppercase: uppercaseEntryName,
      flagShape,
      minimalisticFlags,
      pointsShape: pointsContainerShape,
      rowStyle: getSpecialBackgroundStyle(
        'bg-countryItem-juryBg',
        overrides,
        themeYear,
      ),
      placeStyle: getSpecialBackgroundStyle(
        'bg-countryItem-juryPlaceContainerBg',
        overrides,
        themeYear,
      ),
    }),
    [
      roundedCountryContainer,
      uppercaseEntryName,
      flagShape,
      minimalisticFlags,
      pointsContainerShape,
      overrides,
      themeYear,
    ],
  );
};
