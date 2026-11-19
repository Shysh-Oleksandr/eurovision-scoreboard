import { BaseCountry } from '@/models';

/**
 * The preset flags. They ship in `public/flags`, and the backend saves them
 * as `https://cdn.douzepoints.app/custom-entries/presets/<file>` (its
 * `PRESET_FLAG_FILENAMES` must list the same files).
 */
export const PRESET_FLAGS = [
  { path: '/flags/world.svg', key: 'world' },
  { path: '/flags/earth.svg', key: 'earth' },
  { path: '/flags/floptropica.svg', key: 'floptropica' },
  { path: '/flags/neutral.svg', key: 'neutral' },
  { path: '/flags/lgbt.svg', key: 'rainbow' },
  { path: '/flags/neutrois.svg', key: 'neutrois' },
  { path: '/flags/aromantic.svg', key: 'aromantic' },
] as const;

export type PresetFlagKey = (typeof PRESET_FLAGS)[number]['key'];

/** What a new entry gets until another flag is picked. */
export const DEFAULT_FLAG = PRESET_FLAGS[0].path;

const PRESET_URL = /\/custom-entries\/presets\/([^/?#]+)$/;
const SITE_FLAG_URL =
  /^https?:\/\/(?:www\.)?douzepoints\.app(\/flags\/[^?#]+)$/;

/**
 * A saved flag URL as the picker names it: the backend turns preset and
 * country flags into absolute URLs, the picker works with their `/flags/`
 * paths (which the apps also have offline).
 */
export const toPickerFlag = (url: string | undefined): string => {
  if (!url) return '';

  const preset = PRESET_URL.exec(url);

  if (preset) return `/flags/${preset[1]}`;

  const site = SITE_FLAG_URL.exec(url);

  if (site) return site[1];

  return url;
};

export const isPresetFlag = (flag: string) =>
  PRESET_FLAGS.some((preset) => preset.path === flag);

/** A standard country's flag (`/flags/at.svg`), not a preset. */
export const isCountryFlag = (flag: string) =>
  flag.startsWith('/flags/') && !isPresetFlag(flag);

export const isImageLink = (value: string) => /^https?:\/\/\S+$/i.test(value);

export interface YourFlag {
  url: string;
  /** The entries that use it, for its label and the search. */
  names: string[];
  updatedAt: number;
}

/**
 * The flags of the user's custom entries that aren't presets or country
 * flags (those have their own tabs): uploads and image links, one per URL,
 * the most recently changed first.
 */
export const collectYourFlags = (entries: readonly BaseCountry[]) => {
  const byUrl = new Map<string, YourFlag>();

  entries.forEach((entry) => {
    const url = entry.flag;

    if (!url || toPickerFlag(url).startsWith('/flags/')) return;

    const updatedAt = entry.updatedAt ? Date.parse(entry.updatedAt) || 0 : 0;
    const known = byUrl.get(url);

    if (known) {
      known.names.push(entry.name);
      known.updatedAt = Math.max(known.updatedAt, updatedAt);
    } else {
      byUrl.set(url, { url, names: [entry.name], updatedAt });
    }
  });

  return [...byUrl.values()].sort((a, b) => b.updatedAt - a.updatedAt);
};
