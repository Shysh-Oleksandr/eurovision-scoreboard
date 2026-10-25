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

/* Self-contained (no id refs) so it survives export inlining. */
const HEART_MASK = `url("data:image/svg+xml,${encodeURIComponent(
  `<svg xmlns='http://www.w3.org/2000/svg' viewBox='${HEART_VIEWBOX}'><path d='${HEART_OUTER_PATH}' fill='black'/></svg>`,
)}")`;

/** The silhouette as a CSS mask, as large as fits and centred in the box. */
export const heartMaskStyle: React.CSSProperties = {
  WebkitMaskImage: HEART_MASK,
  maskImage: HEART_MASK,
  WebkitMaskSize: '100% 100%',
  maskSize: '100% 100%',
  WebkitMaskRepeat: 'no-repeat',
  maskRepeat: 'no-repeat',
};

/**
 * The heart's box inside a `w` × `h` element, centred like
 * `object-fit: contain` (the official heart images render that way).
 * Without a fixed size it fills the element.
 */
export const heartBox = (
  w?: number,
  h?: number,
): { width: number | string; height: number | string } => {
  if (!w || !h) return { width: '100%', height: '100%' };

  return w / h > HEART_ASPECT
    ? { width: h * HEART_ASPECT, height: h }
    : { width: w, height: w / HEART_ASPECT };
};
