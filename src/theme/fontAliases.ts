/** Stored on custom themes; drives `html[data-font]` and `--dp-font-family`. */
export const DEFAULT_FONT_ALIAS = 'montserrat';

/** Aliases allowed by API, CSS `html[data-font]`, and FOUC script — keep in sync. */
export const FONT_ALIAS_ALLOWLIST = [
  'montserrat',
  'gotham',
  'zodiak',
  'brygada-1918',
  'oxanium',
  'orbitron',
  'unbounded',
  'geist',
  'dm-sans',
  'plus-jakarta-sans',
  'antonio',
  'satoshi',
  'cabinet-grotesk',
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
/** Display labels for font selects (theme builder, UI preferences). */
export const FONT_OPTION_LABELS: Record<FontAlias, string> = {
  montserrat: 'Montserrat (Default)',
  gotham: 'Gotham',
  orbitron: 'Orbitron',
  'brygada-1918': 'Brygada 1918',
  zodiak: 'Zodiak',
  oxanium: 'Oxanium',
  unbounded: 'Unbounded',
  geist: 'Geist',
  'dm-sans': 'DM Sans',
  'plus-jakarta-sans': 'Plus Jakarta Sans',
  antonio: 'Antonio',
  satoshi: 'Satoshi',
  'cabinet-grotesk': 'Cabinet Grotesk',
};

export function getInterfaceFontSelectOptions(): Array<{
  value: string;
  label: string;
}> {
  return FONT_ALIAS_ALLOWLIST.map((value) => ({
    value,
    label: FONT_OPTION_LABELS[value] ?? value,
  }));
}

export type ResolveActiveFontAliasInput = {
  overrideEnabled: boolean;
  overrideAlias?: string | null;
  themeAlias?: string | null;
};

/** Which font alias should apply to the document (override wins over active theme). */
export function resolveActiveFontAlias({
  overrideEnabled,
  overrideAlias,
  themeAlias,
}: ResolveActiveFontAliasInput): string {
  if (overrideEnabled) {
    return normalizeFontAlias(overrideAlias);
  }

  if (themeAlias) {
    return normalizeFontAlias(themeAlias);
  }

  return DEFAULT_FONT_ALIAS;
}

/** Sets `html[data-font]` so global CSS loads the matching `@font-face` files. */
export function applyDocumentFontAlias(alias: string): void {
  if (typeof document === 'undefined') return;

  document.documentElement.dataset.font = normalizeFontAlias(alias);
}

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
    case 'antonio':
      return 'Antonio, sans-serif';
    case 'brygada-1918':
      return '"Brygada 1918", serif';
    case 'cabinet-grotesk':
      return '"Cabinet Grotesk", sans-serif';
    case 'orbitron':
      return 'Orbitron, sans-serif';
    case 'oxanium':
      return 'Oxanium, sans-serif';
    case 'satoshi':
      return 'Satoshi, sans-serif';
    case 'zodiak':
      return 'Zodiak, serif';
    default:
      return 'montserrat, sans-serif';
  }
}
