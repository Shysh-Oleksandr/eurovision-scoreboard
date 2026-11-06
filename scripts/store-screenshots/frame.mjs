/**
 * Puts each capture in a flat device outline (no tilt, shadow or glow) on
 * the slide's theme background, under a caption: a plain line, then the key
 * words as a board row in that theme's board colours (themes.ts).
 */
/* global document, getComputedStyle, Image -- page functions */
import { createReadStream, existsSync, readFileSync, statSync } from 'node:fs';
import http from 'node:http';
import path from 'node:path';

import { chromium } from 'playwright-core';
import sharp from 'sharp';

const HERE = path.dirname(new URL(import.meta.url).pathname);
const CAPTIONS = JSON.parse(readFileSync(path.join(HERE, 'captions.json'), 'utf8'));
const BUILDER_THEME = JSON.parse(
  readFileSync(path.join(HERE, 'builder-theme.json'), 'utf8'),
);
const hsl = (value) => (value.includes('(') ? value : `hsl(${value})`);
const o = BUILDER_THEME.overrides;

/** Board styles of the slides' themes (themes.ts countryItem colours). */
const BOARDS = {
  2026: {
    background: "url('/bgImages/GoldBg2026.webp') 50% 58% / cover no-repeat",
    douzeBg: 'hsl(40, 81%, 54%)',
    douzeText: '#000',
    pointsBg: 'hsl(245, 50%, 21%)',
    pointsText: '#fff',
    radius: '999px',
    font: "700 1em/1 Gotham, sans-serif",
    uppercase: true,
  },
  2025: {
    background: "url('/bgImages/PurpleBg2025.webp') 30% 50% / cover no-repeat",
    douzeBg: 'hsl(180, 95%, 44%)',
    douzeText: 'hsl(227, 81%, 29%)',
    pointsBg: '#fff',
    pointsText: '#000',
    radius: '4px',
    font: "700 1em/1 Montserrat, Gotham, sans-serif",
    uppercase: false,
  },
  2023: {
    background: "url('/bgImages/BlueBg2023.webp') 50% 50% / cover no-repeat",
    douzeBg: 'hsl(58, 100%, 50%)',
    douzeText: 'hsl(329, 99%, 50%)',
    pointsBg: 'hsl(329, 99%, 50%)',
    pointsText: '#fff',
    radius: '3px',
    font: "700 1em/1 Montserrat, Gotham, sans-serif",
    uppercase: true,
  },
  2022: {
    background: "url('/bgImages/DarkRedBg2022.webp') 50% 50% / cover no-repeat",
    douzeBg: 'hsl(21, 95%, 36%)',
    douzeText: 'hsl(272, 87%, 97%)',
    pointsBg: 'hsl(309, 52%, 18%)',
    pointsText: 'hsl(272, 87%, 97%)',
    radius: '3px',
    font: "700 1em/1 Montserrat, Gotham, sans-serif",
    uppercase: true,
  },
  // The theme open in the builder (builder-theme.json).
  builder: {
    background: `url('${BUILDER_THEME.backgroundImageUrl}') 50% 50% / cover no-repeat`,
    douzeBg: o['countryItem.douzePointsBg'],
    // The theme's douze text is red on that green: white reads at caption size.
    douzeText: '#fff',
    pointsBg: hsl(o['countryItem.juryPointsBg']),
    pointsText: hsl(o['countryItem.juryPointsText']),
    radius: BUILDER_THEME.roundedCountryContainer ? '999px' : '3px',
    font: "700 1em/1 'Cabinet Grotesk', Gotham, sans-serif",
    uppercase: true,
  },
};

/** Store order: scene, board style. */
export const SLIDES = [
  ['scoreboard', 2026],
  ['winner', 2026],
  ['setup', 2026],
  ['publicthemes', 2026],
  ['builder', 'builder'],
  ['contests', 2023],
  ['stats', 2025],
  ['share', 2022],
];

const FONT_FILES = {
  "'Gotham Caption'": ['Gotham-Black', 900],
  Gotham: ['Gotham-Bold', 700],
  Montserrat: ['Montserrat-Bold', 700],
  "'Cabinet Grotesk'": ['cabinet-grotesk-700', 700],
};

const page = ({ device, board, lead, label, points, shot, lang }) => {
  const b = BOARDS[board];
  const { canvas, viewport, frame, caption } = device;
  const screenH = (frame.screen * viewport.height) / viewport.width;
  const outerW = frame.screen + frame.bezel * 2;
  const left = (canvas.width - outerW) / 2;
  const k = frame.screen / viewport.width;
  const camera = {
    island: `<div style="position:absolute;top:${frame.bezel + 11 * k}px;left:50%;transform:translateX(-50%);width:${126 * k}px;height:${37 * k}px;border-radius:99px;background:#000"></div>`,
    punch: `<div style="position:absolute;top:${frame.bezel + 10 * k}px;left:50%;transform:translateX(-50%);width:${12}px;height:${12}px;border-radius:99px;background:#000"></div>`,
    dot: `<div style="position:absolute;top:${frame.bezel / 2 - 3}px;left:50%;transform:translateX(-50%);width:6px;height:6px;border-radius:99px;background:#1c1c22"></div>`,
  }[frame.camera];
  const rowH = caption.row;
  const faces = Object.entries(FONT_FILES)
    .map(
      ([family, [file, weight]]) =>
        `@font-face{font-family:${family};font-weight:${weight};src:url('/fonts/${file}.woff2') format('woff2')}`,
    )
    .join('');
  const inline = caption.layout === 'inline';

  return /* html */ `<!doctype html>
<html lang="${lang}"><meta charset="utf-8">
<style>
  ${faces}
  html, body { margin: 0; width: ${canvas.width}px; height: ${canvas.height}px; overflow: hidden; }
  body { position: relative; background: #020615 ${b.background}; }
  .cap {
    position: absolute; top: ${caption.top}px; left: ${left}px; right: ${left}px;
    display: flex; ${inline ? 'align-items: center; justify-content: center; gap: 22px;' : 'flex-direction: column; gap: 14px;'}
  }
  .lead {
    font: 900 ${caption.lead}px/1.08 'Gotham Caption', Gotham, sans-serif; letter-spacing: -0.03em; color: #fff;
    white-space: nowrap; padding-left: 2px; ${inline ? 'flex: none; max-width: 52%;' : ''}
  }
  .row {
    display: flex; align-items: center; overflow: hidden; height: ${rowH}px; min-width: 0;
    border-radius: ${b.radius}; background: ${b.douzeBg}; color: ${b.douzeText};
    ${inline ? `flex: 0 1 auto;` : ''}
  }
  .label {
    flex: 1; min-width: 0; white-space: nowrap; font: ${b.font}; font-size: ${Math.round(rowH * 0.43)}px;
    padding: 0 ${Math.round(rowH * 0.42)}px; ${b.uppercase ? 'text-transform: uppercase;' : ''}
  }
  .points {
    align-self: stretch; flex: none; min-width: ${Math.round(rowH * 1.38)}px; padding: 0 ${Math.round(rowH * 0.24)}px;
    box-sizing: border-box; display: flex; align-items: center; justify-content: center;
    border-radius: ${b.radius}; background: ${b.pointsBg}; color: ${b.pointsText};
    font: ${b.font}; font-size: ${Math.round(rowH * 0.47)}px;
  }
  .device {
    position: absolute; top: ${frame.top}px; left: ${left}px;
    width: ${outerW}px; height: ${screenH + frame.bezel * 2}px; box-sizing: border-box;
    padding: ${frame.bezel}px; border-radius: ${frame.radius + frame.bezel}px; background: #050508;
    box-shadow: 0 0 0 1px rgb(255 255 255 / 16%);
  }
  .device > img { display: block; width: ${frame.screen}px; height: ${screenH}px; border-radius: ${frame.radius}px; }
</style>
<div class="cap">
  <div class="lead">${lead}</div>
  <div class="row"><span class="label">${label}</span>${points ? `<span class="points">${points}</span>` : ''}</div>
</div>
<div class="device"><img src="${shot}">${camera}</div>
</html>`;
};

/** Shrinks the lead and the row label until each fits on one line. */
const fitText = () => {
  const fit = (el, minRatio) => {
    const start = parseFloat(getComputedStyle(el).fontSize);
    let size = start;

    while (el.scrollWidth > el.clientWidth + 0.5 && size > start * minRatio) {
      size -= 0.5;
      el.style.fontSize = `${size}px`;
    }
  };

  fit(document.querySelector('.lead'), 0.7);
  fit(document.querySelector('.label'), 0.62);
};

/**
 * Composes every captured scene of one device and locale into
 * outDir/NN-<scene>.png.
 */
export const composeFrames = async ({ device, locale, rawDir, outDir, scenes }) => {
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
  const written = [];

  try {
    const tab = await browser.newPage({
      viewport: device.canvas,
      deviceScaleFactor: device.scale,
    });

    for (const [index, [scene, board]] of SLIDES.entries()) {
      if (!scenes.includes(scene)) continue;
      if (!existsSync(path.join(rawDir, `${scene}.png`))) continue;
      const [lead, label, points] = CAPTIONS[locale][scene];

      html = page({
        device,
        board,
        lead,
        label,
        points,
        shot: `/raw/${scene}.png`,
        lang: locale === 'gr' ? 'el' : locale,
      });
      await tab.goto(`http://localhost:${server.address().port}/`);
      await tab.evaluate(async () => {
        const lead = document.querySelector('.lead');
        const label = document.querySelector('.label');

        await document.fonts.load(getComputedStyle(lead).font, lead.textContent);
        await document.fonts.load(getComputedStyle(label).font, label.textContent);
        await document.fonts.ready;
        // The background is CSS; load it like the screen image.
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
      const file = path.join(outDir, `${String(index + 1).padStart(2, '0')}-${scene}.png`);

      // Both stores refuse an alpha channel.
      await sharp(await tab.screenshot())
        .flatten({ background: '#000' })
        .png()
        .toFile(file);
      written.push(file);
    }
  } finally {
    await browser.close();
    server.close();
  }

  return written;
};
