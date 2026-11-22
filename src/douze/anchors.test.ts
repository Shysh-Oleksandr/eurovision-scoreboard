import { afterEach, describe, expect, it, vi } from 'vitest';

import {
  buildCutMask,
  drawsOver,
  mirrorText,
  paintCopy,
  resizeType,
  shownTextOf,
  typeStyleOf,
} from './anchors';

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
  vi.restoreAllMocks();
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

  it("wins over the part's own important classes", () => {
    // A custom theme's transparent points carry `!bg-transparent`: a
    // normal inline background would leave the gold copy clear.
    const label = el();
    const copy = el({}, [label]);

    paintCopy(copy, { fill: 'gold', text: 'black' });

    expect(copy.style.getPropertyPriority('background')).toBe('important');
    expect(label.style.getPropertyPriority('color')).toBe('important');
  });
});

describe('buildCutMask', () => {
  /** Lays elements out at fixed boxes (jsdom has no layout). */
  const layOut = (boxes: Map<Element, [number, number, number, number]>) => {
    vi.spyOn(Element.prototype, 'getBoundingClientRect').mockImplementation(
      function (this: Element) {
        const [x, y, w, h] = boxes.get(this) ?? [0, 0, 0, 0];

        return new DOMRect(x, y, w, h);
      },
    );
  };
  const holes = (mask: string | null) =>
    mask === null
      ? 0
      : (decodeURIComponent(mask).match(/<path /g) ?? []).length;

  const setUp = (coverStyle: Partial<CSSStyleDeclaration>) => {
    // The 12 box's copy (100 × 40) and the total over its left end, with
    // no background image, as browsers report it (jsdom leaves it empty).
    const wrapper = el();
    const cover = el({ backgroundImage: 'none', ...coverStyle });

    Object.defineProperty(wrapper, 'offsetWidth', { value: 100 });
    Object.defineProperty(wrapper, 'offsetHeight', { value: 40 });
    document.body.append(wrapper, cover);
    layOut(
      new Map([
        [wrapper, [0, 0, 100, 40]],
        [cover, [-60, 0, 80, 40]],
      ]),
    );

    return { wrapper, cover };
  };

  it('cuts a cover whose colour has no blue', () => {
    // rgb(128, 0, 0) once read as a clear colour (its last number is 0),
    // so the 12 box copies covered a dark red total's round end.
    const { wrapper, cover } = setUp({ backgroundColor: 'rgb(128, 0, 0)' });

    expect(holes(buildCutMask(wrapper, [cover]))).toBe(1);
  });

  it('cuts a clear cover too, so its text stays readable', () => {
    // A custom theme's transparent points: the gold passing under them
    // must not hide their text.
    const { wrapper, cover } = setUp({ backgroundColor: 'transparent' });

    expect(holes(buildCutMask(wrapper, [cover]))).toBe(1);
  });

  it('cuts nothing when no cover overlaps', () => {
    const wrapper = el();
    const cover = el({ backgroundColor: 'navy' });

    Object.defineProperty(wrapper, 'offsetWidth', { value: 100 });
    Object.defineProperty(wrapper, 'offsetHeight', { value: 40 });
    document.body.append(wrapper, cover);
    layOut(
      new Map([
        [wrapper, [0, 0, 100, 40]],
        [cover, [200, 0, 80, 40]],
      ]),
    );

    expect(buildCutMask(wrapper, [cover])).toBeNull();
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

describe('typeStyleOf', () => {
  it("takes a part's type as an inline style, without its colour", () => {
    // The 2024 "12 POINTS" set like the row's names.
    const name = el({
      fontFamily: 'Gotham, sans-serif',
      fontSize: '18px',
      fontWeight: '700',
      letterSpacing: '0.5px',
      textTransform: 'uppercase',
      color: 'rgb(255, 255, 255)',
    });

    document.body.appendChild(name);

    expect(typeStyleOf(name)).toMatchObject({
      fontFamily: 'Gotham, sans-serif',
      fontSize: '18px',
      fontWeight: '700',
      letterSpacing: '0.5px',
      textTransform: 'uppercase',
    });
    expect(typeStyleOf(name)).not.toHaveProperty('color');
  });
});

describe('resizeType', () => {
  it('sets the size and scales the spacing with it', () => {
    // The 2023 giant words: the name's type, two row heights tall.
    expect(
      resizeType(
        {
          fontFamily: 'Gotham',
          fontSize: '18px',
          letterSpacing: '0.5px',
          wordSpacing: 'normal',
        },
        72,
      ),
    ).toEqual({
      fontFamily: 'Gotham',
      fontSize: '72px',
      letterSpacing: '2px',
      wordSpacing: 'normal',
    });
  });
});

describe('shownTextOf', () => {
  it("is a part's text without screen-reader-only copies", () => {
    // A phone row showing a short code keeps the full name for readers.
    const name = document.createElement('h4');

    name.innerHTML =
      '<span aria-hidden="true">GBR</span><span class="sr-only">United Kingdom</span>';
    expect(shownTextOf(name)).toBe('GBR');

    name.innerHTML = '  United\n  Kingdom ';
    expect(shownTextOf(name)).toBe('United Kingdom');
  });
});
