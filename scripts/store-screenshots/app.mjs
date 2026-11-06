/**
 * Drives the real app (the static export) through the store scenes.
 *
 * A session is one browser context for one device and locale. Votes are the
 * real ESC 2026 final (esc2026-final.csv, from Wikipedia's detailed voting
 * tables), imported through the predefinition modal and replayed in the real
 * spokesperson order. Signed-in sessions talk to the throwaway backend
 * (backend.mjs); signed-out ones may only read the public theme list from
 * production.
 */
/* global document, window, innerHeight, localStorage, indexedDB, MutationObserver, fetch -- page functions */
import { readFileSync } from 'node:fs';
import path from 'node:path';

import sharp from 'sharp';

import {
  BACKEND_URL,
  REVIEW_CODE,
  REVIEW_EMAIL,
  dressTestAccount,
  resetSignInLimits,
} from './backend.mjs';
import { LOCALES, captureScale } from './devices.mjs';

const HERE = path.dirname(new URL(import.meta.url).pathname);
const VOTES_CSV = path.join(HERE, 'esc2026-final.csv');
const BUILDER_THEME = JSON.parse(
  readFileSync(path.join(HERE, 'builder-theme.json'), 'utf8'),
);
const API = 'https://api.douzepoints.app';

/** Juries announced before the hero shot: Denmark's 12 goes to Bulgaria next. */
const JURIES_BEFORE_HERO = 22;
/**
 * Moment of the douze points hearts to freeze (ms into the animation): the
 * hearts are sweeping across the row and haven't reached the name yet
 * (DouzePointsAnimation.tsx, .douze-heart-animated in styles.css).
 */
const DOUZE_FRAME_MS = 600;
/** The winner's real total, shown once the count-up ends. */
const WINNER_POINTS = '516';
/** Saved-contest library counts on the signed-in setup (mock numbers). */
const MOCK_SUMMARY = {
  followersCount: 48,
  followingCount: 31,
  customThemesCount: 7,
  savedThemesCount: 15,
  privateContestsCount: 6,
  publicContestsCount: 3,
  designsCount: 4,
  savedDesignsCount: 9,
};
/** Public GETs a signed-out session may make to production. */
const PUBLIC_GETS = [/^\/themes\/public$/, /^\/profiles\/[^/]+\/following-status$/];

export const messages = (locale) =>
  JSON.parse(readFileSync(`messages/${locale}.json`, 'utf8'));

// --- Page setup ------------------------------------------------------------

/** Runs in the page before any app code. */
const initPage = ({ insets, bottomBar, locale }) => {
  // mulberry32: the same votes, heart sizes and confetti on every run.
  let seed = 20260516;

  Math.random = () => {
    seed = (seed + 0x6d2b79f5) | 0;
    let x = Math.imul(seed ^ (seed >>> 15), 1 | seed);

    x = (x + Math.imul(x ^ (x >>> 7), 61 | x)) ^ x;

    return ((x ^ (x >>> 14)) >>> 0) / 4294967296;
  };
  localStorage.setItem('app-locale', locale);

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

// --- Helpers ---------------------------------------------------------------

const escapeRe = (text) => text.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

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

/**
 * Draws the status bar and home indicator and saves the screen, scrolled to
 * the top unless `keepScroll` (the share dialog scrolls to its result).
 */
const capture = async (session, scene, { keepScroll = false } = {}) => {
  const { page, device, rawDir } = session;
  const { chrome, insets, handle, viewport } = device;
  const draw = (handleColor) =>
    page.evaluate(drawSystemChrome, {
      chrome,
      insets,
      handle,
      handleColor,
      icons: ICONS,
    });

  if (!keepScroll) await scrollToTop(page);
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
  await sharp(await page.screenshot())
    .flatten({ background: '#000' })
    .png()
    .toFile(path.join(rawDir, `${scene}.png`));
  await page.evaluate(() =>
    document.getElementById('store-shot-chrome')?.remove(),
  );
};

/** Opens What's New once, which clears the unread dot on the feedback button. */
const markWhatsNewSeen = async ({ page, button, t }) => {
  await button(t.feedbackInfo.buttonTooltip).click();
  await page.getByText(t.feedbackInfo.whatsNew, { exact: true }).click();
  await page.waitForTimeout(400);
  await button(t.common.close).last().click();
  await page
    .getByText(t.feedbackInfo.whatsNew, { exact: true })
    .waitFor({ state: 'detached' });
  await page.waitForTimeout(500);
};

/**
 * Local settings, set before signing in: an account's synced settings win
 * over local ones once signed in, and a new account takes the local ones up.
 * Predefined voting on, Vote randomly giving 1–8 and 10, then the 12; and a
 * fixed theme year.
 */
const applySettings = async ({ page, button, t }, { themeYear }) => {
  await page.evaluate((year) => {
    const data = JSON.parse(localStorage.getItem('general-storage'));

    data.state.settings.enablePredefinedVotes = true;
    data.state.settings.useGroupedJuryPoints = true;
    data.state.settings.syncThemeWithContest = false;
    data.state.themeYear = year;
    localStorage.setItem('general-storage', JSON.stringify(data));
  }, themeYear);
  await page.reload();
  await button(t.common.start).waitFor();
  await page.waitForTimeout(800);
};

const signIn = async ({ page, button, t }) => {
  await button(t.widgets.profile.signIn).first().click();
  await page
    .getByText(t.widgets.profile.continueWithEmail, { exact: true })
    .first()
    .click();
  await page
    .getByPlaceholder(t.widgets.profile.emailSignIn.emailPlaceholder)
    .fill(REVIEW_EMAIL);
  await button(t.widgets.profile.emailSignIn.sendCode).click();
  await page.waitForTimeout(1200);
  await page.keyboard.type(REVIEW_CODE);
  await page.waitForTimeout(500);
  const go = button(t.widgets.profile.emailSignIn.signIn);

  if (await go.count()) await go.click().catch(() => {});
  // The profile modal opens after signing in.
  await button(t.common.close).last().waitFor({ timeout: 15000 });
  await page.waitForTimeout(1500);
  await button(t.common.close).last().click();
  await page.waitForTimeout(1200);
};

/**
 * Grand Final only, the real spokesperson order and the Rest of the World
 * (Voters → Load year data: the default voters are the participants A–Z),
 * then the real votes imported in the predefinition modal.
 */
const startGrandFinal = async ({ page, button, t }, { importVotes = true } = {}) => {
  const gfOnly = button(t.setup.eventSetupModal.grandFinalOnly);

  if ((await gfOnly.getAttribute('aria-pressed')) !== 'true') {
    await gfOnly.click();
    const confirm = button(t.common.confirm);

    if (await confirm.count()) await confirm.click();
  }
  await button(t.common.start).click();
  await page.getByRole('tab', { name: t.setup.eventStageModal.voters }).click();
  await button(t.common.loadYearData).click();
  await page.waitForTimeout(400);
  const [before, after] = t.setup.eventStageModal.startStage.split('{stageName}');

  await page
    .getByRole('button', {
      name: new RegExp(`^${escapeRe(before)}.+${escapeRe(after)}$`),
    })
    .last()
    .click();

  if (importVotes) {
    const input = page.locator('input[type="file"][accept=".xlsx,.xls,.csv"]');

    await input.first().waitFor({ state: 'attached', timeout: 20000 });
    await input.first().setInputFiles(VOTES_CSV);
    await page
      .getByText(
        t.setup.votingPredefinition.spreadsheet.importSuccess.split('{')[0],
      )
      .first()
      .waitFor({ timeout: 10000 });
  } else {
    // Another year: random votes for the whole matrix.
    await page.getByRole('button', { name: t.setup.votingPredefinition.randomizePoints }).first().click().catch(async () => {
      await page.getByRole('button', { name: /randomi[sz]e/i }).first().click();
    });
    await page.waitForTimeout(800);
    const sure = button(t.common.confirm);

    if (await sure.count()) await sure.click();
  }
  await page.waitForTimeout(800);
  await button(t.setup.votingPredefinition.saveVotes).click();
  await button(t.simulation.voteRandomly).waitFor({ timeout: 20000 });
  await page.waitForTimeout(1500);
};

/**
 * Gives the first 22 juries' votes, then Denmark's 1–8 and 10 and its 12 to
 * Bulgaria, and freezes the douze points hearts.
 */
const playToDouzePoints = async ({ page, button, t }) => {
  const voteRandomly = button(t.simulation.voteRandomly);

  for (let i = 0; i < JURIES_BEFORE_HERO * 2; i += 1) {
    await voteRandomly.click();
    await page.waitForTimeout(i % 2 ? 1300 : 1000);
  }
  await voteRandomly.click();
  await page.waitForTimeout(1600);
  await scrollToTop(page);
  await page.waitForTimeout(400);
  await voteRandomly.click();

  // The hearts start once the row has moved up.
  await page
    .locator('.douze-heart-animated')
    .first()
    .waitFor({ state: 'attached', timeout: 15000 });
  // The overlay can remount (a column-count change restarts it), so freeze,
  // let any remount happen, and freeze again.
  for (let pass = 0; pass < 2; pass += 1) {
    await page.evaluate((ms) => {
      for (const animation of document.getAnimations()) {
        if (!animation.animationName?.startsWith('douze')) continue;
        animation.pause();
        animation.currentTime = ms;
      }
    }, DOUZE_FRAME_MS);
    await page.waitForTimeout(400);
  }
  // The overlay draws a copy of the name over the row's own name, fading in;
  // in a still the two stack and the name looks bolder than in the app, so
  // only the row's own name shows (the hearts haven't reached it yet).
  await page.addStyleTag({
    content: '.douze-country-name-animated{visibility:hidden!important}',
  });
};

const resumeAnimations = (page) =>
  page.evaluate(() => {
    for (const animation of document.getAnimations()) animation.play();
  });

/** Finishes the jury and the televote and waits for the winner modal. */
const finishToWinner = async ({ page, button, t }) => {
  const winner = page.getByText(t.simulation.winnerModal.title);

  for (let i = 0; i < 4 && !(await winner.count()); i += 1) {
    const finish = button(t.simulation.finishRandomly);

    if (await finish.count()) await finish.click().catch(() => {});
    await page.waitForTimeout(2500);
  }
  await winner.waitFor({ timeout: 30000 });
  await scrollToTop(page);
  // The points count up.
  await page
    .getByText(new RegExp(`\\b${WINNER_POINTS}\\b`))
    .first()
    .waitFor({ timeout: 15000 })
    .catch(() => {});
  await page.waitForTimeout(800);
};

/** Closes the winner modal (a click on its overlay) without starting over. */
const closeWinner = async ({ page }) => {
  await page.mouse.click(page.viewportSize().width / 2, 100);
  await page.waitForTimeout(1500);
};

/**
 * In the app the confetti falls in front of everything; for the still it
 * moves into the winner overlay, between its dimmed backdrop and the card.
 */
const confettiBehindCard = (page) =>
  page.evaluate(() => {
    const canvas = [...document.querySelectorAll('canvas')].find(
      (c) => c.style.zIndex === '1000',
    );
    const card = [...document.querySelectorAll('div')].find(
      (d) => d.style.borderRadius === '22px' && d.style.position === 'relative',
    );
    const overlay = card?.parentElement;

    if (!canvas || !overlay) throw new Error('No confetti or winner card');
    Object.assign(canvas.style, { position: 'absolute', inset: '0', zIndex: '101' });
    card.style.zIndex = '200';
    overlay.insertBefore(canvas, card);
  });

// --- Sessions --------------------------------------------------------------

/**
 * Opens the app for one device and locale. `account` routes the API to the
 * throwaway backend; otherwise only the public theme list may reach
 * production.
 */
const openSession = async ({ browser, url, device, locale, rawDir, account, publicReads }) => {
  const t = messages(locale);
  const context = await browser.newContext({
    viewport: device.viewport,
    deviceScaleFactor: captureScale(device),
    userAgent: device.userAgent,
    hasTouch: true,
    locale: LOCALES[locale],
  });
  let page;

  await context.addInitScript(initPage, {
    insets: device.insets,
    bottomBar: device.bottomBar,
    locale,
  });
  // Fetched outside the page and answered with CORS headers: the API's
  // allowlist doesn't include this localhost origin.
  await context.route(/^https:\/\/api\.douzepoints\.app\//, async (route) => {
    const request = route.request();
    const { pathname } = new URL(request.url());
    const cors = {
      'access-control-allow-origin': new URL(page.url()).origin,
      'access-control-allow-credentials': 'true',
      'access-control-allow-headers': '*',
      'access-control-allow-methods': 'GET, POST, PUT, PATCH, DELETE, OPTIONS',
    };

    if (request.method() === 'OPTIONS') {
      return route.fulfill({ status: 204, headers: cors });
    }
    if (account) {
      if (account.mockSummary && pathname === '/profiles/me/summary') {
        return route.fulfill({
          status: 200,
          headers: { ...cors, 'content-type': 'application/json' },
          body: JSON.stringify(MOCK_SUMMARY),
        });
      }
      const response = await route.fetch({
        url: request.url().replace(API, BACKEND_URL),
      });

      return route.fulfill({ response, headers: { ...response.headers(), ...cors } });
    }
    if (
      publicReads &&
      request.method() === 'GET' &&
      PUBLIC_GETS.some((re) => re.test(pathname))
    ) {
      const response = await route.fetch();

      return route.fulfill({ response, headers: { ...response.headers(), ...cors } });
    }

    return route.abort();
  });
  page = await context.newPage();
  const button = (name) => page.getByRole('button', { name, exact: true });
  const session = { context, page, button, t, device, locale, rawDir };

  await page.goto(url);
  await button(t.common.start).waitFor();
  await markWhatsNewSeen(session);

  return session;
};

/** Scores the real final up to Denmark's douze points, then the winner. */
const mainSession = async (session, want) => {
  const { page, button, t } = session;

  if (want('publicthemes')) {
    await page.getByText(t.widgets.themes.title, { exact: true }).first().click();
    await page
      .getByText(t.widgets.themes.publicThemes, { exact: true })
      .first()
      .click();
    await page.waitForTimeout(1500);
    const sorted = page.waitForResponse(
      (r) =>
        r.url().includes('/themes/public') &&
        !r.url().includes('sortBy=createdAt'),
      { timeout: 45000 },
    );

    await button(t.widgets.sortBadges.mostLiked).first().click();
    await sorted;
    // The cards and their preview images.
    await page.waitForTimeout(3500);
    await capture(session, 'publicthemes');
    await button(t.common.close).last().click();
    await page.waitForTimeout(800);
  }
  if (!want('scoreboard') && !want('winner')) return;

  await applySettings(session, { themeYear: '2026' });
  await startGrandFinal(session);
  await playToDouzePoints(session);
  if (want('scoreboard')) {
    await capture(session, 'scoreboard');
    // The app removes the hearts 3 s after they start (ANIMATION_DURATION),
    // whatever the paused animations say.
    if (!(await page.locator('.douze-heart-animated').count())) {
      throw new Error('The douze points hearts ended before the screenshot');
    }
  }
  await resumeAnimations(page);
  if (!want('winner')) return;

  // Let the douze points animation end (ANIMATION_DURATION).
  await page.waitForTimeout(3500);
  await finishToWinner(session);
  await confettiBehindCard(page);
  await page.waitForTimeout(2000);
  await capture(session, 'winner');
};

/** The finished final in another year's theme: its stats or share image. */
const resultsSession = async (session, scene, themeYear) => {
  const { page, button, t } = session;

  await applySettings(session, { themeYear });
  await startGrandFinal(session);
  await finishToWinner(session);
  await closeWinner(session);
  if (scene === 'stats') {
    await page
      .getByRole('button', { name: t.simulation.phaseActions.viewStats })
      .first()
      .click();
    await page.waitForTimeout(2500);
  } else {
    await page
      .getByRole('button', { name: t.simulation.header.share })
      .first()
      .click();
    // The image is generated after the dialog opens.
    await page.waitForTimeout(5000);
  }
  await capture(session, scene, { keepScroll: scene === 'share' });
  await button(t.common.close).last().click().catch(() => {});
};

/**
 * The Graphics library counts this device's drafts (IndexedDB), not the
 * account's: a few placeholder records give it a mock number too. Nothing
 * opens them.
 */
const mockDesignDrafts = (page, count) =>
  page.evaluate(
    (n) =>
      new Promise((resolve, reject) => {
        const open = indexedDB.open('DouzePoints');

        open.onerror = () => reject(open.error);
        open.onsuccess = () => {
          const db = open.result;

          if (!db.objectStoreNames.contains('graphicsDesigns')) {
            db.close();
            reject(new Error('No graphicsDesigns store yet'));

            return;
          }
          const tx = db.transaction('graphicsDesigns', 'readwrite');

          for (let i = 1; i <= n; i += 1) {
            tx.objectStore('graphicsDesigns').put({ id: `store-shot-${i}`, name: `Design ${i}`, updatedAt: Date.now() });
          }
          tx.oncomplete = () => {
            db.close();
            resolve();
          };
          tx.onerror = () => reject(tx.error);
        };
      }),
    count,
  );

/** Signed in: the setup with the account's library, then the theme builder. */
const accountSession = async (session, want) => {
  const { page, button, t } = session;

  await mockDesignDrafts(page, MOCK_SUMMARY.designsCount);
  await applySettings(session, { themeYear: '2026' });
  await signIn(session);
  if (want('setup')) {
    await scrollToTop(page);
    await page.waitForTimeout(1500);
    await capture(session, 'setup');
  }
  if (want('builder')) {
    await page.getByText(t.widgets.themes.title, { exact: true }).first().click();
    await page.waitForTimeout(1500);
    // The theme card's pencil (other "Edit …" buttons sit behind the modal).
    await page
      .getByRole('button', { name: t.common.edit, exact: true })
      .last()
      .click();
    await page.waitForTimeout(1500);
    await page.getByRole('tab', { name: t.widgets.themes.tabs.look, exact: true }).first().click();
    await page.waitForTimeout(2500);
    await capture(session, 'builder');
  }
};

/** Signed in, 2023 theme: Your Contests, the real final first. */
const contestsSession = async (session) => {
  const { page, button, t } = session;

  await applySettings(session, { themeYear: '2023' });
  await signIn(session);
  await page.getByText(t.widgets.contests.title, { exact: true }).first().click();
  await page.waitForTimeout(2500);
  await button(t.widgets.sortBadges.oldest).first().click();
  await page.waitForTimeout(2500);
  await capture(session, 'contests');
};

/** Event Setup → Save, through the save dialog. */
const saveFromSetup = async ({ page, button, t }) => {
  await page
    .getByRole('button', { name: t.simulation.header.setup })
    .first()
    .click();
  await page.waitForTimeout(1500);
  await button(t.common.save).first().click();
  await page.waitForTimeout(1500);
  await page.getByRole('button', { name: t.common.save, exact: true }).last().click();
  await page.waitForTimeout(2500);
};

/** Another saved contest: a random simulation of another year. */
const saveRandomContest = async (session, year) => {
  const { page, button, t } = session;
  // Phones get a native <select> under the contest combo.
  const select = page.locator('#year-select-box');

  await select.selectOption(year);
  await page.waitForTimeout(800);
  // "Change contest?": the previous one is saved already.
  const confirm = button(t.common.confirm);

  if (await confirm.count()) await confirm.click();
  await page.waitForTimeout(1500);
  await startGrandFinal(session, { importVotes: false });
  await finishToWinner(session);
  await closeWinner(session);
  await saveFromSetup(session);
};

/**
 * Fills the test account once: the real 2026 final and two random
 * simulations saved (in the 2023 theme), the builder theme, the logo as the
 * avatar.
 */
const seedSession = async (session) => {
  const { page } = session;

  await applySettings(session, { themeYear: '2023' });
  await signIn(session);
  await startGrandFinal(session);
  await finishToWinner(session);
  await closeWinner(session);
  await saveFromSetup(session);
  for (const year of ['2025', '2024']) await saveRandomContest(session, year);

  const created = await page.evaluate(
    async ({ api, theme }) => {
      const { state } = JSON.parse(localStorage.getItem('auth-store'));
      const { $comment, ...body } = theme;
      const response = await fetch(`${api}/themes`, {
        method: 'POST',
        headers: {
          'content-type': 'application/json',
          authorization: `Bearer ${state.accessToken}`,
        },
        body: JSON.stringify(body),
      });

      return response.status;
    },
    { api: API, theme: BUILDER_THEME },
  );

  if (created >= 300) throw new Error(`Creating the builder theme: HTTP ${created}`);
  dressTestAccount();
};

/** Which session makes which scene. */
export const SESSIONS = [
  { name: 'main', scenes: ['publicthemes', 'scoreboard', 'winner'], publicReads: true, run: mainSession },
  { name: 'account', scenes: ['setup', 'builder'], account: { mockSummary: true }, run: accountSession },
  { name: 'contests', scenes: ['contests'], account: {}, run: contestsSession },
  { name: 'stats', scenes: ['stats'], run: (s) => resultsSession(s, 'stats', '2025') },
  { name: 'share', scenes: ['share'], run: (s) => resultsSession(s, 'share', '2022') },
];

/** Runs one session; on failure saves what the page showed. */
export const runSession = async (spec, options) => {
  // Every device and language signs in again; the throwaway backend's
  // sign-in rate limits would lock the review address after a few dozen.
  if (spec.account) resetSignInLimits();
  const browser = await options.device.browser.launch();
  let session;

  try {
    session = await openSession({ ...options, browser, account: spec.account, publicReads: spec.publicReads });
    const want = (scene) => options.scenes.includes(scene);

    await spec.run(session, want);
  } catch (error) {
    if (session) {
      await session.page
        .screenshot({ path: path.join(options.rawDir, `debug-${spec.name}.png`) })
        .catch(() => {});
    }
    throw error;
  } finally {
    await browser.close();
  }
};

export const seedAccount = (options) =>
  runSession({ name: 'seed', account: {}, run: seedSession }, { ...options, scenes: [] });
