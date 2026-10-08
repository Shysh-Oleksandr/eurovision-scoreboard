import { describe, expect, it } from 'vitest';

import { Design } from '../model/design';
import { EDITOR_TEMPLATES } from '../templates/editor';

import { flattenStacks, hasStacks, visibleElementIds } from './flatten';
import { BoxMap } from './useElementBoxes';

const ctx = { title: 'Contest 2026', subtitle: 'Grand Final' };

const measure = (design: Design): BoxMap => {
  const boxes: BoxMap = new Map();
  let y = 10;

  visibleElementIds(design.elements).forEach((id) => {
    boxes.set(id, { x: 40, y, w: 500, h: 60, rotation: 0, inFlow: true });
    y += 70;
  });

  return boxes;
};

describe('flattenStacks', () => {
  it('replaces stacks with free elements at their measured boxes', () => {
    const results = EDITOR_TEMPLATES.find((t) => t.id === 'results')!.build(
      ctx,
    );

    expect(hasStacks(results)).toBe(true);
    const flat = flattenStacks(results, measure(results), null);

    expect(hasStacks(flat)).toBe(false);
    const title = flat.elements.find((el) => el.id === 'title')!;
    const scoreboard = flat.elements.find((el) => el.id === 'scoreboard')!;

    expect(title.type).toBe('text');
    expect(title.x).toBe(40);
    expect(title.w).toBe(500);
    expect(title.h).toBe(60);
    // Auto-fit: the measured box becomes the box its rows fit into.
    expect(scoreboard.w).toBe(500);
    expect(scoreboard.h).toBe(60);
  });

  it('leaves the height of a fixed scoreboard to its rows', () => {
    const results = EDITOR_TEMPLATES.find((t) => t.id === 'results')!.build(
      ctx,
    );
    const fixed: Design = {
      ...results,
      elements: results.elements.map((el) =>
        el.type === 'stack'
          ? {
              ...el,
              children: el.children.map((child) =>
                child.type === 'scoreboard'
                  ? { ...child, fit: 'fixed' as const }
                  : child,
              ),
            }
          : el,
      ),
    };
    const flat = flattenStacks(fixed, measure(fixed), null);
    const scoreboard = flat.elements.find((el) => el.id === 'scoreboard')!;

    expect(scoreboard.w).toBe(500);
    expect(scoreboard.h).toBeUndefined();
  });

  it('turns a content-sized canvas into a fixed one at the measured size', () => {
    const stats = EDITOR_TEMPLATES.find((t) => t.id === 'stats')!.build(ctx);
    const flat = flattenStacks(stats, measure(stats), {
      width: 1234,
      height: 777,
    });

    expect(flat.canvas.autoSize).toBe(false);
    expect(flat.canvas.width).toBe(1234);
    expect(flat.canvas.height).toBe(777);
    expect(flat.elements.find((el) => el.type === 'stats')?.w).toBeUndefined();
  });

  it('leaves stack-free designs untouched', () => {
    const blank = EDITOR_TEMPLATES[0].build(ctx);

    expect(flattenStacks(blank, new Map(), null)).toBe(blank);
  });
});
