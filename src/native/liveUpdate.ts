import {
  isBundleVersion,
  isNewerBundle,
  type LiveUpdateManifest,
  type LiveUpdatePlatform,
  parseManifest,
  pickBundleToApply,
} from './liveUpdateManifest';
import { IS_NATIVE_APP } from './platform';

/**
 * Live updates (docs/native-apps.md §11): the apps download newer web
 * bundles published by `yarn live-update publish` and switch to them on the
 * next launch, through @capgo/capacitor-updater in manual mode (no Capgo
 * cloud). Native code never changes this way: every bundle is filed under
 * the native runtime fingerprint it was built against
 * (scripts/native-runtime.mjs), and an app only reads the manifest of its
 * own runtime.
 *
 * - `liveUpdateBoot()` runs once per launch and switches to a downloaded
 *   bundle before anything that must not be cut off by the reload (session
 *   restore, the splash hand-off), so the switch hides behind the splash.
 * - `confirmLiveBundle()` once the main view has mounted: the plugin rolls a
 *   bundle back to the last good one if this has not come within
 *   `appReadyTimeout` (capacitor.config.ts); the boot check then skips that
 *   version for good on this device.
 * - `startLiveUpdateChecks()` checks shortly after launch and on resume (at
 *   most hourly), and downloads a newer bundle for the next launch.
 */

/** This bundle's version, the UTC build time; empty outside native exports. */
export const LIVE_BUNDLE_VERSION =
  process.env.NEXT_PUBLIC_LIVE_UPDATE_VERSION ?? '';

const BASE_URL = process.env.NEXT_PUBLIC_LIVE_UPDATE_URL ?? '';

const RUNTIMES: Record<LiveUpdatePlatform, string> = {
  ios: process.env.NEXT_PUBLIC_LIVE_UPDATE_RUNTIME_IOS ?? '',
  android: process.env.NEXT_PUBLIC_LIVE_UPDATE_RUNTIME_ANDROID ?? '',
};

/** Longest the launch waits for the plugin before carrying on without it. */
const BOOT_DEADLINE_MS = 8000;
const FIRST_CHECK_DELAY_MS = 10_000;
const CHECK_INTERVAL_MS = 60 * 60 * 1000;
const FAILED_VERSIONS_KEY = 'live-update-failed';

type LiveUpdateContext = { platform: LiveUpdatePlatform; runtime: string };

const sleep = (ms: number) =>
  new Promise<void>((resolve) => window.setTimeout(resolve, ms));

const warn = (step: string, error: unknown) =>
  console.warn(`[live-update] ${step} failed`, error);

async function liveUpdateContext(): Promise<LiveUpdateContext | null> {
  if (!IS_NATIVE_APP || !isBundleVersion(LIVE_BUNDLE_VERSION) || !BASE_URL) {
    return null;
  }

  const { Capacitor } = await import('@capacitor/core');
  const platform = Capacitor.getPlatform();

  if (platform !== 'ios' && platform !== 'android') return null;
  if (!RUNTIMES[platform]) return null;
  if (!Capacitor.isPluginAvailable('CapacitorUpdater')) return null;

  return { platform, runtime: RUNTIMES[platform] };
}

function failedVersions(): string[] {
  try {
    const stored = JSON.parse(
      localStorage.getItem(FAILED_VERSIONS_KEY) ?? '[]',
    );

    return Array.isArray(stored) ? stored.filter(isBundleVersion) : [];
  } catch {
    return [];
  }
}

function rememberFailedVersion(version: string): void {
  if (!isBundleVersion(version)) return;

  const versions = [...new Set([...failedVersions(), version])].slice(-20);

  localStorage.setItem(FAILED_VERSIONS_KEY, JSON.stringify(versions));
}

let boot: Promise<void> | null = null;

type BootState = { switching: boolean; expired: boolean };

/**
 * Resolves once the launch may go on. When it switches to a downloaded
 * bundle the WebView reloads and this never resolves; await it before work
 * that must not be interrupted (a token refresh would lose the rotated
 * token). Safe to call anywhere: it does nothing on the website.
 */
export function liveUpdateBoot(): Promise<void> {
  if (!IS_NATIVE_APP) return Promise.resolve();

  if (!boot) {
    const state: BootState = { switching: false, expired: false };
    const applied = applyDownloadedBundle(state).catch((error) =>
      warn('boot', error),
    );
    const deadline = sleep(BOOT_DEADLINE_MS).then(async () => {
      // Once set() has been called, wait for it instead.
      if (state.switching) return applied;

      state.expired = true;

      return undefined;
    });

    boot = Promise.race([applied, deadline]);
  }

  return boot;
}

async function applyDownloadedBundle(state: BootState): Promise<void> {
  if (!(await liveUpdateContext())) return;

  const { CapacitorUpdater } = await import('@capgo/capacitor-updater');
  const [failed, { bundles }] = await Promise.all([
    CapacitorUpdater.getFailedUpdate(),
    CapacitorUpdater.list(),
  ]);

  // The plugin rolled back a bundle that never confirmed: don't retry it.
  if (failed?.bundle) {
    console.warn(
      `[live-update] bundle ${failed.bundle.version} was rolled back`,
    );
    rememberFailedVersion(failed.bundle.version);
  }

  const next = pickBundleToApply(
    bundles,
    LIVE_BUNDLE_VERSION,
    failedVersions(),
  );

  if (!next) return;

  if (state.expired) {
    console.warn(
      `[live-update] bundle ${next.version} waits for the next launch: the plugin answered too late`,
    );

    return;
  }

  state.switching = true;
  console.info(`[live-update] switching to bundle ${next.version}`);

  // Brings the splash back if the launch one already timed out, so the
  // reload stays covered; the new bundle hides it once it has painted. Not
  // awaited: with autoHide, show() only resolves once the splash is gone.
  const { SplashScreen } = await import('@capacitor/splash-screen');

  SplashScreen.show({
    autoHide: true,
    showDuration: 10_000,
    fadeInDuration: 0,
  }).catch(() => undefined);
  await CapacitorUpdater.set({ id: next.id });
  // set() reloads the WebView. Should it ever return instead, carry on.
  await sleep(5000);
}

let confirmed = false;

/** Tells the plugin this bundle works; call once the main view has mounted. */
export function confirmLiveBundle(): void {
  if (confirmed || !IS_NATIVE_APP) return;
  confirmed = true;

  (async () => {
    if (!(await liveUpdateContext())) return;

    const { CapacitorUpdater } = await import('@capgo/capacitor-updater');

    await CapacitorUpdater.notifyAppReady();
  })().catch((error) => warn('notifyAppReady', error));
}

let checksStarted = false;
let checking = false;
let lastCheckAt = 0;

/** Starts the update checks (once per launch, after the boot check). */
export function startLiveUpdateChecks(): void {
  if (checksStarted || !IS_NATIVE_APP) return;
  checksStarted = true;

  (async () => {
    const context = await liveUpdateContext();

    if (!context) return;

    await liveUpdateBoot();

    const { App } = await import('@capacitor/app');

    window.setTimeout(() => void checkForUpdate(context), FIRST_CHECK_DELAY_MS);
    await App.addListener('resume', () => {
      if (Date.now() - lastCheckAt >= CHECK_INTERVAL_MS) {
        void checkForUpdate(context);
      }
    });
  })().catch((error) => warn('start', error));
}

async function fetchManifest({
  platform,
  runtime,
}: LiveUpdateContext): Promise<LiveUpdateManifest | null> {
  // Native HTTP: no CORS allowlist needed on the CDN.
  const { CapacitorHttp } = await import('@capacitor/core');
  const res = await CapacitorHttp.get({
    url: `${BASE_URL}/${platform}/${runtime}.json`,
    // Past any edge cache; the object itself is `no-cache`.
    params: { t: String(Date.now()) },
    responseType: 'json',
    connectTimeout: 15000,
    readTimeout: 15000,
  });

  // Nothing published for this runtime (yet).
  if (res.status === 404) return null;
  if (res.status < 200 || res.status >= 300) {
    throw new Error(`manifest HTTP ${res.status}`);
  }

  const manifest = parseManifest(res.data, {
    platform,
    runtime,
    baseUrl: BASE_URL,
  });

  if (!manifest) throw new Error('invalid manifest');

  return manifest;
}

async function checkForUpdate(context: LiveUpdateContext): Promise<void> {
  if (checking) return;
  checking = true;
  lastCheckAt = Date.now();

  try {
    const manifest = await fetchManifest(context);

    if (
      !manifest ||
      !isNewerBundle(manifest.version, LIVE_BUNDLE_VERSION) ||
      failedVersions().includes(manifest.version)
    ) {
      return;
    }

    const { CapacitorUpdater } = await import('@capgo/capacitor-updater');
    const [{ bundles }, { bundle: current }] = await Promise.all([
      CapacitorUpdater.list(),
      CapacitorUpdater.current(),
    ]);

    if (
      bundles.some(
        (bundle) =>
          bundle.version === manifest.version && bundle.status === 'pending',
      )
    ) {
      return;
    }

    // Downloads that never ran are superseded by this one.
    for (const bundle of bundles) {
      if (bundle.status === 'pending' && bundle.id !== current.id) {
        await CapacitorUpdater.delete({ id: bundle.id }).catch(() => undefined);
      }
    }

    await CapacitorUpdater.download({
      url: manifest.url,
      version: manifest.version,
      checksum: manifest.checksum,
      sessionKey: manifest.sessionKey,
    });
    console.info(
      `[live-update] downloaded bundle ${manifest.version}; it applies on the next launch`,
    );
  } catch (error) {
    warn('check', error);
  } finally {
    checking = false;
  }
}
