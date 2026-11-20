import { readFileSync } from 'fs';
import path from 'path';

import { describe, expect, it } from 'vitest';

import {
  DOUZE_SPEC_MODES,
  getDouzeMoveDelayMs,
  getDouzeOptionsSupport,
  getDouzeSpec,
} from './registry';

import { SUPPORTED_LOCALES } from '@/i18n/catalog';
import { DOUZE_POINTS_ANIMATION_MODES } from '@/theme/themeSpecifics';

/**
 * Checks every registered spec, so a new animation gets them by being
 * registered (the add-douze-animation skill).
 */
describe.each(DOUZE_SPEC_MODES)('the %s spec', (mode) => {
  const spec = getDouzeSpec(mode)!;

  it('is registered under its own id, as a mode themes may store', () => {
    expect(spec.id).toBe(mode);
    // Without it, sanitizeThemeSpecifics drops the mode from themes.
    expect(DOUZE_POINTS_ANIMATION_MODES).toContain(mode);
  });

  it('has unique layers that stay inside its duration', () => {
    const ids = spec.layers.map((layer) => layer.id);

    expect(new Set(ids).size).toBe(ids.length);
    spec.layers.forEach((layer) => {
      layer.keyframes.forEach((frame) => {
        expect(frame.t).toBeGreaterThanOrEqual(0);
        expect(frame.t).toBeLessThanOrEqual(spec.durationMs);
      });
    });
  });

  it('defines every colour it uses', () => {
    const used = new Set(
      [...JSON.stringify(spec.layers).matchAll(/var\(--douze-([\w-]+)\)/g)].map(
        (match) => match[1],
      ),
    );

    used.forEach((key) => expect(spec.palette).toHaveProperty(key));
    // The fallback when the row's colours can't be read.
    if (spec.paletteFrom) {
      ['c1', 'c2', 'c3', 'glow'].forEach((key) =>
        expect(spec.palette).toHaveProperty(key),
      );
    }
  });

  it('clips every layer that uses a window or cuts', () => {
    // Both are ignored without clipTo.
    spec.layers.forEach((layer) => {
      const usesWindow = layer.keyframes.some(
        (frame) =>
          frame.windowLeft !== undefined || frame.windowRight !== undefined,
      );

      if (usesWindow || layer.cutBy) {
        expect(layer.clipTo, layer.id).toBeTruthy();
      }
    });
  });

  it('keeps the parts it takes over on low-performance devices', () => {
    // A copy that hides the real part is part of the row, not decoration.
    spec.layers
      .filter((layer) => layer.kind === 'clone' && layer.hideSource)
      .forEach((layer) => expect(layer.heavy, layer.id).toBeFalsy());
  });

  it('lists every part its layers belong to, and only those', () => {
    const groups = new Set(
      spec.layers.map((layer) => layer.group).filter(Boolean),
    );

    expect([...groups].sort()).toEqual([...(spec.parts ?? [])].sort());
  });

  it('makes the board wait for it when the row climbs afterwards', () => {
    if (spec.reorder === 'after') {
      expect(getDouzeMoveDelayMs(mode)).toBeGreaterThan(spec.durationMs);
    }
  });
});

describe('douze modes', () => {
  it('leaves the hand-written variants to their components', () => {
    expect(getDouzeSpec('heartsGrid')).toBeNull();
    expect(getDouzeMoveDelayMs('heartsGrid')).toBe(1000);
  });

  it('all have something to customize', () => {
    DOUZE_POINTS_ANIMATION_MODES.forEach((mode) =>
      expect(getDouzeOptionsSupport(mode), mode).not.toBeNull(),
    );
  });

  it('have labels in every language (the theme editor lists them all)', () => {
    const messagesDir = path.join(__dirname, '..', '..', 'messages');

    SUPPORTED_LOCALES.forEach((locale) => {
      const messages = JSON.parse(
        readFileSync(path.join(messagesDir, `${locale}.json`), 'utf8'),
      );
      const labels =
        messages.widgets?.themes?.visualDetails?.douzePointsAnimations ?? {};

      DOUZE_POINTS_ANIMATION_MODES.forEach((mode) =>
        expect(labels[mode], `${locale}: ${mode}`).toEqual(expect.any(String)),
      );

      // The parts a custom theme can switch off (Customize animation).
      const partLabels =
        messages.widgets?.themes?.visualDetails?.douzeOptions?.parts ?? {};

      DOUZE_POINTS_ANIMATION_MODES.forEach((mode) =>
        getDouzeOptionsSupport(mode)?.parts.forEach((part) =>
          expect(partLabels[part], `${locale}: ${part}`).toEqual(
            expect.any(String),
          ),
        ),
      );

      if (
        DOUZE_POINTS_ANIMATION_MODES.some(
          (mode) => getDouzeOptionsSupport(mode)?.coverFlag,
        )
      ) {
        expect(
          messages.widgets?.themes?.visualDetails?.douzeOptions?.coverFlag,
          `${locale}: coverFlag`,
        ).toEqual(expect.any(String));
      }

      // The theme colours each animation shows there.
      const colorLabels =
        messages.widgets?.themes?.visualDetails?.douzeOptions?.colorFields ??
        {};

      DOUZE_POINTS_ANIMATION_MODES.forEach((mode) =>
        getDouzeOptionsSupport(mode)?.themeColors.forEach(({ label }) =>
          expect(colorLabels[label], `${locale}: ${label}`).toEqual(
            expect.any(String),
          ),
        ),
      );
    });
  });
});
