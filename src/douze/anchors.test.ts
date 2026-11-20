import { afterEach, describe, expect, it } from 'vitest';

import { drawsOver, mirrorText, paintCopy } from './anchors';

const el = (
  style: Partial<CSSStyleDeclaration> = {},
  children: Element[] = [],
) => {
  const node = document.createElement('div');

  Object.assign(node.style, style);
  children.forEach((child) => node.appendChild(child));

  return node;
};

afterEach(() => {
  document.body.innerHTML = '';
});

describe('drawsOver', () => {
  it('follows the stacking levels of the two branches', () => {
    // A rounded 2026 row: the strip (z-21) lies over the points (z-15),
    // and inside the points the total (z-23) over the 12 box (z-20).
    const total = el({ position: 'relative', zIndex: '23' });
    const lastPoints = el({ position: 'relative', zIndex: '20' });
    const points = el({ position: 'relative', zIndex: '15' }, [
      el({}, [total, lastPoints]),
    ]);
    const flag = el();
    const strip = el({ position: 'relative', zIndex: '21' }, [flag]);

    document.body.appendChild(el({ position: 'relative' }, [strip, points]));

    expect(drawsOver(strip, total)).toBe(true);
    expect(drawsOver(total, strip)).toBe(false);
    expect(drawsOver(total, lastPoints)).toBe(true);
    expect(drawsOver(lastPoints, total)).toBe(false);
    // A part inside another paints over it.
    expect(drawsOver(flag, strip)).toBe(true);
  });

  it('puts positioned content over in-flow content, then goes by order', () => {
    // A square row: the strip is positioned without a z-index, the total
    // over it with one.
    const strip = el({ position: 'absolute' });
    const total = el({ position: 'absolute', zIndex: '20' });
    const plain = el();
    const later = el({ position: 'absolute' });

    document.body.appendChild(el({}, [plain, strip, total, later]));

    expect(drawsOver(total, strip)).toBe(true);
    expect(drawsOver(strip, total)).toBe(false);
    expect(drawsOver(strip, plain)).toBe(true);
    expect(drawsOver(later, strip)).toBe(true);
    expect(drawsOver(strip, later)).toBe(false);
  });
});

describe('paintCopy', () => {
  it('repaints the background, SVG shapes and all text', () => {
    const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
    const path = document.createElementNS('http://www.w3.org/2000/svg', 'path');

    svg.appendChild(path);

    const label = el({ color: 'white' });
    const copy = el({ background: 'navy' }, [svg, label]);

    paintCopy(copy, { fill: 'gold', text: 'black' });

    expect(copy.style.background).toBe('gold');
    expect(path.style.fill).toBe('gold');
    expect(label.style.color).toBe('black');
  });
});

describe('mirrorText', () => {
  it('keeps a copy counting up with its part until stopped', async () => {
    const label = el();

    label.textContent = '56';

    const source = el({}, [label]);
    const copy = source.cloneNode(true) as HTMLElement;
    const stop = mirrorText(source, copy);
    const settle = () => new Promise((resolve) => setTimeout(resolve, 0));

    // CountUp writes textContent on every tick.
    label.textContent = '62';
    await settle();
    expect(copy.textContent).toBe('62');

    stop();
    label.textContent = '68';
    await settle();
    expect(copy.textContent).toBe('62');
  });
});
