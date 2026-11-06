/**
 * Store slots, the capture size of the app on each, and the frame it sits
 * in (docs/store-submission.md §6).
 *
 * `canvas` is the store image in CSS px (× `scale`). The app runs at
 * `viewport` and is captured at `scale × frame.screen / viewport.width`, so
 * the capture lands 1:1 in a flat device outline `frame.screen` CSS px wide.
 * Insets are the devices' safe areas in CSS px; iOS bars keep only 14px clear
 * of the home indicator (--safe-bottom-bar, styles.css). `handle` is the home
 * indicator / gesture handle.
 */
import { chromium, devices, webkit } from 'playwright-core';

export const DEVICES = {
  // App Store "iPhone with Dynamic Island (large display)", 6.9″: 1320×2868.
  // App Store Connect scales it down for the smaller iPhone slots.
  iphone: {
    browser: webkit,
    userAgent: devices['iPhone 15 Pro Max'].userAgent,
    canvas: { width: 440, height: 956 },
    scale: 3,
    viewport: { width: 440, height: 956 },
    insets: { top: 62, bottom: 34 },
    bottomBar: 14,
    chrome: 'ios-phone',
    handle: { width: 146, height: 5, bottom: 8 },
    frame: { screen: 372, top: 196, bezel: 9, radius: 49, camera: 'island' },
    caption: { layout: 'stacked', top: 62, lead: 30, row: 58 },
  },
  // App Store iPad 13″, landscape (the scoreboard uses the width): 2752×2064.
  ipad: {
    browser: webkit,
    userAgent: devices['iPad Pro 11 landscape'].userAgent,
    canvas: { width: 1376, height: 1032 },
    scale: 2,
    viewport: { width: 1376, height: 1032 },
    insets: { top: 24, bottom: 20 },
    bottomBar: 14,
    chrome: 'ios-tablet',
    handle: { width: 300, height: 5, bottom: 7 },
    frame: { screen: 1000, top: 196, bezel: 16, radius: 26, camera: 'dot' },
    caption: { layout: 'inline', top: 70, lead: 46, row: 78 },
  },
  // Play phone, 9:16 (what Play asks for to be eligible for featuring):
  // 1242×2208.
  'android-phone': {
    browser: chromium,
    userAgent: devices['Pixel 8'].userAgent,
    canvas: { width: 414, height: 736 },
    scale: 3,
    viewport: { width: 414, height: 736 },
    insets: { top: 24, bottom: 24 },
    chrome: 'android',
    handle: { width: 108, height: 4, bottom: 10 },
    frame: { screen: 350, top: 176, bezel: 8, radius: 34, camera: 'punch' },
    caption: { layout: 'stacked', top: 48, lead: 28, row: 54 },
  },
  // Play 7″ and 10″ tablet slots (the same files for both), which must be
  // 16:9: 2560×1440.
  'android-tablet': {
    browser: chromium,
    userAgent: devices['Galaxy Tab S9'].userAgent,
    canvas: { width: 1280, height: 720 },
    scale: 2,
    viewport: { width: 1280, height: 720 },
    insets: { top: 24, bottom: 24 },
    chrome: 'android',
    handle: { width: 108, height: 4, bottom: 10 },
    frame: { screen: 880, top: 150, bezel: 14, radius: 22, camera: 'dot' },
    caption: { layout: 'inline', top: 44, lead: 38, row: 64 },
  },
};

/** Device pixel ratio the app is captured at for a 1:1 placement. */
export const captureScale = (device) =>
  (device.scale * device.frame.screen) / device.viewport.width;

/**
 * App locales (messages/<locale>.json) and what the browser reports for
 * them. `app-locale` in localStorage pins the choice (native-apps.md §5).
 */
export const LOCALES = {
  en: 'en-US',
  fr: 'fr-FR',
  de: 'de-DE',
  it: 'it-IT',
  pl: 'pl-PL',
  uk: 'uk-UA',
  gr: 'el-GR',
  es: 'es-ES',
  pt: 'pt-PT',
};
