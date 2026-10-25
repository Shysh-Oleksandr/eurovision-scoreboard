import type React from 'react';

/**
 * The Eurovision heart, traced from the official heart flags in
 * `public/hostingCountryLogos/` (e.g. Ukraine2023.svg), in their
 * 125.33 × 131.44 box. Every official heart shares this geometry, so a flag
 * masked with `HEART_OUTER_PATH` and overlaid with `HEART_OUTLINE_PATH` lines
 * up with them.
 */
export const HEART_WIDTH = 125.33;
export const HEART_HEIGHT = 131.4429;
export const HEART_VIEWBOX = `0 0 ${HEART_WIDTH} ${HEART_HEIGHT}`;
export const HEART_ASPECT = HEART_WIDTH / HEART_HEIGHT;

/** The silhouette: the outline's outer edge. */
export const HEART_OUTER_PATH =
  'M 95.36,0 c -13.42,0 -29.29,9.91 -38.89,26.38 -2.59,-5.95 -11.83,-12.43 -22.8,-12.43 -8.84,0 -33.67,11.05 -33.67,46.73 0,46.05 46.59,55.51 56.01,69.82 0.65,0.99 2.73,1.73 3.53,-0.62 7.51,-22.18 65.79,-47.24 65.79,-92.37 0,-25.31 -16.53,-37.51 -29.95,-37.51 z';

/** The black outline: the silhouette with the inner heart cut out. */
export const HEART_OUTLINE_PATH = `${HEART_OUTER_PATH} m 14.33,37.36 c -0.27,7.78 -2.66,15.22 -6.31,22.28 -13.07,25.32 -42.2,45.79 -46.93,59.85 -4.8,-9.71 -36.11,-23.27 -42.57,-50.41 -0.79,-3.3 -1.21,-6.81 -1.17,-10.53 0.32,-28.51 15.16,-37.43 23.23,-37.43 11.28,0 15.94,8.61 16.71,12.43 0.76,3.81 5.03,6.86 6.4,0.61 1.37,-6.25 14.65,-25.31 30.96,-25.31 14.94,0 20.12,15.41 19.67,28.52 z`;

/**
 * The 2026 heart with its white outline, from the white-outline hearts in
 * `public/hostingCountryLogos/2026-white/` (226.683 × 233.658). Same geometry
 * as `scripts/white-hearts-2026.mjs` draws them with.
 */
export const HEART_2026_WIDTH = 226.683;
export const HEART_2026_HEIGHT = 233.658;
export const HEART_2026_VIEWBOX = `0 0 ${HEART_2026_WIDTH} ${HEART_2026_HEIGHT}`;
export const HEART_2026_ASPECT = HEART_2026_WIDTH / HEART_2026_HEIGHT;

export const HEART_2026_OUTER_PATH =
  'M 99.722 231.541 C 101.585 233.574 104.305 233.076 105.56 230.435 C 135.35 167.569 225.843 139.135 225.843 59.033 C 225.843 29.922 206.246 0.69 168.566 0.013 C 132.699 -0.635 100.509 22.469 97.152 59.87 C 96.145 36.188 80.613 25.269 62.7 25.269 C 27.461 25.269 -1.402 57.081 0.053 104.952 C 2.474 180.242 74.855 203.964 99.722 231.541 Z';

export const HEART_2026_OUTLINE_PATH = `${HEART_2026_OUTER_PATH} M 93.326 77.913 C 94.282 81.669 98.865 81.54 99.901 77.823 C 115.414 21.593 186.748 15.446 186.748 72.384 C 186.748 117.336 107.075 165.298 101.007 207.969 C 86.591 179.973 33.638 164.6 33.638 103.747 C 33.638 51.96 83.991 41.08 93.326 77.913 Z`;

/* Self-contained (no id refs) so it survives export inlining. */
const svgMaskStyle = (viewBox: string, path: string): React.CSSProperties => {
  const mask = `url("data:image/svg+xml,${encodeURIComponent(
    `<svg xmlns='http://www.w3.org/2000/svg' viewBox='${viewBox}'><path d='${path}' fill='black'/></svg>`,
  )}")`;

  return {
    WebkitMaskImage: mask,
    maskImage: mask,
    WebkitMaskSize: '100% 100%',
    maskSize: '100% 100%',
    WebkitMaskRepeat: 'no-repeat',
    maskRepeat: 'no-repeat',
  };
};

/** The silhouette as a CSS mask, as large as fits and centred in the box. */
export const heartMaskStyle = svgMaskStyle(HEART_VIEWBOX, HEART_OUTER_PATH);

/** The 2026 silhouette as a CSS mask, like `heartMaskStyle`. */
export const heart2026MaskStyle = svgMaskStyle(
  HEART_2026_VIEWBOX,
  HEART_2026_OUTER_PATH,
);

/**
 * The heart's box inside a `w` × `h` element, centred like
 * `object-fit: contain` (the official heart images render that way).
 * Without a fixed size it fills the element.
 */
export const heartBox = (
  w?: number,
  h?: number,
  aspect = HEART_ASPECT,
): { width: number | string; height: number | string } => {
  if (!w || !h) return { width: '100%', height: '100%' };

  return w / h > aspect
    ? { width: h * aspect, height: h }
    : { width: w, height: w / aspect };
};
