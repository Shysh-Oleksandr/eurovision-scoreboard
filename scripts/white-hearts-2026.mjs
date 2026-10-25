#!/usr/bin/env node
/**
 * Builds the white-outline 2026 heart flags (the "2026 white heart flags"
 * setting) into public/hostingCountryLogos/2026-white/<CODE>.svg, one for
 * every code in countryDefaultHostingLogos (src/theme/hosting.ts):
 *
 *   1. "Eurovision 2026 white heart - <Country>.svg" from Wikimedia Commons,
 *      when the participant / non-participant 2026 categories have one
 *   2. otherwise a heart generated from public/flags/<code>.svg, drawn the
 *      way the Commons ones are (flag stretched into the heart, same shear)
 *
 * then optimises them with svgo and writes the Commons authors and licences to
 * src/data/whiteHearts2026Credits.json (listed on /about). A code is in the
 * credits file exactly when its heart came from Commons.
 *
 *   node scripts/white-hearts-2026.mjs            all codes
 *   node scripts/white-hearts-2026.mjs MX KE      only these codes
 *   node scripts/white-hearts-2026.mjs --force    re-download Commons files
 *
 * Run from the package root. Commons files that already exist are kept, so a
 * re-run only hits Wikimedia for metadata. upload.wikimedia.org throttles
 * bursts (429 with a Retry-After of up to 10 minutes): downloads are paced.
 */
import { execFileSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';

const HOSTING_TS = 'src/theme/hosting.ts';
const FLAGS_DIR = 'public/flags';
const OUT_DIR = 'public/hostingCountryLogos/2026-white';
const CREDITS_FILE = 'src/data/whiteHearts2026Credits.json';
const SVGO_CONFIG = 'scripts/white-hearts-2026.svgo.config.mjs';

const args = process.argv.slice(2);
const force = args.includes('--force');
const onlyCodes = args.filter((arg) => !arg.startsWith('--'));

const API = 'https://commons.wikimedia.org/w/api.php';
// Wikimedia's User-Agent policy wants a contact URL; generic agents get throttled
const UA = 'DouzePoints-white-hearts/1.0 (https://douzepoints.app)';
const CATEGORIES = [
  'Category:Heart-flags of Eurovision (participated only, 2026 design)',
  'Category:Heart-flags of Eurovision (non-participated only, 2026 design)',
];

/** Commons names that Intl.DisplayNames doesn't produce. */
const NAME_OVERRIDES = {
  WW: 'Rest of the World',
  CS: 'Serbia and Montenegro',
  YU: 'Yugoslavia',
  XK: 'Kosovo',
  'GB-ENG': 'England',
  'GB-NIR': 'Northern Ireland',
  'GB-SCT': 'Scotland',
  'GB-WLS': 'Wales',
  CG: 'Republic of the Congo',
  CD: 'Democratic Republic of the Congo',
  CI: 'Ivory Coast',
  HK: 'Hong Kong',
  MO: 'Macau',
  PS: 'Palestine',
  TL: 'East Timor',
  TR: 'Turkey',
  MM: 'Myanmar',
  CZ: 'Czechia',
};

// --- Generated hearts --------------------------------------------------------

// Geometry shared by every 2026 heart on Commons (226.683 × 233.658 canvas)
const WIDTH = 226.683;
const HEIGHT = 233.658;
const HEART_OUTER =
  'M 99.722 231.541 C 101.585 233.574 104.305 233.076 105.56 230.435 C 135.35 167.569 225.843 139.135 225.843 59.033 C 225.843 29.922 206.246 0.69 168.566 0.013 C 132.699 -0.635 100.509 22.469 97.152 59.87 C 96.145 36.188 80.613 25.269 62.7 25.269 C 27.461 25.269 -1.402 57.081 0.053 104.952 C 2.474 180.242 74.855 203.964 99.722 231.541 Z';
const HEART_INNER =
  'M 93.326 77.913 C 94.282 81.669 98.865 81.54 99.901 77.823 C 115.414 21.593 186.748 15.446 186.748 72.384 C 186.748 117.336 107.075 165.298 101.007 207.969 C 86.591 179.973 33.638 164.6 33.638 103.747 C 33.638 51.96 83.991 41.08 93.326 77.913 Z';
// The tilt the Commons hearts draw their flags with: a vertical shear, so
// vertical stripes stay vertical and horizontal ones rise towards the right
const FLAG_TRANSFORM =
  'matrix(0.994606, -0.103721, 0, 1.005423, 23.808441, 38.133041)';
// The box (in the sheared space) the whole flag is stretched into: the
// heart's inner hole plus a margin. Stretching keeps hoist triangles, cantons
// and side stripes visible; centred emblems come out a little taller.
const FLAG_BOX = { x: 6, y: -20, width: 162, height: 208 };
// White inside the flag is nudged off-white so it doesn't merge into the
// outline, as the Commons white hearts do
const FLAG_WHITE = '#f9f9f9';
const WHITE_VALUE =
  /(fill|stroke|stop-color)(\s*[:=]\s*["']?)(#fff\b|#ffffff\b|white\b|rgb\(\s*255\s*,\s*255\s*,\s*255\s*\))/gi;

const toNestedSvg = (flagSvg) => {
  const svg = flagSvg
    .replace(/<\?xml[\s\S]*?\?>/g, '')
    .replace(/<!DOCTYPE[\s\S]*?>/gi, '')
    .replace(/<!--[\s\S]*?-->/g, '')
    .replace(/<metadata[\s\S]*?<\/metadata>/gi, '')
    .trim();

  const rootMatch = svg.match(/^<svg\b([^>]*)>/);

  if (!rootMatch) throw new Error('No <svg> root');
  let [, attrs] = rootMatch;
  const attr = (name) =>
    attrs.match(new RegExp(`\\s${name}\\s*=\\s*["']([^"']*)["']`))?.[1];

  const viewBox =
    attr('viewBox') ??
    `0 0 ${parseFloat(attr('width'))} ${parseFloat(attr('height'))}`;

  attrs = attrs
    .replace(
      /\s(width|height|x|y|viewBox|preserveAspectRatio|id|version)\s*=\s*["'][^"']*["']/g,
      '',
    )
    .replace(
      /\sfill\s*=\s*["'](?:#fff|#ffffff|white)["']/i,
      ` fill="${FLAG_WHITE}"`,
    );

  const body = svg.slice(rootMatch[0].length).replace(/<\/svg>\s*$/, '');
  const { x, y, width, height } = FLAG_BOX;

  return (
    `<svg${attrs} x="${x}" y="${y}" width="${width}" height="${height}" ` +
    `viewBox="${viewBox}" preserveAspectRatio="none" overflow="visible">` +
    body.replace(WHITE_VALUE, `$1$2${FLAG_WHITE}`) +
    '</svg>'
  );
};

const generateHeart = (flagSvg) => `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" viewBox="0 0 ${WIDTH} ${HEIGHT}" width="${WIDTH}" height="${HEIGHT}">
  <defs>
    <clipPath id="dp-heart-2026-clip"><path d="${HEART_OUTER}"/></clipPath>
  </defs>
  <g clip-path="url(#dp-heart-2026-clip)">
    <g transform="${FLAG_TRANSFORM}">
      ${toNestedSvg(flagSvg)}
    </g>
  </g>
  <path fill="#fff" d="${HEART_OUTER} ${HEART_INNER}"/>
</svg>
`;

// --- Commons -----------------------------------------------------------------

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

const fetchWithRetry = async (url) => {
  for (let attempt = 0; ; attempt += 1) {
    const res = await fetch(url, { headers: { 'User-Agent': UA } });

    if (res.status !== 429 || attempt === 5) return res;
    const wait = Number(res.headers.get('retry-after')) || 5 * 2 ** attempt;

    console.log(`  429 from Wikimedia, waiting ${wait}s`);
    await sleep(wait * 1000);
  }
};

const api = async (params) => {
  const url = `${API}?${new URLSearchParams({ format: 'json', ...params })}`;
  const res = await fetchWithRetry(url);

  if (!res.ok) throw new Error(`${res.status} ${url}`);

  return res.json();
};

const normalize = (name) =>
  name
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/&/g, 'and')
    .replace(/\bst\.\s/g, 'saint ')
    .replace(/[^a-z0-9]+/g, ' ')
    .trim();

const listCategory = async (title) => {
  const files = [];
  let cont = {};

  while (cont) {
    const data = await api({
      action: 'query',
      list: 'categorymembers',
      cmtitle: title,
      cmtype: 'file',
      cmlimit: '500',
      ...cont,
    });

    files.push(...data.query.categorymembers.map((m) => m.title));
    cont = data.continue ?? null;
  }

  return files;
};

/** Plain-country SVGs only: "Eurovision 2026 white heart - Name.svg". */
const indexWhiteHearts = (titles) => {
  const byName = new Map();

  for (const title of titles) {
    const m = title.match(/^File:Eurovision 2026 white heart - (.+)\.svg$/i);

    if (m && !m[1].includes('(')) byName.set(normalize(m[1]), title);
  }

  return byName;
};

const fetchImageInfo = async (titles) => {
  const info = new Map();

  for (let i = 0; i < titles.length; i += 50) {
    const data = await api({
      action: 'query',
      prop: 'imageinfo',
      iiprop: 'url|extmetadata',
      iiextmetadatafilter: 'LicenseShortName|Artist',
      titles: titles.slice(i, i + 50).join('|'),
    });

    for (const page of Object.values(data.query.pages)) {
      const ii = page.imageinfo?.[0];

      if (!ii) continue;
      info.set(page.title, {
        url: ii.url.split('?')[0],
        page: ii.descriptionurl,
        license: ii.extmetadata?.LicenseShortName?.value ?? 'unknown',
        author: (ii.extmetadata?.Artist?.value ?? 'unknown')
          .replace(/<[^>]+>/g, '')
          .trim()
          // Interwiki prefix of users linked to another wiki ("en:Name")
          .replace(/^[a-z]{2,3}:/, ''),
      });
    }
  }

  return info;
};

// Commons SVGs are user uploads: refuse anything that could run code or load
// external resources
const unsafeReason = (svg) => {
  if (/<script\b/i.test(svg)) return 'script';
  if (/\son[a-z]+\s*=/i.test(svg)) return 'event handler';
  if (/(?:xlink:)?href\s*=\s*["'](?!#|data:image\/)/i.test(svg))
    return 'external href';
  if (/<foreignObject\b/i.test(svg)) return 'foreignObject';

  return null;
};

// Several Inkscape uploads only have width/height; without a viewBox the
// heart doesn't scale with the <img> box in every browser
const ensureViewBox = (svg) =>
  svg.replace(/<svg\b[^>]*>/, (root) => {
    if (/\sviewBox\s*=/.test(root)) return root;
    const width = root.match(/\swidth\s*=\s*["']([\d.]+)/)?.[1];
    const height = root.match(/\sheight\s*=\s*["']([\d.]+)/)?.[1];

    if (!width || !height) throw new Error('Heart without viewBox or size');

    return root.replace(/^<svg\b/, `<svg viewBox="0 0 ${width} ${height}"`);
  });

// --- Main --------------------------------------------------------------------

const readCodes = () => {
  const src = fs.readFileSync(HOSTING_TS, 'utf8');
  const block = src.slice(src.indexOf('const countryDefaultHostingLogos'));
  const body = block.slice(0, block.indexOf('\n};'));

  return [
    ...body.matchAll(/^\s+'?([A-Z][A-Z-]*)'?: '\/hostingCountryLogos\//gm),
  ].map((m) => m[1]);
};

const commonsName = (code, displayNames) => {
  if (NAME_OVERRIDES[code]) return NAME_OVERRIDES[code];
  try {
    return displayNames.of(code);
  } catch {
    return code;
  }
};

const main = async () => {
  const allCodes = readCodes();
  const unknown = onlyCodes.filter((code) => !allCodes.includes(code));

  if (unknown.length) {
    throw new Error(`Not in countryDefaultHostingLogos: ${unknown.join(', ')}`);
  }
  const codes = onlyCodes.length ? onlyCodes : allCodes;

  fs.mkdirSync(OUT_DIR, { recursive: true });

  const titles = (await Promise.all(CATEGORIES.map(listCategory))).flat();
  const whiteByName = indexWhiteHearts(titles);
  const displayNames = new Intl.DisplayNames(['en'], { type: 'region' });
  const commonsTitles = new Map();

  for (const code of codes) {
    const title = whiteByName.get(normalize(commonsName(code, displayNames)));

    if (title) commonsTitles.set(code, title);
  }
  const info = await fetchImageInfo([...commonsTitles.values()]);

  const credits = fs.existsSync(CREDITS_FILE)
    ? JSON.parse(fs.readFileSync(CREDITS_FILE, 'utf8'))
    : {};
  const generated = [];
  const written = [];

  for (const code of codes) {
    const file = path.join(OUT_DIR, `${code}.svg`);
    const meta = info.get(commonsTitles.get(code));

    if (meta) {
      // Keep an existing Commons download (a credits entry means the file on
      // disk came from Commons, not the generator)
      const isDownloaded = fs.existsSync(file) && code in credits;

      credits[code] = {
        file: commonsTitles.get(code).replace(/^File:/, ''),
        page: meta.page,
        license: meta.license,
        author: meta.author,
      };
      if (isDownloaded && !force) continue;

      const res = await fetchWithRetry(meta.url);

      if (!res.ok) throw new Error(`${res.status} ${meta.url}`);
      const svg = await res.text();
      const reason = unsafeReason(svg);

      if (!reason) {
        fs.writeFileSync(file, ensureViewBox(svg));
        written.push(file);
        console.log(`${code}: Commons`);
        await sleep(2000);
        continue;
      }
      console.warn(`${code}: Commons file rejected (${reason}), generating`);
      delete credits[code];
    }

    delete credits[code];
    const flag = fs.readFileSync(
      path.join(FLAGS_DIR, `${code.toLowerCase()}.svg`),
      'utf8',
    );

    fs.writeFileSync(file, generateHeart(flag));
    written.push(file);
    generated.push(code);
  }

  if (written.length) {
    execFileSync(
      'npx',
      ['--yes', 'svgo@3.3.2', '--config', SVGO_CONFIG, '--quiet', ...written],
      { stdio: 'inherit' },
    );
  }

  const sortedCredits = Object.fromEntries(
    Object.entries(credits).sort(([a], [b]) => a.localeCompare(b)),
  );

  fs.writeFileSync(CREDITS_FILE, `${JSON.stringify(sortedCredits, null, 2)}\n`);

  console.log(
    `\n${codes.length - generated.length} from Commons, ${
      generated.length
    } generated` + (generated.length ? `: ${generated.join(' ')}` : ''),
  );
};

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
