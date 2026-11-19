import { oklchToHex } from '@/theme/oklch';

/** The original winner confetti mix ("Rainbow"). */
export const RAINBOW_CONFETTI_COLORS = [
  '#FFD700', // Gold
  '#FF6B6B', // Red
  '#4ECDC4', // Teal
  '#45B7D1', // Blue
  '#96CEB4', // Green
  '#FFEAA7', // Yellow
  '#DDA0DD', // Plum
  '#98D8C8', // Mint
];

interface Oklch {
  h: number;
  l: number;
  c: number;
}

/** tokens.css's static fallback (the hue-300 look). */
const FALLBACK_ACCENT: Oklch = { h: 355, l: 66, c: 0.24 };
const FALLBACK_ACCENT_2: Oklch = { h: 260, l: 62, c: 0.19 };

/**
 * "Theme" confetti: both interface accents with a lighter and a deeper shade
 * of each, plus a near-white tinted with the accent's hue.
 */
export function themeConfettiPalette(accent: Oklch, accent2: Oklch): string[] {
  const colors = [
    oklchToHex(accent.l, accent.c, accent.h),
    oklchToHex(Math.min(accent.l + 14, 94), accent.c * 0.75, accent.h),
    oklchToHex(Math.max(accent.l - 14, 40), accent.c, accent.h),
    oklchToHex(accent2.l, accent2.c, accent2.h),
    oklchToHex(Math.min(accent2.l + 16, 92), accent2.c * 0.75, accent2.h),
    oklchToHex(97, 0.02, accent.h),
  ];

  return [...new Set(colors)];
}

/** The active theme's accents, read off `<html>` (built-in or custom theme). */
export function getThemeConfettiColors(): string[] {
  if (typeof document === 'undefined') {
    return themeConfettiPalette(FALLBACK_ACCENT, FALLBACK_ACCENT_2);
  }

  const style = getComputedStyle(document.documentElement);
  const read = (name: string, fallback: number) => {
    const value = parseFloat(style.getPropertyValue(name));

    return Number.isFinite(value) ? value : fallback;
  };
  const readAccent = (prefix: string, fallback: Oklch): Oklch => ({
    h: read(`${prefix}-h`, fallback.h),
    l: read(`${prefix}-l`, fallback.l),
    c: read(`${prefix}-c`, fallback.c),
  });

  return themeConfettiPalette(
    readAccent('--accent', FALLBACK_ACCENT),
    readAccent('--accent-2', FALLBACK_ACCENT_2),
  );
}

interface DominantColorOptions {
  /** At most this many colours. */
  max?: number;
  /** Ignore colours covering less than this share of the flag (edges, small emblem details). */
  minShare?: number;
  /** Colours closer than this (RGB distance) count as one. */
  minDistance?: number;
}

interface Rgb {
  r: number;
  g: number;
  b: number;
}

const distance = (a: Rgb, b: Rgb) =>
  Math.hypot(a.r - b.r, a.g - b.g, a.b - b.b);

/** RGB distance from `p` to the closest mix of `a` and `b`. */
const distanceToSegment = (p: Rgb, a: Rgb, b: Rgb) => {
  const ab = { r: b.r - a.r, g: b.g - a.g, b: b.b - a.b };
  const lengthSq = ab.r ** 2 + ab.g ** 2 + ab.b ** 2;
  const t =
    lengthSq === 0
      ? 0
      : Math.min(
          1,
          Math.max(
            0,
            ((p.r - a.r) * ab.r + (p.g - a.g) * ab.g + (p.b - a.b) * ab.b) /
              lengthSq,
          ),
        );

  return distance(p, {
    r: a.r + ab.r * t,
    g: a.g + ab.g * t,
    b: a.b + ab.b * t,
  });
};

const toHex = (r: number, g: number, b: number) =>
  `#${[r, g, b]
    .map((v) => Math.round(v).toString(16).padStart(2, '0'))
    .join('')}`;

/**
 * The main colours of an image, largest area first, from its RGBA pixels.
 * Colours are bucketed at 4 bits per channel, and each bucket reports the
 * average of its pixels, so a flag's flat fields come back exact.
 */
export function pickDominantColors(
  pixels: ArrayLike<number>,
  { max = 5, minShare = 0.03, minDistance = 40 }: DominantColorOptions = {},
): string[] {
  const buckets = new Map<
    number,
    { count: number; r: number; g: number; b: number }
  >();
  let opaque = 0;

  for (let i = 0; i + 3 < pixels.length; i += 4) {
    if (pixels[i + 3] < 200) continue;

    const r = pixels[i];
    const g = pixels[i + 1];
    const b = pixels[i + 2];
    const key = ((r >> 4) << 8) | ((g >> 4) << 4) | (b >> 4);
    const bucket = buckets.get(key);

    opaque += 1;
    if (bucket) {
      bucket.count += 1;
      bucket.r += r;
      bucket.g += g;
      bucket.b += b;
    } else {
      buckets.set(key, { count: 1, r, g, b });
    }
  }

  if (opaque === 0) return [];

  const picked: Rgb[] = [];
  const sorted = [...buckets.values()].sort((a, b) => b.count - a.count);

  for (const bucket of sorted) {
    if (picked.length >= max || bucket.count / opaque < minShare) break;

    const color = {
      r: bucket.r / bucket.count,
      g: bucket.g / bucket.count,
      b: bucket.b / bucket.count,
    };
    const isNew = picked.every(
      (other) => distance(color, other) >= minDistance,
    );
    // Thin stripes (Greece, the US) leave whole rows of edge pixels, each a
    // mix of the two fields around it.
    const isBlend = picked.some((a, i) =>
      picked
        .slice(i + 1)
        .some((b) => distanceToSegment(color, a, b) < minDistance),
    );

    if (isNew && !isBlend) picked.push(color);
  }

  return picked.map(({ r, g, b }) => toHex(r, g, b));
}

const SAMPLE_WIDTH = 64;
const SAMPLE_HEIGHT = 40;
const LOAD_TIMEOUT_MS = 2000;

/**
 * An SVG flag as a data URL with a fixed size: SVGs with only a viewBox
 * (most of `/flags`) have no intrinsic size, and Firefox won't draw those
 * onto a canvas.
 */
function sizedSvgDataUrl(svgText: string): string {
  const doc = new DOMParser().parseFromString(svgText, 'image/svg+xml');
  const svg = doc.documentElement;

  if (svg.nodeName.toLowerCase() !== 'svg') throw new Error('Not an SVG');

  if (!svg.getAttribute('viewBox')) {
    const width = parseFloat(svg.getAttribute('width') ?? '');
    const height = parseFloat(svg.getAttribute('height') ?? '');

    if (width > 0 && height > 0) {
      svg.setAttribute('viewBox', `0 0 ${width} ${height}`);
    }
  }
  svg.setAttribute('width', String(SAMPLE_WIDTH));
  svg.setAttribute('height', String(SAMPLE_HEIGHT));
  svg.setAttribute('preserveAspectRatio', 'none');

  return `data:image/svg+xml;charset=utf-8,${encodeURIComponent(
    new XMLSerializer().serializeToString(svg),
  )}`;
}

const loadImage = (src: string) =>
  new Promise<HTMLImageElement>((resolve, reject) => {
    const image = new Image();

    image.onload = () => resolve(image);
    image.onerror = () => reject(new Error('Flag image failed to load'));
    image.src = src;
  });

async function readFlagColors(url: string): Promise<string[]> {
  const response = await fetch(url);

  if (!response.ok) throw new Error(`Flag fetch failed: ${response.status}`);

  const blob = await response.blob();
  const isSvg = blob.type.includes('svg') || /\.svg$/i.test(url.split('?')[0]);
  let objectUrl: string | null = null;
  const src = isSvg
    ? sizedSvgDataUrl(await blob.text())
    : (objectUrl = URL.createObjectURL(blob));

  try {
    const image = await loadImage(src);
    const canvas = document.createElement('canvas');

    canvas.width = SAMPLE_WIDTH;
    canvas.height = SAMPLE_HEIGHT;

    const context = canvas.getContext('2d', { willReadFrequently: true });

    if (!context) return [];

    context.drawImage(image, 0, 0, SAMPLE_WIDTH, SAMPLE_HEIGHT);

    return pickDominantColors(
      context.getImageData(0, 0, SAMPLE_WIDTH, SAMPLE_HEIGHT).data,
    );
  } finally {
    if (objectUrl) URL.revokeObjectURL(objectUrl);
  }
}

const flagColorsCache = new Map<string, Promise<string[]>>();

/**
 * The main colours of a flag image (same-origin or proxied URL). Resolves to
 * an empty list when the image can't be read (a foreign image without CORS,
 * offline, a timeout), so callers fall back to other colours.
 */
export function loadFlagColors(url: string): Promise<string[]> {
  const cached = flagColorsCache.get(url);

  if (cached) return cached;

  const timeout = new Promise<string[]>((resolve) => {
    setTimeout(() => resolve([]), LOAD_TIMEOUT_MS);
  });
  const colors = Promise.race([readFlagColors(url), timeout]).catch(
    () => [] as string[],
  );

  flagColorsCache.set(url, colors);
  // A failure may be temporary (offline): try again next time.
  void colors.then((result) => {
    if (result.length === 0) flagColorsCache.delete(url);
  });

  return colors;
}
