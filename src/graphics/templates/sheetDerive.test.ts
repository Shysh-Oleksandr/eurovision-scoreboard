import { describe, expect, it } from 'vitest';

import { EDITOR_TEMPLATES } from './editor';
import { applyTemplateField, getFieldValue } from './fields';

const ctx = { title: 'Contest 2026', subtitle: 'Grand Final' };

/**
 * The template sheet derives its design from the template plus the field
 * values applied in order, so re-fitting the canvas never compounds.
 */
describe('template sheet derivation', () => {
  it('round-trips the canvas size without shrinking text', () => {
    const base = EDITOR_TEMPLATES.find((t) => t.id === 'results')!.build(ctx);
    const font = (d: typeof base) => getFieldValue(d, 'el.title.fontSize');
    const derive = (size: string) =>
      applyTemplateField(
        applyTemplateField(base, 'el.title.text', 'Hello'),
        'canvas.size',
        size,
      );

    const portrait = derive('1080x1350');
    const back = derive('1200x630');

    expect(font(portrait)).not.toBe(font(base));
    expect(font(back)).toBe(font(base));
    expect(getFieldValue(back, 'el.title.text')).toBe('Hello');
  });

  it('exposes image sources as fields', () => {
    const poster = EDITOR_TEMPLATES.find((t) => t.id === 'poster')!.build(ctx);
    const next = applyTemplateField(poster, 'el.logo.src', 'https://x/y.png');

    expect(getFieldValue(next, 'el.logo.src')).toBe('https://x/y.png');
  });
});
