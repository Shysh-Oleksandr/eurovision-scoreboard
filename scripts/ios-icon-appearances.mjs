#!/usr/bin/env node
/**
 * Adds the iOS 18+ tinted app icon to the asset catalog. @capacitor/assets
 * only writes the default 1024 icon and rewrites Contents.json, so this runs
 * after it (`yarn assets:native`). The source is assets/icon-tinted.png from
 * compose-app-assets.mjs. No dark variant: the default icon is already dark
 * navy, which iOS also uses in dark mode.
 */
import { copyFileSync, readFileSync, writeFileSync } from 'node:fs';

const SET = 'ios/App/App/Assets.xcassets/AppIcon.appiconset';
const TINTED = 'AppIcon-tinted.png';

copyFileSync('assets/icon-tinted.png', `${SET}/${TINTED}`);

const contents = JSON.parse(readFileSync(`${SET}/Contents.json`, 'utf8'));
contents.images = [
  ...contents.images.filter((image) => !image.appearances),
  {
    appearances: [{ appearance: 'luminosity', value: 'tinted' }],
    idiom: 'universal',
    platform: 'ios',
    size: '1024x1024',
    filename: TINTED,
  },
];
writeFileSync(`${SET}/Contents.json`, `${JSON.stringify(contents, null, 2)}\n`);

console.log(`Added the tinted icon to ${SET}`);
