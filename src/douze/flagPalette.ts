/**
 * A country's colours, read from its flag on the row: the main colours in
 * reading order (top to bottom, then left to right), the way the 2022
 * broadcast coloured each country's douze (bar = first colour, second sweep
 * = second, ring = third). Sampled from the row's own flag image, so it
 * works for every flag the row can show; a flag the canvas may not read
 * (another origin without CORS) gives null, and the spec's fixed palette
 * stays.
 */

type Rgb = [number, number, number];

const SAMPLE_W = 96;
const SAMPLE_H = 64;
/**
 * A colour needs this share of the flag to count (skips emblem details and
 * the blends on stripe edges). Saturated colours count from less: Korea's
 * red and blue are small but are the flag's colours.
 */
const MIN_SHARE = 0.07;
const MIN_SHARE_SATURATED = 0.03;
/** HSV saturation above which a colour is a colour, not white/black/grey. */
const SATURATED = 0.35;
/** Clusters closer than this (RGB distance) are one colour (anti-aliasing, shading). */
const MERGE_DISTANCE = 70;

const cache = new Map<string, string[] | null>();

const distance = (a: Rgb, b: Rgb) =>
  Math.hypot(a[0] - b[0], a[1] - b[1], a[2] - b[2]);

const toHex = ([r, g, b]: Rgb) =>
  `#${[r, g, b]
    .map((v) => Math.round(v).toString(16).padStart(2, '0'))
    .join('')}`;

const fromHex = (hex: string): Rgb => [
  parseInt(hex.slice(1, 3), 16),
  parseInt(hex.slice(3, 5), 16),
  parseInt(hex.slice(5, 7), 16),
];

const mix = (a: Rgb, b: Rgb, share: number): Rgb => [
  a[0] + (b[0] - a[0]) * share,
  a[1] + (b[1] - a[1]) * share,
  a[2] + (b[2] - a[2]) * share,
];

const luminance = ([r, g, b]: Rgb) =>
  (0.2126 * r + 0.7152 * g + 0.0722 * b) / 255;

const saturation = ([r, g, b]: Rgb) => {
  const max = Math.max(r, g, b);

  return max === 0 ? 0 : (max - Math.min(r, g, b)) / max;
};

/**
 * Main colours from RGBA pixels: the flag's real colours in reading order
 * (top to bottom, then left to right), then its whites, greys and blacks,
 * lightest first (they glow least well, and black least of all). Pure.
 */
export const dominantColors = (
  pixels: Uint8ClampedArray | number[],
  max = 3,
): string[] => {
  const buckets = new Map<number, { sum: Rgb; count: number; first: number }>();
  let total = 0;

  for (let i = 0; i < pixels.length; i += 4) {
    if (pixels[i + 3] < 200) continue;

    const r = pixels[i];
    const g = pixels[i + 1];
    const b = pixels[i + 2];
    const key = ((r >> 4) << 8) | ((g >> 4) << 4) | (b >> 4);
    const bucket = buckets.get(key);

    total += 1;
    if (bucket) {
      bucket.sum[0] += r;
      bucket.sum[1] += g;
      bucket.sum[2] += b;
      bucket.count += 1;
    } else {
      buckets.set(key, { sum: [r, g, b], count: 1, first: i / 4 });
    }
  }

  if (total === 0) return [];

  const clusters: { color: Rgb; count: number; first: number }[] = [];

  [...buckets.values()]
    .sort((a, b) => b.count - a.count)
    .forEach((bucket) => {
      const color: Rgb = [
        bucket.sum[0] / bucket.count,
        bucket.sum[1] / bucket.count,
        bucket.sum[2] / bucket.count,
      ];
      const near = clusters.find(
        (cluster) => distance(cluster.color, color) < MERGE_DISTANCE,
      );

      if (near) {
        near.count += bucket.count;
        near.first = Math.min(near.first, bucket.first);
      } else {
        clusters.push({ color, count: bucket.count, first: bucket.first });
      }
    });

  // A colour lying between two bigger ones is their blend on a shared edge
  // (the UK's pink between red and white), not a colour of the flag.
  const isBlend = (cluster: (typeof clusters)[number]) =>
    clusters.some((a) =>
      clusters.some((b) => {
        if (a === b || a.count <= cluster.count || b.count <= cluster.count) {
          return false;
        }

        const ab: Rgb = [
          b.color[0] - a.color[0],
          b.color[1] - a.color[1],
          b.color[2] - a.color[2],
        ];
        const length = ab[0] ** 2 + ab[1] ** 2 + ab[2] ** 2;

        if (length === 0) return false;

        const t =
          ((cluster.color[0] - a.color[0]) * ab[0] +
            (cluster.color[1] - a.color[1]) * ab[1] +
            (cluster.color[2] - a.color[2]) * ab[2]) /
          length;

        return (
          t > 0.1 &&
          t < 0.9 &&
          distance(cluster.color, mix(a.color, b.color, t)) < 30
        );
      }),
    );

  const kept = clusters.filter(
    (cluster) =>
      !isBlend(cluster) &&
      cluster.count / total >=
        (saturation(cluster.color) >= SATURATED
          ? MIN_SHARE_SATURATED
          : MIN_SHARE),
  );
  const colours = kept
    .filter((cluster) => saturation(cluster.color) >= SATURATED)
    .sort((a, b) => a.first - b.first);
  const neutrals = kept
    .filter((cluster) => saturation(cluster.color) < SATURATED)
    .sort((a, b) => luminance(b.color) - luminance(a.color));

  return [...colours, ...neutrals]
    .slice(0, max)
    .map((cluster) => toHex(cluster.color));
};

/** The flag's main colours, or null when it can't be read. Cached per image. */
export const sampleFlagColors = (img: HTMLImageElement): string[] | null => {
  const src = img.currentSrc || img.src;

  if (!src || !img.complete) return null;
  if (cache.has(src)) return cache.get(src)!;

  let colors: string[] | null = null;

  try {
    const canvas = document.createElement('canvas');

    canvas.width = SAMPLE_W;
    canvas.height = SAMPLE_H;

    const ctx = canvas.getContext('2d', { willReadFrequently: true });

    if (ctx) {
      ctx.drawImage(img, 0, 0, SAMPLE_W, SAMPLE_H);

      const found = dominantColors(
        ctx.getImageData(0, 0, SAMPLE_W, SAMPLE_H).data,
      );

      colors = found.length > 0 ? found : null;
    }
  } catch {
    // Another origin without CORS taints the canvas: keep the fixed palette.
    colors = null;
  }

  cache.set(src, colors);

  return colors;
};

/**
 * The spec palette's keys from up to three `#rrggbb` colours (a flag's, the
 * theme's or a custom theme's own): `c1`, `c2`, `c3` in order (with fewer,
 * the first fills in), `glow` a pale tint of the first. With `lift` (the
 * default), very dark colours are lightened so they still read on the dark
 * rows; colours someone picked by hand are kept as they are.
 */
export const paletteFromColors = (
  colors: string[],
  { lift = true }: { lift?: boolean } = {},
): Record<string, string> => {
  const rgb = colors.map(fromHex);
  const lifted = (color: Rgb) =>
    lift && luminance(color) < 0.12 ? mix(color, [255, 255, 255], 0.4) : color;
  const [first, second = first, third = first] = rgb;

  return {
    c1: toHex(lifted(first)),
    c2: toHex(lifted(second)),
    c3: toHex(lifted(third)),
    glow: toHex(mix(lifted(first), [255, 255, 255], 0.65)),
    ...sheenAndShade(lifted(first)),
    ink: inkOn(lifted(first)),
  };
};

const toHsl = ([r, g, b]: Rgb): [number, number, number] => {
  const [rr, gg, bb] = [r / 255, g / 255, b / 255];
  const max = Math.max(rr, gg, bb);
  const min = Math.min(rr, gg, bb);
  const l = (max + min) / 2;
  const d = max - min;

  if (d === 0) return [0, 0, l];

  const s = d / (1 - Math.abs(2 * l - 1));
  let h: number;

  if (max === rr) h = ((gg - bb) / d) % 6;
  else if (max === gg) h = (bb - rr) / d + 2;
  else h = (rr - gg) / d + 4;

  return [(h * 60 + 360) % 360, s, l];
};

const fromHsl = ([h, s, l]: [number, number, number]): Rgb => {
  const a = s * Math.min(l, 1 - l);
  const channel = (n: number) => {
    const k = (n + h / 30) % 12;

    return 255 * (l - a * Math.max(-1, Math.min(k - 3, 9 - k, 1)));
  };

  return [channel(0), channel(8), channel(4)];
};

const clamp = (value: number, min: number, max: number) =>
  Math.min(max, Math.max(min, value));

/**
 * A metallic sheen's light band and dark band for a fill of `color`: richer
 * and lighter, richer and darker (the 2026 gold's are #fcc562 and #d98c08).
 */
export const sheenAndShade = (color: Rgb) => {
  const [h, s, l] = toHsl(color);
  // Greys stay grey (silver), not tinted red.
  const richer = (by: number) => (s < 0.05 ? s : clamp(s + by, 0, 1));

  return {
    sheen: toHex(fromHsl([h, richer(0.13), clamp(l + 0.14, 0, 0.94)])),
    shade: toHex(fromHsl([h, richer(0.1), clamp(l - 0.11, 0.08, 1)])),
  };
};

/** sRGB channel (0–255) to linear light. */
const linear = (channel: number) => {
  const c = channel / 255;

  return c <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
};

/**
 * Black or white, whichever contrasts more with `color` (WCAG relative
 * luminance): text on a fill of that colour (the 2026 name over its gold).
 */
export const inkOn = ([r, g, b]: Rgb): string => {
  const l = 0.2126 * linear(r) + 0.7152 * linear(g) + 0.0722 * linear(b);

  return (l + 0.05) / 0.05 >= 1.05 / (l + 0.05) ? '#000000' : '#ffffff';
};
