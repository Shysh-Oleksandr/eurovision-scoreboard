#!/usr/bin/env node
/**
 * Native project settings derived from the frontend env, applied after every
 * `cap sync` (the `capacitor:sync:after` hook in package.json).
 *
 * iOS: Google Sign-In needs the iOS OAuth client's *reversed* client ID as a
 * URL scheme in Info.plist, or the SDK throws at sign-in. It is derived from
 * NEXT_PUBLIC_GOOGLE_IOS_CLIENT_ID (the value the JS side passes to the
 * plugin), so the two can never drift. Other URL types are left alone.
 */
import { execFileSync } from 'node:child_process';
import { existsSync } from 'node:fs';

import nextEnv from '@next/env';

const INFO_PLIST = 'ios/App/App/Info.plist';
const GOOGLE_SCHEME_PREFIX = 'com.googleusercontent.apps.';

nextEnv.loadEnvConfig(process.cwd(), false, { info: () => {}, error: console.error });

const platform = process.env.CAPACITOR_PLATFORM_NAME;

if ((!platform || platform === 'ios') && existsSync(INFO_PLIST)) {
  if (process.platform !== 'darwin') {
    console.warn('[native-config] Skipping Info.plist: plutil needs macOS.');
  } else {
    syncGoogleUrlScheme();
  }
}

function syncGoogleUrlScheme() {
  const clientId = (process.env.NEXT_PUBLIC_GOOGLE_IOS_CLIENT_ID ?? '').trim();
  // 123-abc.apps.googleusercontent.com → com.googleusercontent.apps.123-abc
  const scheme = clientId ? clientId.split('.').reverse().join('.') : null;

  let urlTypes = [];

  try {
    urlTypes = JSON.parse(
      execFileSync(
        'plutil',
        ['-extract', 'CFBundleURLTypes', 'json', '-o', '-', INFO_PLIST],
        { encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'] },
      ),
    );
  } catch {
    // No URL types yet.
  }

  const others = urlTypes.filter(
    (type) =>
      !(type.CFBundleURLSchemes ?? []).some((s) =>
        s.startsWith(GOOGLE_SCHEME_PREFIX),
      ),
  );
  const next = scheme
    ? [
        ...others,
        { CFBundleURLName: 'google-sign-in', CFBundleURLSchemes: [scheme] },
      ]
    : others;

  if (JSON.stringify(next) === JSON.stringify(urlTypes)) return;

  if (next.length) {
    execFileSync('plutil', [
      '-replace',
      'CFBundleURLTypes',
      '-json',
      JSON.stringify(next),
      INFO_PLIST,
    ]);
  } else {
    execFileSync('plutil', ['-remove', 'CFBundleURLTypes', INFO_PLIST]);
  }

  console.log(
    scheme
      ? `[native-config] Info.plist: Google Sign-In URL scheme ${scheme}`
      : '[native-config] Info.plist: removed the Google Sign-In URL scheme (NEXT_PUBLIC_GOOGLE_IOS_CLIENT_ID is not set)',
  );
}

if (!process.env.NEXT_PUBLIC_GOOGLE_WEB_CLIENT_ID) {
  console.warn(
    '[native-config] NEXT_PUBLIC_GOOGLE_WEB_CLIENT_ID is not set: Google sign-in will not work in the apps (docs/native-apps.md §7).',
  );
}
