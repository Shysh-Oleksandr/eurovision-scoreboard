import { Design } from './design';
import { mapElements } from './elements';

/**
 * Image source conventions and the helpers that walk a design for them.
 * Pure (no storage), so the drafts store, the publish pipeline and the
 * asset loader can all import it without cycles.
 *   `asset:<id>`    an image the user uploaded (IndexedDB `graphicsAssets`)
 *   `theme:bg`      the design theme's background image
 *   `contest:logo`  the loaded contest's logo, else the hosting country's
 */
export const ASSET_PREFIX = 'asset:';
export const THEME_BG_SRC = 'theme:bg';
export const CONTEST_LOGO_SRC = 'contest:logo';

export const isAssetSrc = (src: string): boolean =>
  src.startsWith(ASSET_PREFIX);
export const assetIdFromSrc = (src: string): string =>
  src.slice(ASSET_PREFIX.length);

/** Every `asset:<id>` an image element or image fill references. */
export function localAssetIds(design: Design): string[] {
  const ids = new Set<string>();
  const check = (src: string | undefined) => {
    if (src && isAssetSrc(src)) ids.add(assetIdFromSrc(src));
  };

  mapElements(design.elements, (el) => {
    if (el.type === 'image') check(el.src);
    if (el.type === 'shape' && el.fill.kind === 'image') check(el.fill.url);

    return el;
  });
  design.canvas.background.forEach((fill) => {
    if (fill.kind === 'image') check(fill.url);
  });

  return [...ids];
}

/** Replace `asset:<id>` references with the given URLs. */
export function rewriteAssetRefs(
  design: Design,
  urls: Map<string, string>,
): Design {
  const swap = (src: string) =>
    isAssetSrc(src) ? urls.get(assetIdFromSrc(src)) ?? src : src;

  return {
    ...design,
    elements: mapElements(design.elements, (el) => {
      if (el.type === 'image') return { ...el, src: swap(el.src) };
      if (el.type === 'shape' && el.fill.kind === 'image') {
        return { ...el, fill: { ...el.fill, url: swap(el.fill.url) } };
      }

      return el;
    }),
    canvas: {
      ...design.canvas,
      background: design.canvas.background.map((fill) =>
        fill.kind === 'image' ? { ...fill, url: swap(fill.url) } : fill,
      ),
    },
  };
}
