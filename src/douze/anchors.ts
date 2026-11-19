import type { DouzeAnchor } from './model';
import type { AnchorRects, PxRect } from './timeline';

export const DOUZE_ANCHORS: DouzeAnchor[] = [
  'row',
  'flag',
  'name',
  'lastPoints',
  'total',
];

/** Attributes copies of row parts must not keep (they'd be found as the real ones). */
const MEASURED_ATTRIBUTES = [
  'data-douze-anchor',
  'data-entry-name',
  'data-points-current',
  'data-points-track',
  'data-flip-id',
  'id',
];

/** Inline properties GSAP entrance tweens leave on row parts. */
const ENTRANCE_PROPERTIES = [
  'opacity',
  'transform',
  'translate',
  'rotate',
  'scale',
  'visibility',
];

/**
 * `el`'s box relative to `ancestor`'s padding box, in the elements' own CSS
 * px. Layout offsets ignore transforms and an ancestor's CSS zoom (the column
 * layout zooms the board), unlike getBoundingClientRect.
 */
export const offsetRectWithin = (
  el: HTMLElement,
  ancestor: HTMLElement,
): PxRect | null => {
  let x = 0;
  let y = 0;
  let node: HTMLElement = el;

  while (node !== ancestor) {
    x += node.offsetLeft;
    y += node.offsetTop;

    const parent = node.offsetParent as HTMLElement | null;

    if (!parent || !ancestor.contains(parent)) return null;
    if (parent !== ancestor) {
      x += parent.clientLeft;
      y += parent.clientTop;
    }
    node = parent;
  }

  return { x, y, w: el.offsetWidth, h: el.offsetHeight };
};

export const findAnchor = (
  scope: HTMLElement,
  anchor: DouzeAnchor,
): HTMLElement | null =>
  scope.querySelector<HTMLElement>(`[data-douze-anchor="${anchor}"]`);

/** The row's parts measured against `ancestor` (anchors searched inside it). */
export const measureAnchors = (ancestor: HTMLElement): AnchorRects => {
  const rects: AnchorRects = {};

  DOUZE_ANCHORS.forEach((anchor) => {
    const el = findAnchor(ancestor, anchor);

    if (!el || el.offsetWidth === 0) return;

    const rect = offsetRectWithin(el, ancestor);

    if (rect) rects[anchor] = rect;
  });

  return rects;
};

/**
 * The corner radii of the row's parts (computed `border-radius`), so clips
 * and fills placed against them take their shape: a rounded theme's row is a
 * pill, and a square overlay on it shows corners past its ends.
 */
export const measureAnchorRadii = (
  ancestor: HTMLElement,
): Partial<Record<DouzeAnchor, string>> => {
  const radii: Partial<Record<DouzeAnchor, string>> = {};

  DOUZE_ANCHORS.forEach((anchor) => {
    const el = findAnchor(ancestor, anchor);

    if (el) radii[anchor] = getComputedStyle(el).borderRadius;
  });

  return radii;
};

/** A static copy of a row part, sized to fill its layer. */
export const cloneRowPart = (source: HTMLElement): HTMLElement => {
  const copy = source.cloneNode(true) as HTMLElement;

  [copy, ...Array.from(copy.querySelectorAll<HTMLElement>('*'))].forEach(
    (node) => {
      MEASURED_ATTRIBUTES.forEach((attribute) =>
        node.removeAttribute(attribute),
      );
      // The copy is usually taken mid-way through the part's own entrance
      // tween (the 12's label starts at opacity 0); show its settled state.
      ENTRANCE_PROPERTIES.forEach((property) =>
        node.style?.removeProperty(property),
      );
    },
  );

  // GSAP leaves inline transforms/opacity on the source; the copy sits in its
  // layer's box, which the player moves instead.
  copy.removeAttribute('style');
  Object.assign(copy.style, {
    position: 'absolute',
    left: '0',
    top: '0',
    right: 'auto',
    bottom: 'auto',
    width: '100%',
    height: '100%',
    margin: '0',
    transform: 'none',
    opacity: '1',
    visibility: 'visible',
  });
  copy.setAttribute('aria-hidden', 'true');

  return copy;
};

type Local = { x: number; y: number; w: number; h: number };

const n2 = (value: number) => Math.round(value * 100) / 100;

/** A rect with per-corner radii, as a path (radii clamped to fit). */
const roundedRectPath = ({ x, y, w, h }: Local, [tl, tr, br, bl]: number[]) => {
  const fit = (r: number) => Math.max(0, Math.min(r, w / 2, h / 2));
  const [a, b, c, d] = [fit(tl), fit(tr), fit(br), fit(bl)];

  return (
    `M${n2(x + a)},${n2(y)} H${n2(x + w - b)} ` +
    `A${n2(b)},${n2(b)} 0 0 1 ${n2(x + w)},${n2(y + b)} V${n2(y + h - c)} ` +
    `A${n2(c)},${n2(c)} 0 0 1 ${n2(x + w - c)},${n2(y + h)} H${n2(x + d)} ` +
    `A${n2(d)},${n2(d)} 0 0 1 ${n2(x)},${n2(y + h - d)} V${n2(y + a)} ` +
    `A${n2(a)},${n2(a)} 0 0 1 ${n2(x + a)},${n2(y)} Z`
  );
};

const radiusPx = (value: string, size: number) =>
  value.endsWith('%')
    ? (parseFloat(value) / 100) * size
    : parseFloat(value) || 0;

const paints = (style: CSSStyleDeclaration) => {
  const alpha = /rgba?\([^)]*?,\s*([\d.]+)\)$/.exec(style.backgroundColor);
  const transparent =
    style.backgroundColor === 'transparent' ||
    (alpha !== null && parseFloat(alpha[1]) === 0);

  return !transparent || style.backgroundImage !== 'none';
};

/** SVG shape elements as path data. */
const shapePath = (shape: SVGElement): string | null => {
  const tag = shape.tagName.toLowerCase();

  if (tag === 'path') return shape.getAttribute('d');
  if (tag === 'polygon' || tag === 'polyline') {
    const points = shape.getAttribute('points')?.trim();

    return points ? `M${points.split(/\s+/).join(' L')} Z` : null;
  }
  if (tag === 'rect') {
    const get = (name: string) => parseFloat(shape.getAttribute(name) || '0');

    return `M${get('x')},${get('y')} h${get('width')} v${get('height')} h${-get(
      'width',
    )} Z`;
  }

  return null;
};

/**
 * A CSS mask (`url(...)`) for `wrapper` that hides what `covers` draw over
 * it in the row: each cover's own box when it paints a background (with its
 * corner radii) and the filled shapes of its SVGs (the 2022 total's curved
 * edge). Measured on screen and divided by the zoom, so it holds on the
 * column layout's zoomed board. Null when nothing overlaps.
 */
export const buildCutMask = (
  wrapper: HTMLElement,
  covers: HTMLElement[],
): string | null => {
  const frame = wrapper.getBoundingClientRect();
  const w = wrapper.offsetWidth;
  const h = wrapper.offsetHeight;

  if (w === 0 || h === 0 || frame.width === 0) return null;

  const zoom = frame.width / w;
  const local = (rect: DOMRect): Local => ({
    x: (rect.left - frame.left) / zoom,
    y: (rect.top - frame.top) / zoom,
    w: rect.width / zoom,
    h: rect.height / zoom,
  });
  const overlaps = (box: Local) =>
    box.x < w && box.y < h && box.x + box.w > 0 && box.y + box.h > 0;
  const holes: string[] = [];

  covers.forEach((cover) => {
    const style = getComputedStyle(cover);
    const box = local(cover.getBoundingClientRect());

    if (paints(style) && overlaps(box)) {
      holes.push(
        `<path d="${roundedRectPath(box, [
          radiusPx(style.borderTopLeftRadius, box.w),
          radiusPx(style.borderTopRightRadius, box.w),
          radiusPx(style.borderBottomRightRadius, box.w),
          radiusPx(style.borderBottomLeftRadius, box.w),
        ])}" fill="black"/>`,
      );
    }

    cover.querySelectorAll('svg').forEach((svgEl) => {
      const viewBox = svgEl.viewBox?.baseVal;
      const rect = local(svgEl.getBoundingClientRect());

      if (!viewBox || viewBox.width === 0 || viewBox.height === 0) return;
      if (!overlaps(rect) || getComputedStyle(svgEl).visibility === 'hidden') {
        return;
      }

      const transform =
        `translate(${n2(rect.x)} ${n2(rect.y)}) ` +
        `scale(${rect.w / viewBox.width} ${rect.h / viewBox.height}) ` +
        `translate(${-viewBox.x} ${-viewBox.y})`;

      svgEl
        .querySelectorAll<SVGElement>('path, polygon, rect')
        .forEach((shape) => {
          const d = shapePath(shape);

          if (d && getComputedStyle(shape).fill !== 'none') {
            holes.push(
              `<path d="${d}" transform="${transform}" fill="black"/>`,
            );
          }
        });
    });
  });

  if (holes.length === 0) return null;

  // Alpha mask: opaque where the layer shows, transparent over the holes.
  const svg =
    `<svg xmlns="http://www.w3.org/2000/svg" width="${n2(w)}" height="${n2(
      h,
    )}" viewBox="0 0 ${n2(w)} ${n2(h)}">` +
    `<defs><mask id="m" maskUnits="userSpaceOnUse" x="0" y="0" width="${n2(
      w,
    )}" height="${n2(h)}">` +
    `<rect width="${n2(w)}" height="${n2(h)}" fill="white"/>${holes.join(
      '',
    )}</mask></defs>` +
    `<rect width="${n2(w)}" height="${n2(
      h,
    )}" fill="black" mask="url(#m)"/></svg>`;

  return `url("data:image/svg+xml,${encodeURIComponent(svg)}")`;
};
