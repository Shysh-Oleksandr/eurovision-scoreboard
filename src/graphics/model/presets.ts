import { Fill } from './design';

/** Canvas size presets offered by the editor (plus "Custom"). */
export interface CanvasPreset {
  id: string;
  label: string;
  width: number;
  height: number;
}

export const CANVAS_PRESETS: CanvasPreset[] = [
  { id: 'landscape', label: 'Landscape', width: 1200, height: 630 },
  { id: 'square', label: 'Square', width: 1080, height: 1080 },
  { id: 'portrait', label: 'Portrait', width: 1080, height: 1350 },
  { id: 'story', label: 'Story', width: 1080, height: 1920 },
  { id: 'broadcast', label: 'Broadcast', width: 1920, height: 1080 },
  { id: 'banner', label: 'Banner', width: 1500, height: 500 },
];

export const findPreset = (
  width: number,
  height: number,
): CanvasPreset | undefined =>
  CANVAS_PRESETS.find((p) => p.width === width && p.height === height);

/* ------------------------------------------------------------------ */
/* Gradient fills: the model stores one CSS string; the inspector edits  */
/* two colours and an angle.                                             */
/* ------------------------------------------------------------------ */

export interface GradientParts {
  angle: number;
  from: string;
  to: string;
}

const GRADIENT_RE =
  /^linear-gradient\(\s*(-?\d+(?:\.\d+)?)deg\s*,\s*(.+?)\s*,\s*(.+?)\s*\)$/i;

export function parseGradient(value: string): GradientParts {
  const m = GRADIENT_RE.exec(value.trim());

  if (!m) return { angle: 160, from: '#1a0b3a', to: '#4a1554' };

  return { angle: Number(m[1]), from: m[2], to: m[3] };
}

export const buildGradient = ({ angle, from, to }: GradientParts): string =>
  `linear-gradient(${angle}deg, ${from}, ${to})`;

export const DEFAULT_GRADIENT_FILL: Fill = {
  kind: 'gradient',
  value: buildGradient({ angle: 160, from: '#1a0b3a', to: '#4a1554' }),
  opacity: 1,
};

export const DEFAULT_COLOR_FILL: Fill = {
  kind: 'color',
  value: '#1a0b3a',
  opacity: 1,
};

/** Upload size limit for image elements and image backgrounds. */
export const MAX_IMAGE_BYTES = 8 * 1024 * 1024;

/** Size family used by the gallery filters; mirrors the backend's rule. */
export type SizeClass =
  | 'landscape'
  | 'portrait'
  | 'square'
  | 'story'
  | 'broadcast'
  | 'content';

export function sizeClassOf(
  width: number,
  height: number,
  autoSize = false,
): SizeClass {
  if (autoSize) return 'content';
  if (width === height) return 'square';
  if (width === 1080 && height === 1920) return 'story';
  if (width >= 1800 && width / height > 1.6) return 'broadcast';

  return width > height ? 'landscape' : 'portrait';
}
