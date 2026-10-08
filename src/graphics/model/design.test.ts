import { describe, expect, it } from 'vitest';

import { buildResultsDesign } from '../templates/results';
import { buildStatsDesign } from '../templates/stats';

import { Design, isStack, parseDesign, walkElements } from './design';
import {
  canonicalize,
  deserializeDesign,
  getAtPath,
  serializeDesign,
  setAtPath,
} from './serialize';

import { StatsTableType } from '@/models';
import {
  DEFAULT_IMAGE_CUSTOMIZATION,
  ShareImageAspectRatio,
} from '@/state/generalStore';

const resultsDesign = () =>
  buildResultsDesign({
    settings: {
      ...DEFAULT_IMAGE_CUSTOMIZATION,
      title: 'Eurovision 2026',
      subtitle: 'Final Results - Grand Final',
      aspectRatio: ShareImageAspectRatio.LANDSCAPE,
      layout: 3,
      maxCountries: 10,
    },
    showPoints: true,
    statusMode: 'live',
    dataSource: 'live',
  });

describe('design model', () => {
  it('built-in results template is a valid design', () => {
    const design = resultsDesign();
    const parsed = parseDesign(design);

    expect(parsed.canvas.width).toBe(1200);
    expect(parsed.canvas.height).toBe(630);
    expect(parsed.elements).toHaveLength(1);
    const [root] = parsed.elements;

    expect(isStack(root) && root.fillCanvas).toBe(true);
    const ids: string[] = [];

    walkElements(parsed.elements, (el) => ids.push(el.id));
    expect(ids).toEqual([
      'layout',
      'title',
      'subtitle',
      'scoreboard',
      'branding',
    ]);
  });

  it('omits title/subtitle elements when empty', () => {
    const design = buildResultsDesign({
      settings: { ...DEFAULT_IMAGE_CUSTOMIZATION, title: '', subtitle: '' },
      showPoints: false,
      statusMode: 'uniform',
      dataSource: 'provided',
    });
    const ids: string[] = [];

    walkElements(design.elements, (el) => ids.push(el.id));
    expect(ids).toEqual(['layout', 'scoreboard', 'branding']);
    expect(design.data.source).toBe('provided');
  });

  it('built-in stats template is a valid, auto-sized design', () => {
    const design = parseDesign(
      buildStatsDesign({
        title: 'Stats',
        table: StatsTableType.SPLIT,
        showBackgroundImage: true,
        backgroundOpacity: 0.3,
        measuredWidth: 1000,
      }),
    );

    expect(design.canvas.autoSize).toBe(true);
    expect(design.canvas.background.map((f) => f.kind)).toEqual([
      'theme-surface',
      'theme-bg',
    ]);
    expect(getAtPath(design, 'elements.0.children.0.fontSize')).toBe(40);
    expect(getAtPath(design, 'elements.0.children.2.fontSize')).toBe(22);
  });

  it('fills defaults and rejects unknown element types', () => {
    const minimal = {
      id: 'd',
      name: 'n',
      version: 1,
      canvas: { width: 10, height: 10 },
      elements: [{ id: 't', type: 'text', text: 'x', fontSize: 12 }],
      data: { source: 'live' },
    };
    const parsed = parseDesign(minimal);

    expect(parsed.canvas.background).toEqual([]);
    expect(getAtPath(parsed, 'elements.0.fontWeight')).toBe(700);
    expect(getAtPath(parsed, 'elements.0.opacity')).toBe(1);
    expect(() =>
      parseDesign({
        ...minimal,
        elements: [{ id: 'z', type: 'video', src: 'x' }],
      }),
    ).toThrow();
  });

  it('serialises canonically and round-trips', () => {
    const design = resultsDesign();
    const text = serializeDesign(design);
    const back = deserializeDesign(text);

    expect(serializeDesign(back)).toBe(text);
    expect(canonicalize({ b: 1, a: { d: 2, c: undefined } })).toEqual({
      a: { d: 2 },
      b: 1,
    });
  });

  it('setAtPath copies every container on the path', () => {
    const design = resultsDesign();
    const next = setAtPath<Design>(
      design,
      'elements.0.children.0.text',
      'Changed',
    );

    expect(getAtPath(next, 'elements.0.children.0.text')).toBe('Changed');
    expect(getAtPath(design, 'elements.0.children.0.text')).toBe(
      'Eurovision 2026',
    );
    expect(next.elements).not.toBe(design.elements);
    expect(next.elements[0]).not.toBe(design.elements[0]);
  });
});
