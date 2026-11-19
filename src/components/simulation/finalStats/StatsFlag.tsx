import React from 'react';

import { useShallow } from 'zustand/shallow';

import { getFlagPath } from '@/helpers/getFlagPath';
import { BaseCountry } from '@/models';
import { useGeneralStore } from '@/state/generalStore';
import { getHostingCountryLogo } from '@/theme/hosting';

export interface FlagSettings {
  heart: boolean;
  whiteHearts2026: boolean;
}

/** The user's flag settings, read once per table rather than per flag. */
export const useFlagSettings = (): FlagSettings =>
  useGeneralStore(
    useShallow((state) => ({
      heart: state.settings.shouldShowHeartFlagIcon,
      whiteHearts2026: state.settings.shouldUse2026WhiteHeartFlags,
    })),
  );

interface StatsFlagProps {
  country: Pick<BaseCountry, 'code' | 'name' | 'flag'>;
  settings: FlagSettings;
  /** `sm` for the Breakdown's voter columns. */
  size?: 'sm' | 'md';
}

/**
 * A country's flag in the stats tables: the heart when the user's setting
 * asks for it and the country has one, else the plain flag. Decorative: the
 * name (or its code with the name for screen readers) always sits next to it.
 */
const StatsFlag = ({ country, settings, size = 'md' }: StatsFlagProps) => {
  const { logo, isExisting } = getHostingCountryLogo(
    country as BaseCountry,
    settings.heart,
    settings.whiteHearts2026,
  );
  const heartSize = size === 'sm' ? 'size-[24px]' : 'size-[28px]';
  const rectSize = size === 'sm' ? 'w-[24px] h-[16px]' : 'w-[28px] h-[19px]';

  return (
    <img
      loading="lazy"
      src={logo}
      alt=""
      aria-hidden="true"
      className={`flex-none ${
        isExisting ? heartSize : `${rectSize} object-cover rounded-[3px]`
      }`}
      width={28}
      height={isExisting ? 28 : 19}
      onError={(e) => {
        e.currentTarget.src = getFlagPath('ww');
      }}
    />
  );
};

export default StatsFlag;
