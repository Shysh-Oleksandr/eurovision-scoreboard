#!/usr/bin/env node
/**
 * Writes a small copy of every built-in theme background
 * (public/bgImages/*.webp) to public/bgImages/thumbs/<same name>.webp:
 * 256×144, cropped to fill, WebP at quality 60, about 2 kB each. The setup
 * header's theme picker shows them on its tiles (`getThemeThumbnail` in
 * src/theme/themeThumbnails.ts); the full backgrounds are 15–180 kB each.
 *
 *   node scripts/theme-thumbnails.mjs
 *
 * Run from the package root after adding or replacing a background;
 * src/theme/themeThumbnails.test.ts fails while a theme's thumbnail is
 * missing.
 */
import fs from 'node:fs';
import path from 'node:path';

import sharp from 'sharp';

const SOURCE_DIR = 'public/bgImages';
const OUT_DIR = path.join(SOURCE_DIR, 'thumbs');
const WIDTH = 256;
const HEIGHT = 144;
const QUALITY = 60;

fs.mkdirSync(OUT_DIR, { recursive: true });

const sources = fs
  .readdirSync(SOURCE_DIR)
  .filter((file) => file.endsWith('.webp'));
let total = 0;

for (const file of sources) {
  const out = path.join(OUT_DIR, file);
  const info = await sharp(path.join(SOURCE_DIR, file))
    .resize(WIDTH, HEIGHT, { fit: 'cover' })
    .webp({ quality: QUALITY, effort: 6 })
    .toFile(out);

  total += info.size;
  console.log(`${out}  ${(info.size / 1024).toFixed(1)} kB`);
}

console.log(
  `${sources.length} thumbnails, ${(total / 1024).toFixed(1)} kB in all`,
);
