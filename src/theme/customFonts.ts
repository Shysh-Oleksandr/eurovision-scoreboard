import { getFontFamilyStackCss, normalizeFontAlias } from './fontAliases';
import type { ActiveFonts, FontResolution } from './fontResolution';

import type { ThemeFontSnapshot } from '@/types/font';

/**
 * Runtime plumbing for uploaded fonts: `@font-face` generation/injection,
 * warm-up, and the single writer of the document's font CSS variables.
 *
 * The inline FOUC script in `src/app/layout.tsx` re-implements
 * `buildFontFaceCss` in plain JS — keep the two byte-for-byte identical so the
 * hydrated app finds the pre-injected <style> and leaves it alone.
 */

/** CSS family name for an uploaded font; namespaced so it can never collide with a bundled or system family. */
export const customFontFamilyName = (id: string): string => `dp-font-${id}`;

export const fontFacesStyleId = (id: string): string => `dp-font-faces-${id}`;

/** `'dp-font-<id>', <fallback stack>` — the fallback renders until the files arrive (or if they never do). */
export function getCustomFontFamilyCss(
  snapshot: ThemeFontSnapshot,
  fallbackAlias: string,
): string {
  return `'${customFontFamilyName(snapshot._id)}', ${getFontFamilyStackCss(
    normalizeFontAlias(fallbackAlias),
  )}`;
}

export function getFontResolutionFamilyCss(resolution: FontResolution): string {
  return resolution.kind === 'builtin'
    ? getFontFamilyStackCss(resolution.alias)
    : getCustomFontFamilyCss(resolution.snapshot, resolution.fallbackAlias);
}

const isSafeFontUrl = (url: unknown): url is string =>
  typeof url === 'string' && url.startsWith('https://') && !/["\\\s]/.test(url);

/** One `@font-face` per face, verbatim from the server-computed weight ranges. */
export function buildFontFaceCss(snapshot: ThemeFontSnapshot): string {
  const family = customFontFamilyName(snapshot._id);

  return (snapshot.faces ?? [])
    .filter((face) => isSafeFontUrl(face.url))
    .map((face) => {
      const format = face.format === 'woff' ? 'woff' : 'woff2';
      const [lo, hi] = face.weightRange ?? [face.weight, face.weight];

      return `@font-face{font-family:'${family}';src:url("${face.url}") format('${format}');font-weight:${lo} ${hi};font-style:normal;font-display:swap}`;
    })
    .join('\n');
}

/** Idempotent: creates `<style id="dp-font-faces-<id>">` once, refreshes it if the faces changed. */
export function ensureFontFacesInjected(snapshot: ThemeFontSnapshot): void {
  if (typeof document === 'undefined') return;

  const css = buildFontFaceCss(snapshot);

  if (!css) return;

  const id = fontFacesStyleId(snapshot._id);
  let style = document.getElementById(id) as HTMLStyleElement | null;

  if (!style) {
    style = document.createElement('style');
    style.id = id;
    document.head.appendChild(style);
  }

  if (style.textContent !== css) {
    style.textContent = css;
  }
}

export function removeInjectedFontFaces(id: string): void {
  if (typeof document === 'undefined') return;

  document.getElementById(fontFacesStyleId(id))?.remove();
}

const PRELOAD_WEIGHTS = [400, 500, 600, 700] as const;

/**
 * Kick off the downloads so faces are warm before the board first paints
 * with them (GSAP measures text geometry; a late swap would shift layout).
 */
export async function preloadFontFaces(
  snapshot: ThemeFontSnapshot,
): Promise<void> {
  if (typeof document === 'undefined' || !document.fonts?.load) return;

  const family = customFontFamilyName(snapshot._id);

  await Promise.allSettled(
    PRELOAD_WEIGHTS.map((weight) =>
      document.fonts.load(`${weight} 1em '${family}'`).catch(() => undefined),
    ),
  );
}

const UI_FAMILY_VAR = '--dp-font-family';
const UI_SYNTHESIS_VAR = '--dp-font-synthesis';
const SCOREBOARD_FAMILY_VAR = '--dp-scoreboard-font-family';
const SCOREBOARD_SYNTHESIS_VAR = '--dp-scoreboard-font-synthesis';

/**
 * Build the CSS variable map for a resolved font pair. Both scoreboard
 * variables are always set explicitly so a scoped block (editor preview, a
 * theme card) never inherits the *document's* scoreboard font by accident.
 */
export function getFontCssVars(
  fonts: ActiveFonts,
  options: { includeUi: boolean } = { includeUi: true },
): Record<string, string> {
  const vars: Record<string, string> = {};

  if (options.includeUi) {
    vars[UI_FAMILY_VAR] = getFontResolutionFamilyCss(fonts.ui);
    vars[UI_SYNTHESIS_VAR] =
      fonts.ui.kind === 'custom' ? 'none' : 'weight style';
  }

  vars[SCOREBOARD_FAMILY_VAR] = getFontResolutionFamilyCss(fonts.scoreboard);
  vars[SCOREBOARD_SYNTHESIS_VAR] =
    fonts.scoreboard.kind === 'custom' ? 'none' : 'weight style';

  return vars;
}

/** Inject faces (and start warming them) for every custom slot in a resolution. */
export function ensureFontsReady(fonts: ActiveFonts): void {
  for (const slot of [fonts.ui, fonts.scoreboard]) {
    if (slot.kind === 'custom') {
      ensureFontFacesInjected(slot.snapshot);
      void preloadFontFaces(slot.snapshot);
    }
  }
}

/**
 * The single writer of the document's font state. Everything goes inline on
 * `<html>` so it beats both the `html[data-font]` rules and the injected
 * custom-theme variable block; the FOUC script writes the same properties.
 */
export function applyDocumentFonts(fonts: ActiveFonts): void {
  if (typeof document === 'undefined') return;

  const root = document.documentElement;
  const { style } = root;

  if (fonts.ui.kind === 'builtin') {
    root.dataset.font = fonts.ui.alias;
    style.removeProperty(UI_FAMILY_VAR);
    style.removeProperty(UI_SYNTHESIS_VAR);
  } else {
    // The alias keeps `html[data-font]` pointing at the fallback family's
    // @font-face rules; the inline variable layers the custom family on top.
    root.dataset.font = fonts.ui.fallbackAlias;
    ensureFontFacesInjected(fonts.ui.snapshot);
    style.setProperty(
      UI_FAMILY_VAR,
      getCustomFontFamilyCss(fonts.ui.snapshot, fonts.ui.fallbackAlias),
    );
    style.setProperty(UI_SYNTHESIS_VAR, 'none');
    void preloadFontFaces(fonts.ui.snapshot);
  }

  if (fonts.scoreboardInherits) {
    style.removeProperty(SCOREBOARD_FAMILY_VAR);
    style.removeProperty(SCOREBOARD_SYNTHESIS_VAR);
  } else if (fonts.scoreboard.kind === 'builtin') {
    style.setProperty(
      SCOREBOARD_FAMILY_VAR,
      getFontFamilyStackCss(fonts.scoreboard.alias),
    );
    style.removeProperty(SCOREBOARD_SYNTHESIS_VAR);
  } else {
    ensureFontFacesInjected(fonts.scoreboard.snapshot);
    style.setProperty(
      SCOREBOARD_FAMILY_VAR,
      getCustomFontFamilyCss(
        fonts.scoreboard.snapshot,
        fonts.scoreboard.fallbackAlias,
      ),
    );
    style.setProperty(SCOREBOARD_SYNTHESIS_VAR, 'none');
    void preloadFontFaces(fonts.scoreboard.snapshot);
  }
}
