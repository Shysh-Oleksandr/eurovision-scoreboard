/** Stored on custom themes; drives `html[data-font]` and `--dp-font-family`. */
export const DEFAULT_FONT_ALIAS = 'montserrat';

/** Aliases allowed by API, CSS `html[data-font]`, and FOUC script — keep in sync. */
export const FONT_ALIAS_ALLOWLIST = [
  'montserrat',
  'gotham',
  'geist',
  'dm-sans',
  'plus-jakarta-sans',
  'unbounded',
] as const;

export type FontAlias = (typeof FONT_ALIAS_ALLOWLIST)[number];

const KNOWN_ALIASES = new Set<string>(FONT_ALIAS_ALLOWLIST);

export function normalizeFontAlias(alias?: string | null): string {
  const raw = String(alias ?? DEFAULT_FONT_ALIAS)
    .toLowerCase()
    .trim();

  return KNOWN_ALIASES.has(raw) ? raw : DEFAULT_FONT_ALIAS;
}

/** Full `font-family` stack (matches `styles.css` `html[data-font]` rules). */
export function getFontFamilyStackCss(alias: string): string {
  switch (normalizeFontAlias(alias)) {
    case 'geist':
      return '"Geist Sans", sans-serif';
    case 'dm-sans':
      return '"DM Sans", sans-serif';
    case 'gotham':
      return 'Gotham, sans-serif';
    case 'plus-jakarta-sans':
      return '"Plus Jakarta Sans", sans-serif';
    case 'unbounded':
      return 'Unbounded, sans-serif';
    default:
      return 'montserrat, sans-serif';
  }
}
