import React from 'react';

import { toFixedIfDecimal } from './toFixedIfDecimal';

export interface HSL {
  h: number;
  s: number;
  l: number;
  a?: number; // alpha value (0-1), optional, defaults to 1
}

/**
 * Convert hex color to HSL
 */
export function hexToHsl(hex: string): HSL {
  // Remove # if present
  hex = hex.replace(/^#/, '');

  // Parse hex to RGB
  const r = parseInt(hex.substring(0, 2), 16) / 255;
  const g = parseInt(hex.substring(2, 4), 16) / 255;
  const b = parseInt(hex.substring(4, 6), 16) / 255;

  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  let h = 0;
  let s = 0;
  const l = (max + min) / 2;

  if (max !== min) {
    const d = max - min;
    s = l > 0.5 ? d / (2 - max - min) : d / (max + min);

    switch (max) {
      case r:
        h = ((g - b) / d + (g < b ? 6 : 0)) / 6;
        break;
      case g:
        h = ((b - r) / d + 2) / 6;
        break;
      case b:
        h = ((r - g) / d + 4) / 6;
        break;
    }
  }

  return {
    h: Math.round(h * 360),
    s: Math.round(s * 100),
    l: Math.round(l * 100),
  };
}

/**
 * Convert HSL object to string format "h s% l%" or "h s% l% a" if alpha < 1
 */
export function hslToString(hsl: HSL): string {
  const alpha = hsl.a ?? 1;
  if (alpha < 1) {
    return `${toFixedIfDecimal(hsl.h)} ${toFixedIfDecimal(
      hsl.s,
    )}% ${toFixedIfDecimal(hsl.l)}% ${toFixedIfDecimal(alpha)}`;
  }
  return `${toFixedIfDecimal(hsl.h)} ${toFixedIfDecimal(
    hsl.s,
  )}% ${toFixedIfDecimal(hsl.l)}%`;
}

/**
 * Parse color value and normalize to "h s% l%" format
 * Accepts: hex (#RRGGBB), hsl(h, s%, l%), or "h s% l%"
 */
export function parseColor(value: string): string {
  if (!value) return '';

  // Gradients should be returned as-is
  if (/gradient\(/i.test(value)) {
    return value;
  }

  // Already in "h s% l%" or "h s% l% a" format
  if (/^\d+(?:\.\d+)?\s+\d+(?:\.\d+)?%\s+\d+(?:\.\d+)?%(?:\s+\d+(?:\.\d+)?)?$/.test(value.trim())) {
    return value.trim();
  }

  // Hex format
  if (value.startsWith('#')) {
    const hsl = hexToHsl(value);
    return hslToString(hsl);
  }

  // rgb/rgba format -> convert to HSL triplet string
  const rgbMatch = value
    .trim()
    .match(
      /^rgba?\(\s*(\d{1,3})\s*,\s*(\d{1,3})\s*,\s*(\d{1,3})(?:\s*,\s*(\d*(?:\.\d+)?))?\s*\)$/i,
    );
  if (rgbMatch) {
    const r = Math.min(255, Math.max(0, parseInt(rgbMatch[1], 10))) / 255;
    const g = Math.min(255, Math.max(0, parseInt(rgbMatch[2], 10))) / 255;
    const b = Math.min(255, Math.max(0, parseInt(rgbMatch[3], 10))) / 255;
    const a = rgbMatch[4] !== undefined ? parseFloat(rgbMatch[4]) : 1;

    const max = Math.max(r, g, b);
    const min = Math.min(r, g, b);
    let h = 0;
    let s = 0;
    const l = (max + min) / 2;

    if (max !== min) {
      const d = max - min;
      s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
      switch (max) {
        case r:
          h = (g - b) / d + (g < b ? 6 : 0);
          break;
        case g:
          h = (b - r) / d + 2;
          break;
        default:
          h = (r - g) / d + 4;
      }
      h /= 6;
    }

    return hslToString({
      h: Math.round(h * 360),
      s: Math.round(s * 100),
      l: Math.round(l * 100),
      a: a,
    });
  }

  // hsl(...) format
  const hslMatch = value.match(
    /hsl\((\d+(?:\.\d+)?),?\s*(\d+(?:\.\d+)?)%?,?\s*(\d+(?:\.\d+)?)%?\)/i,
  );
  if (hslMatch) {
    return `${hslMatch[1]} ${hslMatch[2]}% ${hslMatch[3]}%`;
  }

  // Return as-is if we can't parse
  return value;
}

/**
 * Convert "h s% l%" or "h s% l% a" to hex or rgba
 */
export function hslStringToHex(hsl: string): string {
  // Handle our "h s% l% a" format (with alpha)
  const matchWithAlpha = hsl.match(
    /^(\d+(?:\.\d+)?)\s+(\d+(?:\.\d+)?)%\s+(\d+(?:\.\d+)?)%\s+(\d+(?:\.\d+)?)$/,
  );
  if (matchWithAlpha) {
    const [_, h, s, l, a] = matchWithAlpha;
    const hue = parseFloat(h);
    const sat = parseFloat(s) / 100;
    const light = parseFloat(l) / 100;
    const alpha = parseFloat(a);
    return hslaToRgba(hue, sat, light, alpha);
  }

  // Handle our "h s% l%" format
  const match = hsl.match(
    /^(\d+(?:\.\d+)?)\s+(\d+(?:\.\d+)?)%\s+(\d+(?:\.\d+)?)%$/,
  );
  if (!match) {
    // Fallback to hsl(...) format
    const hslMatch = hsl.match(
      /^hsl\(\s*([\d.]+)\s*,\s*([\d.]+)%\s*,\s*([\d.]+)%\s*\)$/i,
    );
    if (!hslMatch) return hsl;
    const [_, h, s, l] = hslMatch;
    const hue = parseFloat(h);
    const sat = parseFloat(s) / 100;
    const light = parseFloat(l) / 100;
    return hslToHex(hue, sat, light);
  }

  const [_, h, s, l] = match;
  const hue = parseFloat(h);
  const sat = parseFloat(s) / 100;
  const light = parseFloat(l) / 100;

  return hslToHex(hue, sat, light);
}

function hslToHex(hue: number, sat: number, light: number): string {
  const c = (1 - Math.abs(2 * light - 1)) * sat;
  const x = c * (1 - Math.abs(((hue / 60) % 2) - 1));
  const m = light - c / 2;

  let [r, g, b]: number[] = [0, 0, 0];

  if (hue < 60) [r, g, b] = [c, x, 0];
  else if (hue < 120) [r, g, b] = [x, c, 0];
  else if (hue < 180) [r, g, b] = [0, c, x];
  else if (hue < 240) [r, g, b] = [0, x, c];
  else if (hue < 300) [r, g, b] = [x, 0, c];
  else [r, g, b] = [c, 0, x];

  const toHex = (n: number) =>
    Math.round((n + m) * 255)
      .toString(16)
      .padStart(2, '0');

  return `#${toHex(r)}${toHex(g)}${toHex(b)}`;
}

function hslaToRgba(hue: number, sat: number, light: number, alpha: number): string {
  const c = (1 - Math.abs(2 * light - 1)) * sat;
  const x = c * (1 - Math.abs(((hue / 60) % 2) - 1));
  const m = light - c / 2;

  let [r, g, b]: number[] = [0, 0, 0];

  if (hue < 60) [r, g, b] = [c, x, 0];
  else if (hue < 120) [r, g, b] = [x, c, 0];
  else if (hue < 180) [r, g, b] = [0, c, x];
  else if (hue < 240) [r, g, b] = [0, x, c];
  else if (hue < 300) [r, g, b] = [x, 0, c];
  else [r, g, b] = [c, 0, x];

  const toRgb = (n: number) => Math.round((n + m) * 255);

  return `rgba(${toRgb(r)}, ${toRgb(g)}, ${toRgb(b)}, ${toFixedIfDecimal(alpha)})`;
}

/**
 * Check if a color value requires special CSS handling (gradient, rgba, or HSL string)
 * and return appropriate CSS properties for background styling
 */
export function getSpecialColorStyle(colorValue: string | undefined): {
  className: string;
  style?: React.CSSProperties;
} {
  if (
    colorValue &&
    (/gradient\(/i.test(colorValue) ||
      /rgba?\(/.test(colorValue) ||
      /^\d+(?:\.\d+)?\s+\d+(?:\.\d+)?%\s+\d+(?:\.\d+)?%\s+\d+(?:\.\d+)?$/.test(
        colorValue,
      ))
  ) {
    return {
      className: '',
      style: { background: hslStringToHex(colorValue) },
    };
  }

  return {
    className: '',
    style: undefined,
  };
}
