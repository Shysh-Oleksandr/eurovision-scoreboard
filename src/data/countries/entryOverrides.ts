import { ALL_COUNTRIES } from './common-countries';

import type { BaseCountry, EventStage } from '@/models';

/**
 * Entry overrides: a contest's own name and flag for a standard country
 * (F.Y.R. Macedonia for MK, a globe for the Rest of the World). The country
 * keeps its code, so stats, odds, votes, relations and running orders still
 * treat it as itself; only what the contest shows changes. Saved in the
 * snapshot's `setup.entryOverrides`, validated again by the backend's
 * `sanitizeEntryOverrides` (contests/entry-overrides.ts).
 * See docs/entry-overrides.md.
 */
export interface EntryOverride {
  /** Shown instead of the built-in name. */
  name?: string;
  /**
   * Drawn instead of the built-in flag: another country's flag
   * (`/flags/yu.svg`, which keeps the theme's flag shapes and hearts), a
   * preset (`/flags/earth.svg`) or an image URL (a custom entry's upload).
   */
  flag?: string;
}

/** Keyed by country code; only countries that differ are listed. */
export type EntryOverrides = Record<string, EntryOverride>;

/** The shape every copy of a country has (lineups, voters, the winner). */
type EntryLike = Pick<BaseCountry, 'code' | 'name' | 'flag'>;

export const ENTRY_OVERRIDE_NAME_MAX = 100;
const FLAG_URL_MAX = 2048;

const CANONICAL = new Map<string, Pick<BaseCountry, 'code' | 'name'>>(
  ALL_COUNTRIES.map((country) => [country.code, country]),
);

/** The built-in country (name as the app ships it), without overrides. */
export const getCanonicalCountry = (code: string) => CANONICAL.get(code);

/** Standard countries only: custom entries have their own editor. */
export const canOverrideEntry = (code: string) => CANONICAL.has(code);

/** A standard country's own flag, as the flag picker names it. */
export const defaultEntryFlag = (code: string) =>
  `/flags/${code.toLowerCase()}.svg`;

const LOCAL_FLAG = /^\/flags\/([a-z0-9-]+)\.svg$/;
const IMAGE_URL = /^https?:\/\/\S+$/i;

/**
 * The code whose flag files a `/flags/<code>.svg` path names, or null for
 * anything else (presets, uploads, links). Lets an overridden flag keep the
 * theme's round, square and heart versions of that country's flag.
 */
export const countryFlagCode = (flag: string | undefined): string | null => {
  const match = flag ? LOCAL_FLAG.exec(flag) : null;
  const code = match?.[1].toUpperCase();

  return code && CANONICAL.has(code) ? code : null;
};

const isAllowedFlag = (flag: string) =>
  flag.length <= FLAG_URL_MAX &&
  (LOCAL_FLAG.test(flag) || IMAGE_URL.test(flag));

/**
 * What an override keeps once a form or a file hands it over: a trimmed
 * name and a usable flag, each only when it differs from the built-in one.
 * Null when nothing differs (the country is shown as it ships).
 */
export const normalizeEntryOverride = (
  code: string,
  draft: { name?: unknown; flag?: unknown } | null | undefined,
): EntryOverride | null => {
  const canonical = CANONICAL.get(code);

  if (!canonical || !draft) return null;

  const name =
    typeof draft.name === 'string'
      ? draft.name.trim().slice(0, ENTRY_OVERRIDE_NAME_MAX)
      : '';
  const flag = typeof draft.flag === 'string' ? draft.flag.trim() : '';
  const out: EntryOverride = {};

  if (name && name !== canonical.name) out.name = name;
  if (flag && flag !== defaultEntryFlag(code) && isAllowedFlag(flag)) {
    out.flag = flag;
  }

  return out.name || out.flag ? out : null;
};

/** Valid overrides from anything (a saved contest, persisted state). */
export const sanitizeEntryOverrides = (value: unknown): EntryOverrides => {
  const out: EntryOverrides = {};

  if (!value || typeof value !== 'object' || Array.isArray(value)) return out;

  Object.entries(value as Record<string, unknown>).forEach(([code, raw]) => {
    if (!raw || typeof raw !== 'object') return;

    const override = normalizeEntryOverride(code, raw);

    if (override) out[code] = override;
  });

  return out;
};

/**
 * Names countries competed under before they changed, by code: the name is
 * used for contests set in `until` or earlier (the `useHistoricalNames`
 * setting). The year is the last edition with the old name:
 * - MK: "F.Y.R. Macedonia" until the Prespa agreement took effect in 2019
 *   (Eurovision and Junior Eurovision 2018 still used it).
 * - CZ: "Czech Republic" until the broadcaster switched to "Czechia" for 2023.
 * - TR: "Turkey" until "Türkiye" in mid-2022, after that year's contest.
 */
export const HISTORICAL_NAMES: Readonly<
  Record<string, readonly { until: number; name: string }[]>
> = {
  MK: [{ until: 2018, name: 'F.Y.R. Macedonia' }],
  CZ: [{ until: 2022, name: 'Czech Republic' }],
  TR: [{ until: 2022, name: 'Turkey' }],
};

/** The historical names for a contest set in `year` (none without one). */
export const historicalNamesFor = (
  year: number | null | undefined,
): EntryOverrides => {
  const out: EntryOverrides = {};

  if (!year || !Number.isFinite(year)) return out;

  Object.entries(HISTORICAL_NAMES).forEach(([code, names]) => {
    // The earliest period that still covers the year.
    const match = [...names]
      .sort((a, b) => a.until - b.until)
      .find((entry) => year <= entry.until);

    if (match) out[code] = { name: match.name };
  });

  return out;
};

/**
 * The overrides a new contest (another edition) starts with: the edition's
 * historical names when the setting is on, then the account's own defaults,
 * which win field by field (a default with only a flag keeps the historical
 * name). Seeded once, so a saved contest keeps what it was saved with.
 */
export const freshEntryOverrides = ({
  year,
  historicalNames,
  defaults,
}: {
  year: number | null | undefined;
  historicalNames: boolean;
  defaults: unknown;
}): EntryOverrides => {
  const out: EntryOverrides = historicalNames ? historicalNamesFor(year) : {};

  Object.entries(sanitizeEntryOverrides(defaults)).forEach(
    ([code, override]) => {
      const merged = normalizeEntryOverride(code, {
        ...out[code],
        ...override,
      });

      if (merged) out[code] = merged;
    },
  );

  return out;
};

/**
 * Moves a contest from one set of historical names to another (the setting
 * turned on or off, Next year crossing 2019): a name that is the old period's
 * goes, a country without a name of its own gets the new period's. Names the
 * user picked and every flag stay.
 */
export const rebaseHistoricalNames = (
  overrides: EntryOverrides,
  from: EntryOverrides,
  to: EntryOverrides,
): EntryOverrides => {
  const out: EntryOverrides = { ...overrides };

  Object.entries(from).forEach(([code, { name }]) => {
    const current = out[code];

    if (!current || current.name !== name) return;

    const rest = normalizeEntryOverride(code, { flag: current.flag });

    if (rest) out[code] = rest;
    else delete out[code];
  });

  Object.entries(to).forEach(([code, { name }]) => {
    const current = out[code];

    if (current?.name) return;

    const next = normalizeEntryOverride(code, { ...current, name });

    if (next) out[code] = next;
  });

  return out;
};

/**
 * The account's defaults with `code` set to `override`, or removed (null,
 * or nothing that differs from the built-in country).
 */
export const withEntryOverrideDefault = (
  defaults: unknown,
  code: string,
  override: { name?: string; flag?: string } | null,
): EntryOverrides => {
  const out = sanitizeEntryOverrides(defaults);
  const normalized = normalizeEntryOverride(code, override);

  if (normalized) out[code] = normalized;
  else delete out[code];

  return out;
};

/** Whether two overrides show a country the same way (absent = as it ships). */
export const sameEntryOverride = (
  a: EntryOverride | null | undefined,
  b: EntryOverride | null | undefined,
) =>
  (a?.name ?? null) === (b?.name ?? null) &&
  (a?.flag ?? null) === (b?.flag ?? null);

/**
 * `country` as the contest shows it. With `previous` (the override it was
 * drawn with), a name or flag that override set and `override` no longer
 * does goes back to the built-in one. Returns the same object when nothing
 * changes; custom entries always pass through.
 */
export const applyEntryOverride = <T extends EntryLike>(
  country: T,
  override: EntryOverride | undefined,
  previous?: EntryOverride,
): T => {
  const canonical = CANONICAL.get(country.code);

  if (!canonical) return country;

  const name =
    override?.name ?? (previous?.name ? canonical.name : country.name);
  const flag = override?.flag ?? (previous?.flag ? undefined : country.flag);

  if (name === country.name && flag === country.flag) return country;

  const next: EntryLike = { ...country, name };

  if (flag) next.flag = flag;
  else delete next.flag;

  return next as T;
};

/** A list with each country's override applied; the same list when none applies. */
export const withEntryOverrides = <T extends EntryLike>(
  countries: readonly T[],
  overrides: EntryOverrides,
): T[] => {
  if (Object.keys(overrides).length === 0) return countries as T[];

  let changed = false;
  const out = countries.map((country) => {
    const next = applyEntryOverride(country, overrides[country.code]);

    if (next !== country) changed = true;

    return next;
  });

  return changed ? out : (countries as T[]);
};

/** The codes whose override differs between two maps. */
export const changedEntryOverrideCodes = (
  previous: EntryOverrides,
  next: EntryOverrides,
): string[] =>
  [...new Set([...Object.keys(previous), ...Object.keys(next)])].filter(
    (code) => !sameEntryOverride(previous[code], next[code]),
  );

/**
 * Re-draws every copy of the changed countries in `stages` (participants
 * and voters) after the overrides went from `previous` to `next`. Stages
 * and lists nothing changed in keep their identity.
 */
export const reapplyEntryOverridesToStages = <S extends EventStage>(
  stages: S[],
  previous: EntryOverrides,
  next: EntryOverrides,
): S[] => {
  const changed = new Set(changedEntryOverrideCodes(previous, next));

  if (changed.size === 0) return stages;

  const fix = <T extends EntryLike>(list: T[] | undefined): T[] | undefined => {
    if (!list) return list;

    let touched = false;
    const out = list.map((country) => {
      if (!changed.has(country.code)) return country;

      const redrawn = applyEntryOverride(
        country,
        next[country.code],
        previous[country.code],
      );

      if (redrawn !== country) touched = true;

      return redrawn;
    });

    return touched ? out : list;
  };

  let touchedStages = false;
  const out = stages.map((stage) => {
    const countries = fix(stage.countries);
    const votingCountries = fix(stage.votingCountries);

    if (
      countries === stage.countries &&
      votingCountries === stage.votingCountries
    ) {
      return stage;
    }

    touchedStages = true;

    return {
      ...stage,
      countries: countries ?? [],
      ...(votingCountries ? { votingCountries } : {}),
    };
  });

  return touchedStages ? out : stages;
};
