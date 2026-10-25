'use client';
import React, { useState } from 'react';

import { FlagElement as FlagElementModel } from '../model/design';

import {
  HEART_OUTLINE_PATH,
  HEART_VIEWBOX,
  heartBox,
  heartMaskStyle,
} from './eurovisionHeart';
import { maskStyle } from './ImageElement';

import { ALL_COUNTRIES } from '@/data/countries/common-countries';
import {
  getFlagPathForImageGeneration,
  handleFlagError,
} from '@/helpers/getFlagPath';
import { BaseCountry } from '@/models';
import { getHostingLogoByCountryCode } from '@/theme/hosting';

const BUILT_IN_CODES = new Set(ALL_COUNTRIES.map((c) => c.code));

/** The flag source: a custom entry's own image, else the code's flag. */
const flagCountry = (el: FlagElementModel): BaseCountry | string =>
  el.flag && !BUILT_IN_CODES.has(el.countryCode)
    ? ({ code: el.countryCode, name: '', flag: el.flag } as BaseCountry)
    : el.countryCode;

const FlagImg: React.FC<{
  country: BaseCountry | string;
  style: React.CSSProperties;
}> = ({ country, style }) => (
  <img
    src={getFlagPathForImageGeneration(country, 'big-rectangle')}
    onError={(e) => handleFlagError(e.currentTarget, country, 'big-rectangle')}
    alt={typeof country === 'string' ? country : country.code}
    draggable={false}
    className="block w-full h-full object-cover"
    style={style}
  />
);

/**
 * Hearts: the official heart image when the country has one (as in the rest
 * of the app), else the flag cut to the same heart with its black outline.
 */
const HeartFlag: React.FC<{ el: FlagElementModel }> = ({ el }) => {
  const country = flagCountry(el);
  const official =
    typeof country === 'string' ? getHostingLogoByCountryCode(country) : null;
  const [failed, setFailed] = useState<string | null>(null);

  if (official && failed !== official) {
    return (
      <img
        src={official}
        onError={() => setFailed(official)}
        alt={el.countryCode}
        draggable={false}
        className="block w-full h-full object-contain"
      />
    );
  }

  return (
    <div className="w-full h-full flex items-center justify-center">
      <div className="relative flex-none" style={heartBox(el.w, el.h)}>
        <FlagImg country={country} style={heartMaskStyle} />
        <svg
          viewBox={HEART_VIEWBOX}
          className="absolute inset-0 w-full h-full"
          aria-hidden
        >
          <path d={HEART_OUTLINE_PATH} fill="#000" />
        </svg>
      </div>
    </div>
  );
};

const FlagElement: React.FC<{ el: FlagElementModel }> = ({ el }) =>
  el.shape === 'heart' ? (
    <HeartFlag el={el} />
  ) : (
    <FlagImg
      country={flagCountry(el)}
      style={el.shape === 'round' ? maskStyle('circle') : maskStyle('none', 4)}
    />
  );

export default FlagElement;
