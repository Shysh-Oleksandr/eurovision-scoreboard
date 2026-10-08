import { describe, expect, it } from 'vitest';

import { parseDesign } from '../model/design';
import { findElement } from '../model/elements';

import { EDITOR_TEMPLATES } from './editor';
import {
  applyTemplateField,
  getFieldValue,
  resolveTemplateFields,
  templateFieldCandidates,
} from './fields';

const ctx = { title: 'Eurovision 2026', subtitle: 'Grand Final' };

describe('built-in templates', () => {
  it.each(EDITOR_TEMPLATES.map((t) => [t.id, t] as const))(
    '%s is a valid design whose fields all resolve',
    (_, template) => {
      const design = parseDesign(template.build(ctx));
      const declared = design.templateFields ?? [];
      const resolved = resolveTemplateFields(design);

      expect(resolved).toHaveLength(declared.length);
      resolved.forEach((f) => expect(f.value).not.toBeUndefined());
    },
  );

  it('exposes text, data source and size candidates for the results template', () => {
    const design = EDITOR_TEMPLATES.find((t) => t.id === 'results')!.build(ctx);
    const paths = templateFieldCandidates(design)
      .flatMap((g) => g.items)
      .map((c) => c.path);

    expect(paths).toContain('el.title.text');
    expect(paths).toContain('el.scoreboard.limit');
    expect(paths).toContain('data');
    expect(paths).toContain('canvas.size');
    // The scoreboard auto-fits, so columns / row size are not offered.
    expect(paths).not.toContain('el.scoreboard.columns');
    expect(paths).not.toContain('el.scoreboard.itemSize');
  });
});

describe('applyTemplateField', () => {
  const design = EDITOR_TEMPLATES.find((t) => t.id === 'results')!.build(ctx);

  it('sets element properties by id', () => {
    const next = applyTemplateField(design, 'el.title.text', 'Hello');

    expect(getFieldValue(next, 'el.title.text')).toBe('Hello');
    expect(findElement(design.elements, 'title')?.el).toMatchObject({
      text: 'Eurovision 2026',
    });
  });

  it('resizes the canvas from a "WxH" value', () => {
    const next = applyTemplateField(design, 'canvas.size', '1080x1080');

    expect(next.canvas.width).toBe(1080);
    expect(next.canvas.height).toBe(1080);
    expect(getFieldValue(next, 'canvas.size')).toBe('1080x1080');
  });

  it('switches the data source', () => {
    const next = applyTemplateField(design, 'data', {
      source: 'contest',
      contestId: 'abc',
      contestName: 'Nordic Vision',
    });

    expect(next.data).toEqual({
      source: 'contest',
      contestId: 'abc',
      contestName: 'Nordic Vision',
    });
  });

  it('ignores unknown paths', () => {
    expect(applyTemplateField(design, 'el.nope.text', 'x')).toBe(design);
    expect(applyTemplateField(design, 'bogus', 'x')).toBe(design);
  });
});
