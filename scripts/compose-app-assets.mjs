#!/usr/bin/env node
/**
 * Composes the source images @capacitor/assets turns into the iOS/Android
 * app icons and splash screens (Custom Mode, see its README):
 *
 *   assets/icon-only.png        1024² iOS icon (opaque)
 *   assets/icon-foreground.png  1024² Android adaptive icon foreground
 *   assets/icon-background.png  1024² Android adaptive icon background
 *   assets/splash.png           2732² launch screen
 *   assets/splash-dark.png      2732² launch screen (dark mode)
 *
 * Baseline art: the website's microphone favicon on the 2026 navy. Replace
 * the files in assets/ with real artwork at any time; then only
 * `yarn assets:native` is needed (this script is just the placeholder art).
 *
 *   node scripts/compose-app-assets.mjs && yarn assets:native
 */
import { mkdirSync } from 'node:fs';

import sharp from 'sharp';

const LOGO = 'public/img/favicon-512x512.png';
const OUT = 'assets';
const NAVY_EDGE = '#070b24';
const NAVY_CENTER = '#1c2360';

const background = (size) =>
  sharp(
    Buffer.from(
      `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}">
        <defs>
          <radialGradient id="g" cx="50%" cy="45%" r="70%">
            <stop offset="0%" stop-color="${NAVY_CENTER}"/>
            <stop offset="100%" stop-color="${NAVY_EDGE}"/>
          </radialGradient>
        </defs>
        <rect width="100%" height="100%" fill="url(#g)"/>
      </svg>`,
    ),
  ).png();

const logo = (size) =>
  sharp(LOGO).resize(size, size, { kernel: 'lanczos3' }).png().toBuffer();

const centered = async (canvas, logoSize) => ({
  input: await logo(logoSize),
  left: Math.round((canvas - logoSize) / 2),
  top: Math.round((canvas - logoSize) / 2),
});

mkdirSync(OUT, { recursive: true });

// iOS: opaque, the OS rounds the corners.
await background(1024)
  .composite([await centered(1024, 600)])
  .toFile(`${OUT}/icon-only.png`);

// Android adaptive icon: the launcher masks to a circle/squircle showing the
// centre ~66%, so the logo stays well inside it.
await sharp({
  create: {
    width: 1024,
    height: 1024,
    channels: 4,
    background: { r: 0, g: 0, b: 0, alpha: 0 },
  },
})
  .composite([await centered(1024, 470)])
  .png()
  .toFile(`${OUT}/icon-foreground.png`);
await background(1024).toFile(`${OUT}/icon-background.png`);

for (const name of ['splash', 'splash-dark']) {
  await background(2732)
    .composite([await centered(2732, 480)])
    .toFile(`${OUT}/${name}.png`);
}

console.log(`Wrote icon and splash sources to ${OUT}/`);
