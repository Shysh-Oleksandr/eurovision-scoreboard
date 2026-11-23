'use client';
import React, { useLayoutEffect, useMemo, useState } from 'react';

import { FlagElement as FlagElementModel } from '../model/design';
import { RowGeometry } from '../model/rowGeometry';

import FlagElement from './FlagElement';

import { getSpecialBackgroundStyle } from '@/components/countryItem/utils/gradientUtils';
import {
  getFlagPathForImageGeneration,
  handleFlagError,
} from '@/helpers/getFlagPath';
import { useGeneralStore } from '@/state/generalStore';
import { useScopedTheme } from '@/theme/ThemeScope';
import useThemeSpecifics from '@/theme/useThemeSpecifics';

/**
 * The country row the draw and participants elements share: the theme's
 * board row in its neutral (running-order) look, with a Eurovision heart
 * placed for the row's shape (model/rowGeometry.ts) or the theme's own
 * flag. Every size is a multiple of the row height.
 */

export interface RowCountry {
  code: string;
  name: string;
  /** A custom entry's flag image (built-in codes resolve their own). */
  flag?: string;
}

export const ROW_CLASSES =
  'bg-countryItem-televoteUnfinishedBg text-countryItem-televoteUnfinishedText';
export const PLACE_CLASSES =
  'bg-countryItem-televoteUnfinishedPlaceContainerBg text-countryItem-televoteUnfinishedPlaceText';

/** Name size and right padding, in row heights. */
export const NAME_FONT = 0.44;
export const NAME_PAD_RIGHT = 0.45;

export const TEXT_SHADOW = '0 0 10px rgba(0, 0, 0, 0.2)';

/** Square-cornered themes get softly rounded rows here, in row heights. */
export const SOFT_RADIUS = 0.16;

/** A row's (or number box's) corner radius for the theme's row shape. */
export const rowRadius = (look: { rounded: boolean }, rh: number): number =>
  look.rounded ? 9999 : Math.round(rh * SOFT_RADIUS);

export interface RowLook {
  rounded: boolean;
  uppercase: boolean;
  flagShape: string;
  minimalFlags: boolean;
  rowStyle: React.CSSProperties | undefined;
  placeStyle: React.CSSProperties | undefined;
}

/** The design theme's row look (ThemeScope, else the app's theme). */
export function useRowLook(): RowLook {
  const scoped = useScopedTheme();
  const { uppercaseEntryName, roundedCountryContainer, flagShape } =
    useThemeSpecifics();
  const minimalFlags = useGeneralStore(
    (s) => s.settings.enableMinimalisticFlags,
  );
  const overrides = scoped.customTheme?.overrides || null;
  const themeYear = scoped.customTheme?.baseThemeYear ?? scoped.themeYear;
  const shape = String(flagShape ?? 'big-rectangle');

  return useMemo<RowLook>(
    () => ({
      rounded: !!roundedCountryContainer,
      uppercase: !!uppercaseEntryName,
      flagShape: shape,
      minimalFlags,
      rowStyle: getSpecialBackgroundStyle(ROW_CLASSES, overrides, themeYear),
      placeStyle: getSpecialBackgroundStyle(
        PLACE_CLASSES,
        overrides,
        themeYear,
      ),
    }),
    [
      roundedCountryContainer,
      uppercaseEntryName,
      shape,
      minimalFlags,
      overrides,
      themeYear,
    ],
  );
}

export const heartModel = (
  country: RowCountry,
  size: number,
  white: boolean,
): FlagElementModel => ({
  id: `heart-${country.code}`,
  type: 'flag',
  countryCode: country.code,
  flag: country.flag,
  shape: 'heart',
  use2026WhiteHeart: white,
  x: 0,
  y: 0,
  w: size,
  h: size,
  rotation: 0,
  opacity: 1,
  locked: false,
  hidden: false,
});

/** A heart in a `size` × `size` box (official image, or the masked flag). */
export const Heart: React.FC<{
  country: RowCountry;
  size: number;
  white: boolean;
}> = ({ country, size, white }) => (
  <FlagElement el={heartModel(country, size, white)} />
);

/** The theme's flag in a board row, scaled to the row height. */
const ThemeFlag: React.FC<{
  country: RowCountry;
  rh: number;
  look: RowLook;
}> = ({ country, rh, look }) => {
  const shape = look.flagShape as Parameters<
    typeof getFlagPathForImageGeneration
  >[1];

  if (look.flagShape === 'none') return null;
  const box: React.CSSProperties =
    look.flagShape === 'round' || look.flagShape === 'round-border'
      ? {
          width: rh * 0.75,
          height: rh * 0.75,
          marginLeft: rh * 0.12,
          borderRadius: '9999px',
          border: look.flagShape === 'round-border' ? '1.5px solid' : undefined,
        }
      : look.flagShape === 'square'
      ? { width: rh, height: rh }
      : look.flagShape === 'small-rectangle'
      ? {
          width: rh,
          height: rh * 0.68,
          marginLeft: rh * 0.15,
          borderRadius: 2,
        }
      : { width: rh * 1.25, height: rh };

  return (
    <img
      src={getFlagPathForImageGeneration(country, shape, look.minimalFlags)}
      onError={(e) => handleFlagError(e.currentTarget, country, shape)}
      alt=""
      draggable={false}
      className="flex-none object-cover bg-countryItem-juryBg"
      style={box}
    />
  );
};

/**
 * One country as a board row `rh` tall. The row fills its box's width
 * (`width` fixes it instead); a heart placed `beside` keeps the row's
 * surface to the right of it.
 */
export const CountryRow: React.FC<{
  country: RowCountry;
  rh: number;
  geometry: RowGeometry;
  look: RowLook;
  white2026: boolean;
  width?: number;
}> = ({ country, rh, geometry, look, white2026, width }) => {
  const { heart } = geometry;
  const surfaceLeft = geometry.surfaceLeft * rh;
  const radius = rowRadius(look, rh);

  return (
    <div
      className="relative min-w-0 flex-1"
      style={{ height: rh, width, flex: width ? 'none' : undefined }}
    >
      <div
        className={`dp-scoreboard-font absolute right-0 flex items-center overflow-hidden shadow-md ${ROW_CLASSES}`}
        style={{
          left: surfaceLeft,
          top: geometry.surfaceInset * rh,
          bottom: geometry.surfaceInset * rh,
          borderRadius: radius,
          ...look.rowStyle,
        }}
      >
        {heart ? (
          <span
            className="flex-none"
            style={{ width: geometry.lead * rh - surfaceLeft }}
          />
        ) : (
          <>
            <ThemeFlag country={country} rh={rh} look={look} />
            <span
              className="flex-none"
              style={{
                width:
                  look.flagShape === 'none' ? geometry.lead * rh : rh * 0.3,
              }}
            />
          </>
        )}
        <span
          className={`min-w-0 flex-1 truncate font-bold ${
            look.uppercase ? 'uppercase' : ''
          }`}
          style={{
            fontSize: rh * NAME_FONT,
            lineHeight: 1.2,
            paddingRight: rh * NAME_PAD_RIGHT,
          }}
        >
          {country.name}
        </span>
      </div>
      {heart && (
        <div
          className="absolute pointer-events-none"
          style={{
            left: heart.left * rh,
            top: (rh - heart.size * rh) / 2 - heart.rise * rh,
            width: heart.size * rh,
            height: heart.size * rh,
          }}
        >
          <Heart country={country} size={heart.size * rh} white={white2026} />
        </div>
      )}
    </div>
  );
};

/** Font size of the hidden name probe; widths are read in ems of it. */
const PROBE_PX = 40;

/**
 * Every name's width in ems of the row font, read from hidden copies of
 * the names (`NameProbe`). Re-read when the font loads (the probe resizes).
 * `null` until measured.
 */
export function useNameWidths(
  probeRef: React.RefObject<HTMLDivElement | null>,
  key: string,
): Map<string, number> | null {
  const [widths, setWidths] = useState<Map<string, number> | null>(null);

  useLayoutEffect(() => {
    const probe = probeRef.current;

    if (!probe) return undefined;
    const measure = () => {
      const next = new Map<string, number>();

      Array.from(probe.children).forEach((child) => {
        const span = child as HTMLElement;

        next.set(
          span.dataset.name ?? '',
          Math.round((span.offsetWidth / PROBE_PX) * 100) / 100,
        );
      });
      setWidths((prev) => {
        if (
          prev &&
          prev.size === next.size &&
          [...next].every(([name, em]) => prev.get(name) === em)
        ) {
          return prev;
        }

        return next;
      });
    };

    measure();
    const observer = new ResizeObserver(measure);

    observer.observe(probe);

    return () => observer.disconnect();
  }, [probeRef, key]);

  return widths;
}

/** Hidden copies of the names in the row font: zero-size and clipped. */
export const NameProbe: React.FC<{
  probeRef: React.RefObject<HTMLDivElement | null>;
  names: string[];
  uppercase: boolean;
}> = ({ probeRef, names, uppercase }) => (
  <div
    aria-hidden="true"
    className="absolute left-0 top-0 overflow-hidden"
    style={{ width: 0, height: 0, visibility: 'hidden' }}
  >
    <div
      ref={probeRef}
      className={`dp-scoreboard-font flex flex-col items-start font-bold ${
        uppercase ? 'uppercase' : ''
      }`}
      style={{
        fontSize: PROBE_PX,
        width: 'max-content',
        whiteSpace: 'nowrap',
      }}
    >
      {names.map((name) => (
        <span key={name} data-name={name}>
          {name}
        </span>
      ))}
    </div>
  </div>
);

/** A name's width guessed from its letters, before the probe has measured. */
export const guessNameEm = (name: string, uppercase: boolean): number =>
  name.length * (uppercase ? 0.7 : 0.6);
