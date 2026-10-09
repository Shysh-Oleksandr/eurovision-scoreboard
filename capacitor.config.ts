import type { CapacitorConfig } from '@capacitor/cli';

/**
 * Native (iOS/Android) shell. `webDir` is the static export produced by
 * `yarn build:native` (Next `output: 'export'`, see next.config.ts).
 *
 * NOTE: `appId` becomes the permanent bundle ID / package name once the app
 * is uploaded to App Store Connect or Google Play — change it before then
 * if needed.
 */
const config: CapacitorConfig = {
  appId: 'app.douzepoints',
  appName: 'DouzePoints',
  webDir: 'out',
};

export default config;
