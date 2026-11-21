import { languageTag } from '@/i18n/catalog';
import { BaseCountry } from '@/models';
import { CountryOdds } from '@/state/countriesStore';

/** The highest odds a field takes. The engine reads them as weights. */
export const MAX_ODDS = 1000;

/** What a country without odds of its own counts as. */
export const DEFAULT_ODDS = 50;

export type OddsChannel = 'jury' | 'televote';

export const oddsKey = (channel: OddsChannel) =>
  channel === 'jury' ? ('juryOdds' as const) : ('televoteOdds' as const);

const formatters = new Map<string, Intl.NumberFormat>();

/**
 * Odds as the user's language writes them: "41.5" in English, "41,5" in
 * German, in both the table and the ranking. Empty for no value.
 */
export const formatOdds = (value: number | undefined, locale: string) => {
  if (value === undefined || !Number.isFinite(value)) return '';

  const tag = languageTag(locale);
  let formatter = formatters.get(tag);

  if (!formatter) {
    formatter = new Intl.NumberFormat(tag, {
      maximumFractionDigits: 2,
      useGrouping: false,
    });
    formatters.set(tag, formatter);
  }

  return formatter.format(value);
};

export type ParsedOdds =
  | { ok: true; value: number | undefined }
  | { ok: false; tooHigh: boolean };

/**
 * Reads a typed value with either decimal mark ("41.5" or "41,5"). Empty
 * means no odds of its own (counts as 50). A half-typed "41." reads as 41.
 */
export const parseOdds = (text: string): ParsedOdds => {
  const trimmed = text.trim();

  if (trimmed === '') return { ok: true, value: undefined };

  if (!/^\d*(?:[.,]\d*)?$/.test(trimmed) || !/\d/.test(trimmed)) {
    return { ok: false, tooHigh: false };
  }

  const value = Number(trimmed.replace(',', '.'));

  if (!Number.isFinite(value)) return { ok: false, tooHigh: false };
  if (value > MAX_ODDS) return { ok: false, tooHigh: true };

  return { ok: true, value };
};

export type OddsSort = 'name' | OddsChannel;

/**
 * The table's row order: names A–Z, or a channel's odds highest first (ties
 * by name). Taken when a header is clicked, never while typing.
 */
export const sortCountryCodes = (
  countries: BaseCountry[],
  countryOdds: CountryOdds,
  sort: OddsSort,
  locale: string,
): string[] => {
  const collator = new Intl.Collator(languageTag(locale));
  const byName = (a: BaseCountry, b: BaseCountry) =>
    collator.compare(a.name, b.name);

  if (sort === 'name') {
    return [...countries].sort(byName).map((c) => c.code);
  }

  const key = oddsKey(sort);
  const oddsOf = (c: BaseCountry) => countryOdds[c.code]?.[key] ?? DEFAULT_ODDS;

  return [...countries]
    .sort((a, b) => oddsOf(b) - oddsOf(a) || byName(a, b))
    .map((c) => c.code);
};

/** `codes` with the item at `from` moved to `to`. */
export const moveCode = (codes: string[], from: number, to: number) => {
  const next = [...codes];
  const [moved] = next.splice(from, 1);

  next.splice(to, 0, moved);

  return next;
};
