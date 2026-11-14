/**
 * The landscape banners (BANNERS in devices.mjs): the caption on the left,
 * the top of the real board on the right, on the 2026 theme's background.
 * The caption is the scoreboard slide's (captions.json): its lead line, then
 * its key words as a douze points board row. The rows come from one desktop
 * capture without the page background (bannerSession in app.mjs), so they sit
 * on the banner's own background with their glow.
 *
 * Laid out for 1200×630 and scaled by height for other sizes.
 */
/* global document, getComputedStyle, Image -- page functions */
import { createReadStream, existsSync, mkdirSync, readFileSync, statSync } from 'node:fs';
import http from 'node:http';
import path from 'node:path';

import { chromium } from 'playwright-core';
import sharp from 'sharp';

import { BANNERS } from './devices.mjs';

const HERE = path.dirname(new URL(import.meta.url).pathname);
const CAPTIONS = JSON.parse(readFileSync(path.join(HERE, 'captions.json'), 'utf8'));

/** The 2026 board's douze points row (themes.ts countryItem colours). */
const BOARD = {
  background: "url('/bgImages/GoldBg2026.webp') 50% 58% / cover no-repeat",
  douzeBg: 'hsl(40, 81%, 54%)',
  douzeText: '#000',
  pointsBg: 'hsl(245, 50%, 21%)',
  pointsText: '#fff',
};
/** Board places shown, from the top. */
const ROWS = 7;

/**
 * Board places 1–ROWS of the board's first column, cut in the gap above the
 * next row, with room for the rows' glow on the other sides.
 */
const rowsCrop = ({ board, rows }) => {
  const column = rows
    .filter((row) => Math.abs(row.x - board.x) < 2)
    .sort((a, b) => a.y - b.y);
  const [first] = column;
  const last = column[ROWS - 1];
  const glow = 10;
  const top = first.y - glow;
  const bottom = column[ROWS] ? column[ROWS].y - 1.5 : last.y + last.height + glow;

  return { x: first.x - glow, y: top, width: first.width + glow * 2, height: bottom - top };
};

const page = ({ canvas, lead, label, points, layout, lang }) => {
  const { width: W, height: H } = canvas;
  // Sizes are for 1200×630.
  const s = H / 630;
  const crop = rowsCrop(layout);
  const k = 1.55 * s;
  const rowsLeft = W - 52 * s - crop.width * k;
  const margin = 64 * s;
  const rowH = Math.round(74 * s);
  const brand = Math.round(34 * s);

  return /* html */ `<!doctype html>
<html lang="${lang}"><meta charset="utf-8">
<style>
  @font-face{font-family:'Gotham Caption';font-weight:900;src:url('/fonts/Gotham-Black.woff2') format('woff2')}
  @font-face{font-family:Gotham;font-weight:700;src:url('/fonts/Gotham-Bold.woff2') format('woff2')}
  html, body { margin: 0; width: ${W}px; height: ${H}px; overflow: hidden; }
  body { position: relative; background: #020615 ${BOARD.background}; }
  .brand {
    position: absolute; left: ${margin}px; top: ${52 * s}px;
    display: flex; align-items: center; gap: ${Math.round(brand * 0.3)}px;
    font: 700 ${Math.round(brand * 0.7)}px/1 Gotham, sans-serif; color: #fff; letter-spacing: -0.01em;
  }
  .brand img { width: ${brand}px; height: ${brand}px; }
  .cap {
    position: absolute; left: ${margin}px; top: 0; bottom: 0; width: ${rowsLeft - margin - 40 * s}px;
    display: flex; flex-direction: column; justify-content: center; gap: ${22 * s}px; padding-top: ${24 * s}px;
  }
  .lead {
    font: 900 ${Math.round(60 * s)}px/1.02 'Gotham Caption', Gotham, sans-serif; letter-spacing: -0.03em;
    color: #fff; text-wrap: balance;
  }
  .row {
    display: flex; align-items: center; align-self: flex-start; max-width: 100%; overflow: hidden;
    height: ${rowH}px; border-radius: 999px; background: ${BOARD.douzeBg}; color: ${BOARD.douzeText};
  }
  .label {
    flex: 0 1 auto; min-width: 0; white-space: nowrap; overflow: hidden; text-transform: uppercase;
    font: 700 ${Math.round(rowH * 0.43)}px/1 Gotham, sans-serif; padding: 0 ${Math.round(rowH * 0.42)}px;
  }
  .points {
    align-self: stretch; flex: none; min-width: ${Math.round(rowH * 1.38)}px; padding: 0 ${Math.round(rowH * 0.24)}px;
    box-sizing: border-box; display: flex; align-items: center; justify-content: center;
    border-radius: 999px; background: ${BOARD.pointsBg}; color: ${BOARD.pointsText};
    font: 700 ${Math.round(rowH * 0.47)}px/1 Gotham, sans-serif;
  }
  .board {
    position: absolute; left: ${rowsLeft}px; top: ${(H - crop.height * k) / 2}px;
    width: ${crop.width * k}px; height: ${crop.height * k}px; overflow: hidden;
    -webkit-mask-image: linear-gradient(to bottom, #000 calc(100% - ${16 * s}px), transparent);
  }
  .board img {
    position: absolute; left: ${-crop.x * k}px; top: ${-crop.y * k}px; max-width: none;
    width: ${layout.viewport.width * k}px; height: ${layout.viewport.height * k}px;
  }
</style>
<div class="brand"><img src="/img/brand/mark.png" alt="">DouzePoints</div>
<div class="cap">
  <div class="lead">${lead}</div>
  <div class="row"><span class="label">${label}</span>${points ? `<span class="points">${points}</span>` : ''}</div>
</div>
<div class="board"><img src="/raw/banner.png" alt=""></div>
</html>`;
};

/** Two lines at most for the lead, one for the row label: shrink until they fit. */
const fitText = () => {
  const lead = document.querySelector('.lead');
  const leadStart = parseFloat(getComputedStyle(lead).fontSize);
  let size = leadStart;

  while (
    (lead.getBoundingClientRect().height > size * 1.02 * 2 + 1 ||
      lead.scrollWidth > lead.clientWidth + 0.5) &&
    size > leadStart * 0.6
  ) {
    size -= 0.5;
    lead.style.fontSize = `${size}px`;
  }

  const label = document.querySelector('.label');
  const labelStart = parseFloat(getComputedStyle(label).fontSize);

  size = labelStart;
  while (label.scrollWidth > label.clientWidth + 0.5 && size > labelStart * 0.62) {
    size -= 0.5;
    label.style.fontSize = `${size}px`;
  }
};

/**
 * Composes `names` (BANNERS keys) for one locale from rawDir/banner.png into
 * outRoot/<name>/<file>.
 */
export const composeBanners = async ({ locale, rawDir, outRoot, names }) => {
  const MIME = { '.png': 'image/png', '.webp': 'image/webp', '.woff2': 'font/woff2' };
  let html = '';
  const server = http.createServer((req, res) => {
    const pathname = decodeURIComponent(new URL(req.url, 'http://x').pathname);

    if (pathname === '/') {
      res.writeHead(200, { 'content-type': 'text/html' }).end(html);

      return;
    }
    const file = pathname.startsWith('/raw/')
      ? path.join(rawDir, pathname.slice(5))
      : path.join('out', pathname);

    if (!existsSync(file) || statSync(file).isDirectory()) {
      res.writeHead(404).end();

      return;
    }
    res.writeHead(200, { 'content-type': MIME[path.extname(file)] ?? 'application/octet-stream' });
    createReadStream(file).pipe(res);
  });

  await new Promise((resolve) => server.listen(0, resolve));
  const browser = await chromium.launch();
  const layout = JSON.parse(readFileSync(path.join(rawDir, 'banner.json'), 'utf8'));
  const [lead, label, points] = CAPTIONS[locale].scoreboard;
  const written = [];

  try {
    for (const name of names) {
      const { canvas, file } = BANNERS[name];
      // Drawn at 2× and scaled down, for smoother edges than 1×.
      const tab = await browser.newPage({ viewport: canvas, deviceScaleFactor: 2 });

      html = page({ canvas, lead, label, points, layout, lang: locale === 'gr' ? 'el' : locale });
      await tab.goto(`http://localhost:${server.address().port}/`);
      await tab.evaluate(async () => {
        await document.fonts.ready;
        // The background is CSS; load it like the images.
        const bg = getComputedStyle(document.body).backgroundImage.match(
          /url\("?(.*?)"?\)/,
        )?.[1];
        const images = [...document.images];

        if (bg) {
          const img = new Image();

          img.src = bg;
          images.push(img);
        }
        await Promise.all(images.map((img) => img.decode().catch(() => {})));
      });
      await tab.waitForTimeout(150);
      await tab.evaluate(fitText);
      const out = path.join(outRoot, name, file);

      mkdirSync(path.dirname(out), { recursive: true });
      // Play takes JPEG or 24-bit PNG (no alpha); link previews get a small
      // JPEG (WhatsApp skips large ones).
      const image = sharp(await tab.screenshot())
        .resize(canvas.width, canvas.height)
        .flatten({ background: '#000' });

      await (file.endsWith('.jpg')
        ? image.jpeg({ quality: 86, mozjpeg: true })
        : image.png()
      ).toFile(out);
      await tab.close();
      written.push(out);
    }
  } finally {
    await browser.close();
    server.close();
  }

  return written;
};
