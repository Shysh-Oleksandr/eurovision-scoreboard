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
  },
};

export default config;
