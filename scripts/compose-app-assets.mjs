#!/usr/bin/env node
/**
 * Rasterizes the app icon artwork (assets/brand/icon-<variant>-*.svg, the
 * design handoff's final vectors) into everything that shows the brand mark:
 *
 * Native sources for @capacitor/assets (Custom Mode, see its README):
 *   assets/icon-only.png          1024² iOS icon (opaque, full bleed)
 *   assets/icon-foreground.png    1024² Android adaptive foreground
 *   assets/icon-background.png    1024² Android adaptive background
 *   assets/android/icon.png       1024² Android legacy + round icons
 *   assets/splash.png             2732² launch screen
 *   assets/splash-dark.png        2732² launch screen (dark mode)
 *   assets/icon-tinted.png        1024² iOS tinted icon, copied into the
 *                                 asset catalog by ios-icon-appearances.mjs
 *   assets/store/play-store-icon-512.png  upload by hand to Play Console
 *
 * Website (public/img/brand/), the mark cropped to its strokes so it fills
 * the square (nothing masks these to a circle, unlike the app icons):
 *   favicon.ico (16/32/48) and icon.svg   transparent, edge to edge
 *   apple-touch-icon.png (180), icon-192.png, icon-512.png   opaque navy
 *   mark.png   the mark alone on transparent, for share images
 *
 * V1 has a round mic capsule, V2 a squarer one; V2 is the default. To try
 * the other one everywhere:
 *
 *   node scripts/compose-app-assets.mjs --variant V1 && yarn assets:native
 */
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';

import sharp from 'sharp';

const args = process.argv.slice(2);
const variantArg = args[args.indexOf('--variant') + 1];
const VARIANT = args.includes('--variant') ? variantArg : 'V2';
if (VARIANT !== 'V1' && VARIANT !== 'V2') {
  console.error(`Unknown variant "${variantArg}", expected V1 or V2`);
  process.exit(1);
}

/** Matches the artwork's background and SPLASH_BACKGROUND in capacitor.config.ts. */
const NAVY = '#020B2F';
const OUT = 'assets';
const WEB = 'public/img/brand';

const src = (kind) =>
  readFileSync(`${OUT}/brand/icon-${VARIANT}-${kind}.svg`, 'utf8');

// iOS: full bleed, the rounded-square mask crops the stroke ends.
const IOS = src('ios-1024');
// Tinted: white mark on transparent, iOS recolours it.
const MONO = src('mono-1024-transparent');
// Android framing: the whole mark inside the 626 px safe circle of a
// 1024 (108 dp) canvas. The transparent one is also cropped to the strokes
// for the website icons and the share-image branding.
const ANDROID = src('android-foreground-1024');
const ANDROID_MARK = src('android-foreground-1024-transparent');

const render = (svg, size) =>
  sharp(Buffer.from(svg), { density: (72 * size) / 1024 })
    .resize(size, size)
    .png()
    .toBuffer();

const solid = (size) =>
  sharp({
    create: { width: size, height: size, channels: 3, background: NAVY },
  });

mkdirSync(`${OUT}/android`, { recursive: true });
mkdirSync(`${OUT}/store`, { recursive: true });
mkdirSync(WEB, { recursive: true });

// --- Native ---------------------------------------------------------------

await sharp(await render(IOS, 1024))
  .flatten({ background: NAVY })
  .toFile(`${OUT}/icon-only.png`);
await sharp(await render(MONO, 1024)).toFile(`${OUT}/icon-tinted.png`);

// @capacitor/assets wraps the adaptive layers in a 16.7% inset, so its 1024
// foreground covers only the visible 72 dp of the 108 dp layer: crop the
// handoff's 108 dp framing to its central two-thirds.
await sharp(await render(ANDROID_MARK, 1536))
  .extract({ left: 256, top: 256, width: 1024, height: 1024 })
  .toFile(`${OUT}/icon-foreground.png`);
await solid(1024).png().toFile(`${OUT}/icon-background.png`);
// Legacy square/round icons (API 24-25). @capacitor/assets would otherwise
// make them from icon-only.png and crop the strokes into a circle.
await sharp(await render(ANDROID, 1024))
  .flatten({ background: NAVY })
  .toFile(`${OUT}/android/icon.png`);
await sharp(await render(ANDROID, 512))
  .flatten({ background: NAVY })
  .toFile(`${OUT}/store/play-store-icon-512.png`);

// Splash: the mark (about 670 px wide) centred on the navy. Android 12+
// shows the launcher icon instead, on windowSplashScreenBackground.
const splashMark = await render(ANDROID_MARK, 1100);
for (const name of ['splash', 'splash-dark']) {
  await solid(2732)
    .composite([{ input: splashMark, gravity: 'center' }])
    .png()
    .toFile(`${OUT}/${name}.png`);
}

// --- Website --------------------------------------------------------------

/** ICO with PNG entries (supported by every current browser and Windows). */
const ico = (pngs) => {
  const header = Buffer.alloc(6 + 16 * pngs.length);
  header.writeUInt16LE(0, 0);
  header.writeUInt16LE(1, 2);
  header.writeUInt16LE(pngs.length, 4);
  let offset = header.length;
  pngs.forEach(({ size, data }, i) => {
    const entry = 6 + 16 * i;
    header.writeUInt8(size >= 256 ? 0 : size, entry);
    header.writeUInt8(size >= 256 ? 0 : size, entry + 1);
    header.writeUInt16LE(1, entry + 4);
    header.writeUInt16LE(32, entry + 6);
    header.writeUInt32LE(data.length, entry + 8);
    header.writeUInt32LE(offset, entry + 12);
    offset += data.length;
  });
  return Buffer.concat([header, ...pngs.map((p) => p.data)]);
};

// The mark alone, cropped to its strokes. Rendered at 2048 so the crop is
// precise to half a pixel of the 1024 canvas.
const { data: MARK, info: markInfo } = await sharp(
  await render(ANDROID_MARK, 2048),
)
  .trim()
  .toBuffer({ resolveWithObject: true });

const TRANSPARENT = { r: 0, g: 0, b: 0, alpha: 0 };

/**
 * The mark scaled to fill a size² square, `pad` (a fraction of the side)
 * from each edge, on a transparent ground or an opaque navy square. Unlike
 * the app icons, nothing masks these to a circle, so the mark can use the
 * whole square.
 */
const fitMark = async (size, { pad, ground }) => {
  const inner = Math.round(size * (1 - 2 * pad));
  // Separate pipeline: sharp resizes before it extends or composites,
  // whatever the call order.
  const mark = await sharp(MARK)
    .resize(inner, inner, { fit: 'contain', background: TRANSPARENT })
    .png()
    .toBuffer();
  const out = sharp({
    create: {
      width: size,
      height: size,
      channels: 4,
      background: ground === 'navy' ? NAVY : TRANSPARENT,
    },
  }).composite([{ input: mark, gravity: 'center' }]);
  return (ground === 'navy' ? out.flatten({ background: NAVY }) : out)
    .png()
    .toBuffer();
};

// Browser tabs: the mark alone, edge to edge, like the old microphone.
const icoBuffer = ico(
  await Promise.all(
    [16, 32, 48].map(async (size) => ({
      size,
      data: await fitMark(size, { pad: 0, ground: 'transparent' }),
    })),
  ),
);
writeFileSync(`${WEB}/favicon.ico`, icoBuffer);
// Browsers and crawlers also ask for /favicon.ico regardless of <link>s.
writeFileSync('public/favicon.ico', icoBuffer);

// Home-screen shortcuts: opaque, the OS rounds the corners.
for (const [name, size] of [
  ['apple-touch-icon', 180],
  ['icon-192', 192],
  ['icon-512', 512],
]) {
  writeFileSync(
    `${WEB}/${name}.png`,
    await fitMark(size, { pad: 0.1, ground: 'navy' }),
  );
}

// The ICO as a vector: a square viewBox cropped around the mark's strokes
// (bounds from the 2048 render, halved to the 1024 canvas). Path coordinates
// are rounded to whole pixels: a third smaller, identical at favicon sizes.
const box = {
  x: -markInfo.trimOffsetLeft / 2,
  y: -markInfo.trimOffsetTop / 2,
  w: markInfo.width / 2,
  h: markInfo.height / 2,
};
const side = Math.max(box.w, box.h);
const viewBox = [
  box.x + (box.w - side) / 2,
  box.y + (box.h - side) / 2,
  side,
  side,
]
  .map((n) => n.toFixed(1))
  .join(' ');
writeFileSync(
  `${WEB}/icon.svg`,
  ANDROID_MARK.replace(
    /<svg[^>]*>/,
    `<svg xmlns="http://www.w3.org/2000/svg" viewBox="${viewBox}">`,
  ).replace(
    / d="([^"]*)"/g,
    (_, d) =>
      ` d="${d.replace(/-?\d+\.\d+/g, (n) => String(Math.round(Number(n))))}"`,
  ),
);

// Share images: the mark alone, filling the icon box next to
// "DouzePoints.app".
writeFileSync(
  `${WEB}/mark.png`,
  await fitMark(384, { pad: 0, ground: 'transparent' }),
);

console.log(
  `Wrote ${VARIANT} icon sources to ${OUT}/ and web icons to ${WEB}/. ` +
    'Run `yarn assets:native` to update the iOS/Android projects.',
);
