/// <reference types="@capgo/capacitor-updater" />
import { readFileSync } from 'node:fs';
import path from 'node:path';

import type { CapacitorConfig } from '@capacitor/cli';

/**
 * Native (iOS/Android) shell. `webDir` is the static export produced by
 * `yarn build:native` (Next `output: 'export'`, see next.config.ts and
 * docs/native-apps.md).
 *
 * NOTE: `appId` becomes the permanent bundle ID / package name once the app
 * is uploaded to App Store Connect or Google Play — change it before then
 * if needed.
 */

/** Navy of the splash art (assets/, scripts/compose-app-assets.mjs). */
const SPLASH_BACKGROUND = '#0B0F2E';

/**
 * Live updates are signed with ~/keys/douzepoints-live-update.pem; binaries
 * only install bundles that verify against this key, so replacing it cuts
 * off every installed app until it updates from the store
 * (docs/native-apps.md §11).
 */
const LIVE_UPDATE_PUBLIC_KEY = readFileSync(
  path.join(
    typeof __dirname === 'string' ? __dirname : process.cwd(),
    'live-update-public.pem',
  ),
  'utf8',
).trim();

const config: CapacitorConfig = {
  appId: 'app.douzepoints',
  appName: 'DouzePoints',
  webDir: 'out',
  // WebView colour before the first paint, so no white flash follows the
  // splash screen.
  backgroundColor: SPLASH_BACKGROUND,
  plugins: {
    SplashScreen: {
      // Safety net only: the app hides the splash as soon as its first screen
      // has painted (src/native/splash.ts).
      launchShowDuration: 4000,
      launchAutoHide: true,
      launchFadeOutDuration: 200,
      backgroundColor: SPLASH_BACKGROUND,
      showSpinner: false,
    },
    SystemBars: {
      // Light status and navigation bar icons: every theme is dark. The page
      // is edge to edge (`viewport-fit=cover`), so the theme shows behind the
      // bars; `--safe-*` in styles.css keeps content out from under them.
      style: 'DARK',
      // Android: assume `viewport-fit=cover` before the page has loaded.
      initialViewportFitValueHint: 'cover',
    },
    SocialLogin: {
      // Google on both platforms; Apple is offered on iOS only (the sign-in
      // buttons hide it on Android). docs/native-apps.md §7.
      providers: {
        google: true,
        apple: true,
        facebook: false,
        twitter: false,
      },
    },
    CapacitorUpdater: {
      // Manual mode: src/native/liveUpdate.ts reads our own manifests on R2
      // and decides when to download and switch.
      autoUpdate: false,
      // Never contact Capgo's cloud: no update checks, channel calls or stats
      // (which would include crash and JS error reports).
      updateUrl: '',
      channelUrl: '',
      statsUrl: '',
      // A bundle that hasn't called notifyAppReady() by then is rolled back.
      // Generous, so a slow phone never rolls back a working bundle.
      appReadyTimeout: 20000,
      // Seconds. On iOS this also caps the whole download (~8 MB).
      responseTimeout: 120,
      publicKey: LIVE_UPDATE_PUBLIC_KEY,
      // Its logs stay in Xcode / logcat instead of being echoed into the
      // WebView console line by line.
      disableJSLogging: true,
      // Defaults kept: a store update drops downloaded bundles
      // (resetWhenUpdate), failed and replaced bundles are deleted.
    },
  },
};

export default config;
