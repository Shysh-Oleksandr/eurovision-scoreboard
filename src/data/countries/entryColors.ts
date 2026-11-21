/**
 * A custom entry's own colours (`BaseCountry.colors`): one to three
 * `#rrggbb` colours, in the order a flag would give them (main colour
 * first). Wherever the app reads a country's colours from its flag (the
 * douze animations' flag colours, the winner's confetti), a custom entry
 * with colours uses these instead, so entries whose flag can't be read
 * (uploads and links on another origin) get colours too. Saved with the
 * entry and in contests' `customEntriesUsed`; the backend's
 * `normalizeEntryColors` (custom-entries/dto/entry-colors.ts) keeps the
 * same rules.
 *
 * Looked up by `code` in `customCountries`, like the short codes: line-up
 * and stage copies made before an edit don't carry the field.
 */
export const ENTRY_COLORS_MAX = 3;

const HEX = /^#[0-9a-f]{6}$/i;

/**
 * Valid colours from anything (a saved contest, an API response): lower
 * case, at most three, undefined when there are none.
 */
export const sanitizeEntryColors = (value: unknown): string[] | undefined => {
  if (!Array.isArray(value)) return undefined;

  const colors = value
    .filter(
      (color): color is string => typeof color === 'string' && HEX.test(color),
    )
    .slice(0, ENTRY_COLORS_MAX)
    .map((color) => color.toLowerCase());

  return colors.length > 0 ? colors : undefined;
};

const byCodeCache = new WeakMap<
  readonly { code: string; colors?: string[] }[],
  Map<string, string[]>
>();

/** The entries' colours keyed by `code`; one map per list (cached). */
export const getEntryColorsByCode = (
  entries: readonly { code: string; colors?: string[] }[],
): ReadonlyMap<string, string[]> => {
  let byCode = byCodeCache.get(entries);

  if (!byCode) {
    byCode = new Map();
    entries.forEach(({ code, colors }) => {
      const valid = sanitizeEntryColors(colors);

      if (valid) byCode!.set(code, valid);
    });
    byCodeCache.set(entries, byCode);
  }

  return byCode;
};
