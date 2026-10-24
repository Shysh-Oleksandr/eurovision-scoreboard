#!/usr/bin/env node
/**
 * App Store and Google Play screenshots, rendered from the app's own static
 * export, so they show the real UI at each store's exact pixel size
 * (docs/store-submission.md §6).
 *
 *   yarn build:native                       # once, and after UI changes
 *   yarn store-screenshots                  # every device and scene
 *   yarn store-screenshots --device iphone --scene scoreboard
 *   yarn store-screenshots --url http://localhost:3000   # a running dev server
 *
 * Output: assets/store/screenshots/<device>/<NN>-<scene>.png (gitignored).
 *
 * Every device gets a fresh browser: Playwright WebKit for the iOS sizes,
 * Chromium for Android. The page gets the device's safe-area insets through
 * --safe-area-inset-* (what Capacitor sets on Android, native-apps.md §4) and
 * a drawn status bar and home indicator / gesture handle, which a browser
 * doesn't have. Math.random is seeded, so every run plays the same contest.
 * API requests are blocked: the scenes need no account, and the export's API
 * is production.
 */
/* global document, window, innerHeight, MutationObserver -- page functions */
import {
  createReadStream,
  existsSync,
  mkdirSync,
  readFileSync,
  statSync,
} from 'node:fs';
import http from 'node:http';
import path from 'node:path';

import { chromium, devices, webkit } from 'playwright-core';
import sharp from 'sharp';

const OUT_DIR = 'out';
const SCREENSHOTS_DIR = 'assets/store/screenshots';
const t = JSON.parse(readFileSync('messages/en.json', 'utf8'));

/**
 * Store slots. Insets are the devices' safe areas in CSS px; iOS bars keep
 * only 14px clear of the home indicator (--safe-bottom-bar, styles.css).
 * `handle` is the home indicator / gesture handle.
 */
const DEVICES = {
  // App Store "iPhone with Dynamic Island (large display)", 6.9″: 1320×2868.
  // App Store Connect scales it down for the smaller iPhone slots.
  iphone: {
    browser: webkit,
    viewport: { width: 440, height: 956 },
    scale: 3,
    userAgent: devices['iPhone 15 Pro Max'].userAgent,
    insets: { top: 62, bottom: 34 },
    bottomBar: 14,
    chrome: 'ios-phone',
    handle: { width: 146, height: 5, bottom: 8 },
  },
  // App Store iPad 13″, landscape (the scoreboard uses the width): 2752×2064.
  ipad: {
    browser: webkit,
    viewport: { width: 1376, height: 1032 },
    scale: 2,
    userAgent: devices['iPad Pro 11 landscape'].userAgent,
    insets: { top: 24, bottom: 20 },
    bottomBar: 14,
    chrome: 'ios-tablet',
    handle: { width: 300, height: 5, bottom: 7 },
  },
  // Play phone, 9:16 (what Play asks for to be eligible for featuring):
  // 1242×2208.
  'android-phone': {
    browser: chromium,
    viewport: { width: 414, height: 736 },
    scale: 3,
    userAgent: devices['Pixel 8'].userAgent,
    insets: { top: 24, bottom: 24 },
    chrome: 'android',
    handle: { width: 108, height: 4, bottom: 10 },
  },
  // Play 7″ and 10″ tablet slots (the same files for both), which must be
  // 16:9: 2560×1440.
  'android-tablet': {
    browser: chromium,
    viewport: { width: 1280, height: 720 },
    scale: 2,
    userAgent: devices['Galaxy Tab S9'].userAgent,
    insets: { top: 24, bottom: 24 },
    chrome: 'android',
    handle: { width: 108, height: 4, bottom: 10 },
  },
};

/** In store order; the number is the file prefix. */
const SCENES = ['scoreboard', 'winner', 'setup'];

/** Jury votes given randomly before the one the hero shot is taken on. */
const RANDOM_JURY_VOTES = 16;
/**
 * Moment of the douze points hearts to freeze (ms into the animation): the
 * hearts are sweeping across the row and haven't reached the name yet
 * (DouzePointsAnimation.tsx, .douze-heart-animated in styles.css).
 */
const DOUZE_FRAME_MS = 600;

const args = process.argv.slice(2);
const listArg = (name, all) => {
  const i = args.indexOf(`--${name}`);

  if (i === -1) return all;
  const picked = args[i + 1].split(',');
  const unknown = picked.filter((value) => !all.includes(value));

  if (unknown.length) {
    console.error(`Unknown ${name} "${unknown}", expected ${all.join(', ')}`);
    process.exit(1);
  }

  return picked;
};
const deviceNames = listArg('device', Object.keys(DEVICES));
const scenes = listArg('scene', SCENES);
const urlArg = args.includes('--url') ? args[args.indexOf('--url') + 1] : null;

if (!urlArg && !existsSync(`${OUT_DIR}/index.html`)) {
  console.error(`No ${OUT_DIR}/index.html: run yarn build:native first`);
  process.exit(1);
}

// --- Static server ---------------------------------------------------------

const MIME = {
  '.css': 'text/css',
  '.html': 'text/html',
  '.ico': 'image/x-icon',
  '.jpg': 'image/jpeg',
  '.js': 'text/javascript',
  '.json': 'application/json',
  '.mp3': 'audio/mpeg',
  '.png': 'image/png',
  '.svg': 'image/svg+xml',
  '.txt': 'text/plain',
  '.webp': 'image/webp',
  '.woff2': 'font/woff2',
};

/** Serves out/ like Capacitor: paths without an extension get index.html. */
const serveExport = async () => {
  const server = http.createServer((req, res) => {
    const pathname = decodeURIComponent(new URL(req.url, 'http://x').pathname);
    const file = path.join(
      OUT_DIR,
      path.extname(pathname) ? pathname : 'index.html',
    );

    if (!existsSync(file) || statSync(file).isDirectory()) {
      res.writeHead(404).end();

      return;
    }
    res.writeHead(200, {
      'content-type': MIME[path.extname(file)] ?? 'application/octet-stream',
    });
    createReadStream(file).pipe(res);
  });

  await new Promise((resolve) => server.listen(0, resolve));

  return { server, url: `http://localhost:${server.address().port}` };
};

// --- Page setup ------------------------------------------------------------

/** Runs in the page before any app code. */
const initPage = ({ insets, bottomBar }) => {
  // mulberry32: the same votes, heart sizes and confetti on every run.
  let seed = 20260516;

  Math.random = () => {
    seed = (seed + 0x6d2b79f5) | 0;
    let x = Math.imul(seed ^ (seed >>> 15), 1 | seed);

    x = (x + Math.imul(x ^ (x >>> 7), 61 | x)) ^ x;

    return ((x ^ (x >>> 14)) >>> 0) / 4294967296;
  };

  // React owns <html>'s attributes, so the insets go in a <style> it doesn't
  // know about, put back if hydration drops it.
  const css = `html{--safe-area-inset-top:${
    insets.top
  }px;--safe-area-inset-bottom:${
    insets.bottom
  }px;--safe-area-inset-left:0px;--safe-area-inset-right:0px}${
    bottomBar === undefined
      ? ''
      : `:root{--safe-bottom-bar:${bottomBar}px!important}`
  }`;
  const addStyle = () => {
    if (!document.documentElement) return;
    if (document.getElementById('store-shot-insets')) return;
    const style = document.createElement('style');

    style.id = 'store-shot-insets';
    style.textContent = css;
    document.documentElement.appendChild(style);
  };

  addStyle();
  new MutationObserver(addStyle).observe(document, {
    childList: true,
    subtree: true,
  });
};

const ICONS = {
  iosSignal:
    '<svg width="18" height="12" viewBox="0 0 18 12" fill="#fff"><rect x="0" y="7.5" width="3" height="4.5" rx="1"/><rect x="5" y="5" width="3" height="7" rx="1"/><rect x="10" y="2.5" width="3" height="9.5" rx="1"/><rect x="15" y="0" width="3" height="12" rx="1"/></svg>',
  iosWifi:
    '<svg width="17" height="12" viewBox="0 0 17 12" fill="none" stroke="#fff" stroke-width="2" stroke-linecap="round"><path d="M2.1 4.6a9 9 0 0 1 12.8 0"/><path d="M4.7 7.2a5.4 5.4 0 0 1 7.6 0"/><path d="M8.5 11 6.9 9.4a2.3 2.3 0 0 1 3.2 0Z" fill="#fff"/></svg>',
  iosBattery:
    '<svg width="28" height="13" viewBox="0 0 28 13"><rect x="0.5" y="0.5" width="24" height="12" rx="3.8" fill="none" stroke="#fff" stroke-opacity=".35"/><rect x="2" y="2" width="21" height="9" rx="2.5" fill="#fff"/><path d="M26 4.4v4.2a2.3 2.3 0 0 0 0-4.2Z" fill="#fff" fill-opacity=".4"/></svg>',
  androidWifi:
    '<svg width="17" height="17" viewBox="0 0 24 24" fill="#fff"><path d="M1 9l2 2c4.97-4.97 13.03-4.97 18 0l2-2C16.93 2.93 7.08 2.93 1 9zm8 8l3 3 3-3c-1.65-1.66-4.34-1.66-6 0zm-4-4l2 2c2.76-2.76 7.24-2.76 10 0l2-2C15.14 9.14 8.87 9.14 5 13z"/></svg>',
  androidSignal:
    '<svg width="15" height="15" viewBox="0 0 24 24" fill="#fff"><path d="M2 22h20V2z"/></svg>',
  androidBattery:
    '<svg width="16" height="16" viewBox="0 0 24 24" fill="#fff"><path d="M15.67 4H14V2h-4v2H8.33C7.6 4 7 4.6 7 5.33v15.33C7 21.4 7.6 22 8.33 22h7.33c.74 0 1.34-.6 1.34-1.33V5.33C17 4.6 16.4 4 15.67 4z"/></svg>',
};

/**
 * The status bar, light as the apps' SystemBars style is DARK (light icons)
 * on every theme, and the home indicator / gesture handle in `handleColor`.
 */
const drawSystemChrome = ({ chrome, insets, handle, handleColor, icons }) => {
  document.getElementById('store-shot-chrome')?.remove();
  const root = document.createElement('div');

  root.id = 'store-shot-chrome';
  root.style.cssText =
    'position:fixed;inset:0;z-index:2147483647;pointer-events:none;color:#fff;';

  const bar = (html, css) => {
    const el = document.createElement('div');

    el.style.cssText = `position:absolute;left:0;right:0;display:flex;align-items:center;${css}`;
    el.innerHTML = html;
    root.appendChild(el);
  };
  const row = (...items) =>
    `<span style="display:flex;align-items:center;gap:6px">${items.join(
      '',
    )}</span>`;
  const top = `top:0;height:${insets.top}px;`;

  if (chrome === 'ios-phone') {
    // The Dynamic Island isn't part of a screenshot; the time and icons sit
    // centred in the two ears beside it.
    bar(
      `<span style="width:30%;text-align:center;font:600 17px/1 -apple-system,system-ui;letter-spacing:-.2px">9:41</span><span style="flex:1"></span><span style="width:30%;display:flex;justify-content:center">${row(
        icons.iosSignal,
        icons.iosWifi,
        icons.iosBattery,
      )}</span>`,
      `${top}padding:0 8px;`,
    );
  } else if (chrome === 'ios-tablet') {
    bar(
      `<span style="font:600 14px/1 -apple-system,system-ui">9:41&nbsp;&nbsp;Tue Jun 9</span><span style="flex:1"></span>${row(
        icons.iosWifi,
        '<span style="font:600 14px/1 -apple-system,system-ui">100%</span>',
        icons.iosBattery,
      )}`,
      `${top}padding:0 20px;`,
    );
  } else {
    bar(
      `<span style="font:500 14px/1 Roboto,'Google Sans',system-ui">12:00</span><span style="flex:1"></span>${row(
        icons.androidWifi,
        icons.androidSignal,
        icons.androidBattery,
      )}`,
      `${top}padding:0 20px;`,
    );
  }
  bar(
    `<span style="margin:auto;width:${handle.width}px;height:${handle.height}px;border-radius:${handle.height}px;background:${handleColor}"></span>`,
    `bottom:${handle.bottom}px;height:${handle.height}px;`,
  );

  // Outside <body>, which React renders.
  document.documentElement.appendChild(root);
};

// --- Scenes ----------------------------------------------------------------

const button = (page, name) => page.getByRole('button', { name, exact: true });

const scrollToTop = (page) =>
  page.evaluate(() => {
    window.scrollTo(0, 0);
    for (const el of document.querySelectorAll('*')) {
      if (el.scrollTop) el.scrollTop = 0;
    }
  });

/** Fonts loaded and every image on screen decoded. */
const settle = async (page) => {
  await page.evaluate(async () => {
    await document.fonts.ready;
    const onScreen = [...document.images].filter((img) => {
      const box = img.getBoundingClientRect();

      return box.bottom > 0 && box.top < innerHeight && box.width > 0;
    });

    await Promise.all(onScreen.map((img) => img.decode().catch(() => {})));
  });
  await page.waitForTimeout(300);
};

/** Opens What's New once, which clears the unread dot on the feedback button. */
const markWhatsNewSeen = async (page) => {
  await button(page, t.feedbackInfo.buttonTooltip).click();
  await page.getByText(t.feedbackInfo.whatsNew, { exact: true }).click();
  await page.waitForTimeout(400);
  await button(page, t.common.close).last().click();
  await page
    .getByText(t.feedbackInfo.whatsNew, { exact: true })
    .waitFor({ state: 'detached' });
  await page.waitForTimeout(500);
};

const startGrandFinal = async (page) => {
  await button(page, t.setup.eventSetupModal.grandFinalOnly).click();
  await button(page, t.common.confirm).click();
  await button(page, t.common.start).click();
  await button(
    page,
    t.setup.eventStageModal.startStage.replace('{stageName}', 'Grand Final'),
  ).click();
  await button(page, t.simulation.voteRandomly).waitFor();
  await page.waitForTimeout(1500);
};

/** Board rows in placing order, with the voting country flagged. */
const boardRows = (page) =>
  page.evaluate(() =>
    [...document.querySelectorAll('[data-flip-id]')]
      .map((row) => ({
        code: row.dataset.flipId,
        box: row.getBoundingClientRect(),
        isVoter: !!row.querySelector('button')?.disabled,
      }))
      // Wide layouts fill the columns one after the other.
      .sort(
        (a, b) => Math.round((a.box.x - b.box.x) / 100) || a.box.y - b.box.y,
      ),
  );

/**
 * Gives some jury votes randomly, then hands out the next country's points on
 * the top rows by hand and the 12 to the runner-up, and freezes its douze
 * points hearts.
 */
const playToDouzePoints = async (page) => {
  const voteRandomly = button(page, t.simulation.voteRandomly);

  for (let i = 0; i < RANDOM_JURY_VOTES; i += 1) {
    await voteRandomly.click();
    await page.waitForTimeout(1300);
  }

  const contenders = (await boardRows(page))
    .filter((row) => !row.isVoter)
    .map((row) => row.code);

  // 1–8 and 10 points, the lowest to the lowest placed.
  for (const code of contenders.slice(2, 11).reverse()) {
    await page.locator(`[data-flip-id="${code}"] button`).click();
    await page.waitForTimeout(900);
  }
  await scrollToTop(page);
  await page.waitForTimeout(600);
  await page.locator(`[data-flip-id="${contenders[1]}"] button`).click();

  // The hearts start once the row has moved up.
  await page
    .locator('.douze-heart-animated')
    .first()
    .waitFor({ state: 'attached', timeout: 15000 });
  await page.evaluate((ms) => {
    for (const animation of document.getAnimations()) {
      if (animation.animationName?.startsWith('douze')) {
        animation.pause();
        animation.currentTime = ms;
      }
    }
  }, DOUZE_FRAME_MS);
};

const resumeAnimations = (page) =>
  page.evaluate(() => {
    for (const animation of document.getAnimations()) animation.play();
  });

/** Finishes the jury and televote randomly and waits for the winner modal. */
const playToWinner = async (page) => {
  // Let the douze points animation end (ANIMATION_DURATION).
  await page.waitForTimeout(3500);
  await button(page, t.simulation.finishRandomly).click();
  await page.getByPlaceholder(t.simulation.enterPoints).waitFor();
  await page.waitForTimeout(1500);
  await button(page, t.simulation.finishRandomly).click();
  await page.getByText(t.simulation.winnerModal.title).waitFor();
  await scrollToTop(page);

  // The points count up; wait until the page's text stops changing (the
  // confetti is a canvas).
  let previous = '';

  for (let stable = 0; stable < 4; ) {
    await page.waitForTimeout(250);
    const text = await page.evaluate(() => document.body.innerText);

    stable = text === previous ? stable + 1 : 0;
    previous = text;
  }
  await page.waitForTimeout(400);
};

// --- Run -------------------------------------------------------------------

const capture = async (page, deviceName, scene) => {
  const { chrome, insets, handle, viewport } = DEVICES[deviceName];
  const draw = (handleColor) =>
    page.evaluate(drawSystemChrome, {
      chrome,
      insets,
      handle,
      handleColor,
      icons: ICONS,
    });

  await scrollToTop(page);
  await settle(page);

  // Like the real ones, the home indicator and gesture handle turn dark over
  // light content.
  await draw('transparent');
  const behindHandle = await page.screenshot({
    clip: {
      x: (viewport.width - handle.width) / 2,
      y: viewport.height - handle.bottom - handle.height,
      width: handle.width,
      height: handle.height,
    },
  });
  const { channels } = await sharp(behindHandle).stats();
  const luminance =
    (0.2126 * channels[0].mean +
      0.7152 * channels[1].mean +
      0.0722 * channels[2].mean) /
    255;

  await draw(luminance > 0.5 ? 'rgba(0,0,0,.85)' : '#fff');

  const file = path.join(
    SCREENSHOTS_DIR,
    deviceName,
    `${String(SCENES.indexOf(scene) + 1).padStart(2, '0')}-${scene}.png`,
  );
  // Both stores refuse an alpha channel.
  const { width, height } = await sharp(await page.screenshot())
    .flatten({ background: '#000' })
    .png()
    .toFile(file);

  console.log(`  ${file} (${width}×${height})`);
};

const shoot = async (url, deviceName) => {
  const device = DEVICES[deviceName];
  const browser = await device.browser.launch();

  try {
    const context = await browser.newContext({
      viewport: device.viewport,
      deviceScaleFactor: device.scale,
      userAgent: device.userAgent,
      hasTouch: true,
      locale: 'en-US',
    });

    await context.addInitScript(initPage, {
      insets: device.insets,
      bottomBar: device.bottomBar,
    });
    await context.route(/^https:\/\/api\.douzepoints\.app\//, (route) =>
      route.abort(),
    );
    const page = await context.newPage();
    const want = (scene) => scenes.includes(scene);

    await page.goto(url);
    await button(page, t.common.start).waitFor();
    await markWhatsNewSeen(page);

    if (want('setup')) await capture(page, deviceName, 'setup');
    if (!want('scoreboard') && !want('winner')) return;

    await startGrandFinal(page);
    await playToDouzePoints(page);
    if (want('scoreboard')) {
      await capture(page, deviceName, 'scoreboard');
      // The app removes the hearts 3 s after they start (ANIMATION_DURATION),
      // whatever the paused animations say.
      if (!(await page.locator('.douze-heart-animated').count())) {
        throw new Error('The douze points hearts ended before the screenshot');
      }
    }
    await resumeAnimations(page);

    if (!want('winner')) return;
    await playToWinner(page);
    await capture(page, deviceName, 'winner');
  } finally {
    await browser.close();
  }
};

const { server, url } = urlArg ? { url: urlArg } : await serveExport();

try {
  for (const deviceName of deviceNames) {
    mkdirSync(path.join(SCREENSHOTS_DIR, deviceName), { recursive: true });
    console.log(deviceName);
    await shoot(url, deviceName);
  }
} finally {
  server?.close();
}
