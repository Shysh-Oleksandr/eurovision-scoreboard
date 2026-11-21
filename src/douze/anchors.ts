import type { DouzeAnchor } from './model';
import type { AnchorRects, PxRect } from './timeline';

export const DOUZE_ANCHORS: DouzeAnchor[] = [
  'row',
  'strip',
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

/** The translation in a computed `transform` (px), or none. */
const translationOf = (transform: string): [number, number] => {
  const values = /^matrix(3d)?\((.+)\)$/.exec(transform.trim());

  if (!values) return [0, 0];

  const numbers = values[2].split(',').map(Number);

  return values[1]
    ? [numbers[12] || 0, numbers[13] || 0]
    : [numbers[4] || 0, numbers[5] || 0];
};

/**
 * `el`'s box on screen, from the browser's own method: the column layout
 * gives each board row (`[data-flip-id]`, the player's parent) one that
 * divides by the zoom (BoardStage's `patchRowRects`, for FLIP moves), and
 * mixing the two would place the layers off by the zoom.
 */
const screenRect = (el: Element): DOMRect =>
  Element.prototype.getBoundingClientRect.call(el);

/**
 * The CSS zoom `el` is drawn at (the column layout zooms the board), from
 * `currentCSSZoom` where the browser has it, else from its drawn width
 * over its own (both to the fraction of a pixel; `offsetWidth` rounds).
 */
const zoomOf = (el: HTMLElement, drawn: DOMRect): number => {
  const css = (el as HTMLElement & { currentCSSZoom?: number }).currentCSSZoom;

  if (typeof css === 'number' && css > 0) return css;

  const style = getComputedStyle(el);
  const width =
    style.boxSizing === 'border-box' ? parseFloat(style.width) : el.offsetWidth;

  return width > 0 && drawn.width > 0 ? drawn.width / width : 1;
};

/**
 * `el`'s box relative to `ancestor`'s padding box, in the elements' own CSS
 * px, to the fraction of a pixel: copies laid over the row's parts (the
 * 2026 name over the gold) must sit exactly on them, and layout offsets
 * round each step to whole pixels. Measured on screen, then divided by the
 * zoom (the column layout zooms the board) and without the moves of the
 * part and its parents up to `ancestor` (a part mid-entrance, the 12 box's
 * GSAP slide, is placed where it comes to rest). Null when `el` is not
 * inside `ancestor`.
 */
export const rectWithin = (
  el: HTMLElement,
  ancestor: HTMLElement,
): PxRect | null => {
  if (el === ancestor || !ancestor.contains(el)) return null;

  const frame = screenRect(ancestor);
  const rect = screenRect(el);
  const zoom = zoomOf(ancestor, frame);
  let tx = 0;
  let ty = 0;

  for (
    let node: HTMLElement | null = el;
    node && node !== ancestor;
    node = node.parentElement
  ) {
    const [x, y] = translationOf(getComputedStyle(node).transform);

    tx += x;
    ty += y;
  }

  return {
    x: (rect.left - frame.left) / zoom - ancestor.clientLeft - tx,
    y: (rect.top - frame.top) / zoom - ancestor.clientTop - ty,
    w: rect.width / zoom,
    h: rect.height / zoom,
  };
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

    const rect = rectWithin(el, ancestor);

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

/**
 * Repaints a copy (a clone layer's `paint`): its background and the fill
 * of its SVG shapes, and the colour of all its text. Important, so the
 * copy takes them over the part's own `!` classes too: a custom theme's
 * transparent points (`!bg-transparent`) would keep a gold copy clear, and
 * its ink text would sit on the page.
 */
export const paintCopy = (
  copy: HTMLElement,
  paint: { fill?: string; text?: string },
) => {
  if (paint.fill) {
    copy.style.setProperty('background', paint.fill, 'important');
    copy
      .querySelectorAll<SVGElement>('path, polygon, rect')
      .forEach((shape) => {
        shape.style.setProperty('fill', paint.fill!, 'important');
      });
  }
  if (paint.text) {
    [copy, ...Array.from(copy.querySelectorAll<HTMLElement>('*'))].forEach(
      (node) => {
        node.style?.setProperty('color', paint.text!, 'important');
      },
    );
  }
};

const textNodes = (root: Node): Text[] => {
  const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT);
  const nodes: Text[] = [];

  while (walker.nextNode()) nodes.push(walker.currentNode as Text);

  return nodes;
};

/**
 * Keeps a copy's text in step with its part while the animation runs: a
 * total copied at the award is still counting up. Returns the stop.
 */
export const mirrorText = (
  source: HTMLElement,
  copy: HTMLElement,
): (() => void) => {
  const sync = () => {
    const from = textNodes(source);
    const to = textNodes(copy);

    // A different structure (the NQ label) isn't the same text any more.
    if (from.length !== to.length) return;
    from.forEach((node, index) => {
      if (to[index].data !== node.data) to[index].data = node.data;
    });
  };
  const observer = new MutationObserver(sync);

  observer.observe(source, {
    characterData: true,
    childList: true,
    subtree: true,
  });

  return () => observer.disconnect();
};

/** A static copy of a row part, sized to fill its layer. */
export const cloneRowPart = (source: HTMLElement): HTMLElement => {
  const copy = source.cloneNode(true) as HTMLElement;

  [copy, ...Array.from(copy.querySelectorAll<HTMLElement>('*'))].forEach(
    (node) => {
      // Host rules that restyle the board's names (the phone's two-line
      // names in styles.css) match a copy's `data-douze-name` too.
      if (node.hasAttribute('data-entry-name')) {
        node.setAttribute('data-douze-name', '');
      }
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

  // The part's own text size and leading, whatever set them (a host may
  // size the board's names past their classes), as the hearts' name does.
  const { fontSize, lineHeight } = getComputedStyle(source);

  // GSAP leaves inline transforms/opacity on the source; the copy sits in its
  // layer's box, which the player moves instead.
  copy.removeAttribute('style');
  Object.assign(copy.style, {
    fontSize,
    lineHeight,
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

/**
 * The stacking level a branch of the tree paints at, below `from`'s parent:
 * the z-index of its outermost element that has one (positioned, or a flex
 * or grid item), as that element's whole subtree paints at it; else 0 for a
 * positioned branch and -1 for plain in-flow content, which paints first.
 */
const branchLevel = (chain: HTMLElement[]): number => {
  let positioned = false;

  for (const el of chain) {
    const style = getComputedStyle(el);
    const z = parseInt(style.zIndex, 10);
    const parentDisplay = el.parentElement
      ? getComputedStyle(el.parentElement).display
      : '';
    const isItem = /flex|grid/.test(parentDisplay);

    if (style.position !== 'static') positioned = true;
    if (Number.isFinite(z) && (style.position !== 'static' || isItem)) {
      return z;
    }
  }

  return positioned ? 0 : -1;
};

/**
 * Whether `cover` paints over `part` in the row: a part inside the other
 * paints over it; otherwise the branches' stacking levels under their
 * closest common ancestor decide, then the tree order (later on top). Good
 * enough for a row's parts (the 2026 strip, z-21, over the points, z-15;
 * the total over the 12 box in both layouts), not every CSS case.
 */
export const drawsOver = (cover: HTMLElement, part: HTMLElement): boolean => {
  if (cover === part) return false;
  if (part.contains(cover)) return true;
  if (cover.contains(part)) return false;

  const ancestors = (el: HTMLElement) => {
    const chain: HTMLElement[] = [];

    for (let node: HTMLElement | null = el; node; node = node.parentElement) {
      chain.unshift(node);
    }

    return chain;
  };
  const a = ancestors(cover);
  const b = ancestors(part);
  let common = 0;

  while (a[common] && a[common] === b[common]) common += 1;

  const coverBranch = a.slice(common);
  const partBranch = b.slice(common);
  const coverLevel = branchLevel(coverBranch);
  const partLevel = branchLevel(partBranch);

  if (coverLevel !== partLevel) return coverLevel > partLevel;

  const [coverTop] = coverBranch;
  const [partTop] = partBranch;

  return (
    !!coverTop &&
    !!partTop &&
    !!(
      partTop.compareDocumentPosition(coverTop) &
      Node.DOCUMENT_POSITION_FOLLOWING
    )
  );
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
 * it in the row: each cover's own box (with its corner radii) and the
 * filled shapes of its SVGs (the 2022 total's curved edge). Measured on
 * screen and divided by the zoom, so it holds on the column layout's zoomed
 * board. Null when nothing overlaps.
 *
 * A cover's box is cut whatever its background. A custom theme's
 * transparent points still hold their text there, which a layer passing
 * under them must not hide (the 2026 gold over a square row's 12 box), and
 * the row's own colour shows through them instead. Reading the colour
 * instead went wrong: an `rgb(r, g, 0)` total (dark red, any yellow) parsed
 * as clear, so the 12 box copies covered the total's round end.
 */
export const buildCutMask = (
  wrapper: HTMLElement,
  covers: HTMLElement[],
): string | null => {
  const frame = screenRect(wrapper);
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
    // Where the part comes to rest: one mid-entrance (the 12 box's GSAP
    // slide) is measured without its own move.
    const [tx, ty] = translationOf(style.transform);
    const atRest = (rect: DOMRect): Local => {
      const box = local(rect);

      return { ...box, x: box.x - tx, y: box.y - ty };
    };
    const box = atRest(screenRect(cover));

    if (overlaps(box)) {
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
      const rect = atRest(screenRect(svgEl));

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
