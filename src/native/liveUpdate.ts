import type { BundleInfo } from '@capgo/capacitor-updater';

import {
  bundleUpdateLevel,
  isBundleVersion,
  isNewerBundle,
  type LiveUpdateManifest,
  type LiveUpdatePlatform,
  parseManifest,
  parseStoreGate,
  pickBundleToApply,
  type StoreUpdateLevel,
  storeUpdateLevel,
} from './liveUpdateManifest';
import { IS_NATIVE_APP } from './platform';

import { APP_STORE_URL, PLAY_STORE_URL } from '@/config/appStores';
import { openOverlayCount } from '@/hooks/useBackHandler';

/**
 * Live updates (docs/native-apps.md §11): the apps download newer web
 * bundles published by `yarn live-update publish` and switch to them,
 * through @capgo/capacitor-updater in manual mode (no Capgo cloud). Native
 * code never changes this way: every bundle is filed under the native
 * runtime fingerprint it was built against (scripts/native-runtime.mjs), and
 * an app only reads the manifest of its own runtime.
 *
 * - `liveUpdateBoot()` runs once per launch and switches to a downloaded
 *   bundle before anything that must not be cut off by the reload (session
 *   restore, the splash hand-off), so the switch hides behind the splash.
 * - `confirmLiveBundle()` once the main view has mounted: the plugin rolls a
 *   bundle back to the last good one if this has not come within
 *   `appReadyTimeout` (capacitor.config.ts); the boot check then skips that
 *   version for good on this device.
 * - `startLiveUpdateChecks()` checks shortly after launch and on resume (at
 *   most hourly) and downloads a newer bundle. A resume after a long break
 *   switches to a downloaded one when nothing is open that could lose input.
 *   The manifest's update level (`publish --mode`) can also ask for a
 *   restart prompt or a blocking update, and the store gate
 *   (`yarn live-update store`) for an update from the store; both reach the
 *   UI through `subscribeLiveUpdateNotices()` (LiveUpdateNotices).
 */

/** This bundle's version, the UTC build time; empty outside native exports. */
export const LIVE_BUNDLE_VERSION =
  process.env.NEXT_PUBLIC_LIVE_UPDATE_VERSION ?? '';

const BASE_URL = process.env.NEXT_PUBLIC_LIVE_UPDATE_URL ?? '';

const RUNTIMES: Record<LiveUpdatePlatform, string> = {
  ios: process.env.NEXT_PUBLIC_LIVE_UPDATE_RUNTIME_IOS ?? '',
  android: process.env.NEXT_PUBLIC_LIVE_UPDATE_RUNTIME_ANDROID ?? '',
};

/** Store listings, for a store gate that names none. */
const STORE_URLS: Record<LiveUpdatePlatform, string> = {
  ios: APP_STORE_URL,
  android: PLAY_STORE_URL,
};

/** Longest the launch waits for the plugin before carrying on without it. */
const BOOT_DEADLINE_MS = 8000;
const FIRST_CHECK_DELAY_MS = 10_000;
const CHECK_INTERVAL_MS = 60 * 60 * 1000;
/**
 * A resume after this long in the background is a new session in all but
 * name (the OS often kills the app by then anyway), so a downloaded bundle
 * may switch in behind the splash. Short trips away (sharing, copying a
 * link, a notification) never reload the app.
 */
const RESUME_SWITCH_AFTER_MS = 30 * 60 * 1000;
const FAILED_VERSIONS_KEY = 'live-update-failed';
const DISMISSED_STORE_KEY = 'live-update-store-dismissed';

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

  try {
    localStorage.setItem(FAILED_VERSIONS_KEY, JSON.stringify(versions));
  } catch {
    // Storage blocked: the version may be tried again, and rolled back again.
  }
}

// ---------------------------------------------------------------- notices

/** A bundle that wants more than a silent switch on the next launch. */
export type BundleNotice =
  | { level: 'prompt'; version: string }
  | {
      level: 'required';
      version: string;
      phase: 'downloading' | 'failed' | 'restarting';
      /** Download progress, 0–100. */
      percent: number;
    };

/** The store gate's verdict for this binary. */
export type StoreNotice = {
  level: StoreUpdateLevel;
  /** The store version the gate asks for. */
  version: string;
  url: string;
};

export type LiveUpdateNotices = {
  bundle: BundleNotice | null;
  store: StoreNotice | null;
};

let notices: LiveUpdateNotices = { bundle: null, store: null };
const noticeListeners = new Set<() => void>();
/** Prompts the user waved away this session; the bundle still applies later. */
const dismissedPrompts = new Set<string>();

function setNotices(patch: Partial<LiveUpdateNotices>): void {
  notices = { ...notices, ...patch };
  noticeListeners.forEach((listener) => listener());
}

/** For `useSyncExternalStore`. */
export function subscribeLiveUpdateNotices(listener: () => void): () => void {
  noticeListeners.add(listener);

  return () => {
    noticeListeners.delete(listener);
  };
}

export const getLiveUpdateNotices = (): LiveUpdateNotices => notices;

/** "Later" on the restart prompt: it switches on the next launch instead. */
export function dismissBundlePrompt(): void {
  const { bundle } = notices;

  if (bundle?.level !== 'prompt') return;
  dismissedPrompts.add(bundle.version);
  setNotices({ bundle: null });
}

/** "Later" on the store toast: not shown again until a newer version is recommended. */
export function dismissStoreRecommendation(): void {
  const { store } = notices;

  if (store?.level !== 'recommended') return;

  try {
    localStorage.setItem(DISMISSED_STORE_KEY, store.version);
  } catch {
    // Storage blocked: it comes back on the next check.
  }
  setNotices({ store: null });
}

function dismissedStoreVersion(): string | null {
  try {
    return localStorage.getItem(DISMISSED_STORE_KEY);
  } catch {
    return null;
  }
}

/** Opens the store listing (Capacitor hands external URLs to the OS). */
export function openStoreListing(url: string): void {
  window.location.assign(url);
}

// ---------------------------------------------------------------- boot

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
  await switchToBundle(next);
}

/** Reloads the WebView into `bundle`, behind the splash. */
async function switchToBundle(bundle: BundleInfo): Promise<void> {
  console.info(`[live-update] switching to bundle ${bundle.version}`);

  const [{ CapacitorUpdater }, { SplashScreen }] = await Promise.all([
    import('@capgo/capacitor-updater'),
    import('@capacitor/splash-screen'),
  ]);

  // Brings the splash back (the launch one has usually timed out or been
  // hidden), so the reload stays covered; the new bundle hides it once it
  // has painted. Not awaited: with autoHide, show() only resolves once the
  // splash is gone.
  SplashScreen.show({
    autoHide: true,
    showDuration: 10_000,
    fadeInDuration: 0,
  }).catch(() => undefined);
  await CapacitorUpdater.set({ id: bundle.id });
  // set() reloads the WebView. Should it ever return instead, carry on.
  await sleep(5000);
}

/**
 * Switches to a downloaded bundle mid-session (the restart prompt, a
 * required update, a resume after a long break). False when there is none.
 * Waits for a token refresh in flight: the reload must not land between
 * the server rotating the refresh token and the app storing it.
 */
export async function restartIntoUpdate(): Promise<boolean> {
  if (!(await liveUpdateContext())) return false;

  const { CapacitorUpdater } = await import('@capgo/capacitor-updater');
  const { bundles } = await CapacitorUpdater.list();
  const next = pickBundleToApply(
    bundles,
    LIVE_BUNDLE_VERSION,
    failedVersions(),
  );

  if (!next) return false;

  const { waitForTokenRefreshes } = await import('@/state/useAuthStore');

  await waitForTokenRefreshes();
  await switchToBundle(next);

  return true;
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

// ---------------------------------------------------------------- checks

let checksStarted = false;
let checking = false;
let lastCheckAt = 0;
let activeContext: LiveUpdateContext | null = null;

/**
 * Whether a reload would lose nothing the user is in the middle of. Event
 * Setup, the usual first screen, is itself a modal, so one overlay is fine;
 * anything on top of it (an editor, a dialog, a menu), the graphics editor
 * or a focused field may hold unsaved input.
 */
function isQuietMoment(): boolean {
  if (openOverlayCount() > 1) return false;
  if (document.querySelector('.gfx-editor')) return false;

  const active = document.activeElement;

  return !(
    active instanceof HTMLElement &&
    (active.isContentEditable ||
      ['INPUT', 'TEXTAREA', 'SELECT'].includes(active.tagName))
  );
}

/** Starts the update checks (once per launch, after the boot check). */
export function startLiveUpdateChecks(): void {
  if (checksStarted || !IS_NATIVE_APP) return;
  checksStarted = true;

  (async () => {
    const context = await liveUpdateContext();

    if (!context) return;
    activeContext = context;

    await liveUpdateBoot();

    const { App } = await import('@capacitor/app');
    let pausedAt = 0;

    window.setTimeout(() => void checkForUpdate(context), FIRST_CHECK_DELAY_MS);
    await App.addListener('pause', () => {
      pausedAt = Date.now();
    });
    await App.addListener('resume', () => {
      const away = pausedAt ? Date.now() - pausedAt : 0;

      pausedAt = 0;

      (async () => {
        if (
          away >= RESUME_SWITCH_AFTER_MS &&
          isQuietMoment() &&
          (await restartIntoUpdate())
        ) {
          return;
        }

        if (Date.now() - lastCheckAt >= CHECK_INTERVAL_MS) {
          await checkForUpdate(context);
        }
      })().catch((error) => warn('resume', error));
    });
  })().catch((error) => warn('start', error));
}

/** "Try again" on a required update whose download failed. */
export function retryRequiredUpdate(): void {
  if (activeContext) void checkForUpdate(activeContext);
}

/** GETs a JSON file under the base URL; null on 404 (nothing published). */
async function fetchUpdateFile(relPath: string): Promise<unknown | null> {
  // Native HTTP: no CORS allowlist needed on the CDN.
  const { CapacitorHttp } = await import('@capacitor/core');
  const res = await CapacitorHttp.get({
    url: `${BASE_URL}/${relPath}`,
    // Past any edge cache; the object itself is `no-cache`.
    params: { t: String(Date.now()) },
    responseType: 'json',
    connectTimeout: 15000,
    readTimeout: 15000,
  });

  if (res.status === 404) return null;
  if (res.status < 200 || res.status >= 300) {
    throw new Error(`${relPath}: HTTP ${res.status}`);
  }

  return res.data;
}

async function fetchManifest({
  platform,
  runtime,
}: LiveUpdateContext): Promise<LiveUpdateManifest | null> {
  const data = await fetchUpdateFile(`${platform}/${runtime}.json`);

  if (data === null) return null;

  const manifest = parseManifest(data, {
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
    await Promise.all([checkStoreGate(context), checkBundle(context)]);
  } finally {
    checking = false;
  }
}

async function checkStoreGate({ platform }: LiveUpdateContext): Promise<void> {
  try {
    const data = await fetchUpdateFile(`${platform}/store.json`);
    const gate = data === null ? null : parseStoreGate(data, platform);

    if (!gate) {
      setNotices({ store: null });

      return;
    }

    const { App } = await import('@capacitor/app');
    const { version: appVersion } = await App.getInfo();
    const level = storeUpdateLevel(gate, appVersion);
    const version =
      level === 'required' ? gate.required : level ? gate.recommended : null;

    if (
      !level ||
      !version ||
      (level === 'recommended' && dismissedStoreVersion() === version)
    ) {
      setNotices({ store: null });

      return;
    }

    setNotices({
      store: { level, version, url: gate.url ?? STORE_URLS[platform] },
    });
  } catch (error) {
    warn('store check', error);
  }
}

async function checkBundle(context: LiveUpdateContext): Promise<void> {
  let required: string | null = null;

  try {
    const manifest = await fetchManifest(context);

    if (
      !manifest ||
      !isNewerBundle(manifest.version, LIVE_BUNDLE_VERSION) ||
      failedVersions().includes(manifest.version)
    ) {
      return;
    }

    const level = bundleUpdateLevel(manifest, LIVE_BUNDLE_VERSION);

    if (level === 'required') {
      required = manifest.version;
      setNotices({
        bundle: {
          level,
          version: manifest.version,
          phase: 'downloading',
          percent: 0,
        },
      });
    }

    await downloadBundle(manifest, (percent) => {
      if (required) {
        setNotices({
          bundle: {
            level: 'required',
            version: manifest.version,
            phase: 'downloading',
            percent,
          },
        });
      }
    });

    if (level === 'required') {
      setNotices({
        bundle: {
          level,
          version: manifest.version,
          phase: 'restarting',
          percent: 100,
        },
      });

      if (!(await restartIntoUpdate())) {
        throw new Error(`bundle ${manifest.version} is not ready to switch`);
      }
    } else if (level === 'prompt' && !dismissedPrompts.has(manifest.version)) {
      setNotices({ bundle: { level, version: manifest.version } });
    }
  } catch (error) {
    warn('check', error);

    if (required) {
      setNotices({
        bundle: {
          level: 'required',
          version: required,
          phase: 'failed',
          percent: 0,
        },
      });
    }
  }
}

/**
 * Downloads the manifest's bundle unless it already waits on the device,
 * replacing older downloads that never ran.
 */
async function downloadBundle(
  manifest: LiveUpdateManifest,
  onProgress: (percent: number) => void,
): Promise<void> {
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

  const progress = await CapacitorUpdater.addListener(
    'download',
    ({ percent, bundle }) => {
      if (bundle?.version === manifest.version) onProgress(percent);
    },
  );

  try {
    await CapacitorUpdater.download({
      url: manifest.url,
      version: manifest.version,
      checksum: manifest.checksum,
      sessionKey: manifest.sessionKey,
    });
  } finally {
    await progress.remove().catch(() => undefined);
  }

  console.info(`[live-update] downloaded bundle ${manifest.version}`);
}
