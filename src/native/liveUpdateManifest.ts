/**
 * The pure half of live updates (src/native/liveUpdate.ts): the manifest
 * `yarn live-update publish` writes, and the version rules. Bundle versions
 * are the UTC build time, `YYYYMMDD.HHmmss`, so newer is a string compare.
 */
import type { BundleInfo } from '@capgo/capacitor-updater';

export type LiveUpdatePlatform = 'ios' | 'android';

/**
 * How urgently a running bundle should move to the published one:
 * - `silent`: on the next launch, or on a resume after a long break;
 * - `prompt`: also a "restart to update" toast once it has downloaded;
 * - `required`: a blocking screen that downloads it and restarts.
 */
export type BundleUpdateLevel = 'silent' | 'prompt' | 'required';

export type LiveUpdateManifest = {
  version: string;
  platform: LiveUpdatePlatform;
  runtime: string;
  /** The encrypted bundle zip. */
  url: string;
  /** SHA-256 of the plain zip, RSA-signed (hex). */
  checksum: string;
  /** `iv:key` (base64), the AES key RSA-signed. */
  sessionKey: string;
  /**
   * Running bundles older than this must switch now: the version of the
   * latest bundle published with `--mode required` for this runtime. Later
   * publishes carry it forward, so a user who skipped that bundle is still
   * made to update.
   */
  requiredVersion?: string;
  /** Running bundles older than this get the restart prompt (`--mode prompt`). */
  promptVersion?: string;
};

const VERSION_PATTERN = /^\d{8}\.\d{6}$/;

export const isBundleVersion = (value: unknown): value is string =>
  typeof value === 'string' && VERSION_PATTERN.test(value);

/** False when either side is not a bundle version (dev builds have none). */
export const isNewerBundle = (candidate: string, current: string) =>
  isBundleVersion(candidate) && isBundleVersion(current) && candidate > current;

const nonEmpty = (value: unknown): value is string =>
  typeof value === 'string' && value.length > 0;

/**
 * Validates a fetched manifest against what this app expects: its own
 * platform and runtime, and a bundle on the same origin as the manifests
 * (`baseUrl`). Returns null for anything else.
 */
export function parseManifest(
  data: unknown,
  expected: { platform: LiveUpdatePlatform; runtime: string; baseUrl: string },
): LiveUpdateManifest | null {
  let value = data;

  if (typeof value === 'string') {
    try {
      value = JSON.parse(value);
    } catch {
      return null;
    }
  }

  if (!value || typeof value !== 'object') return null;

  const {
    version,
    platform,
    runtime,
    url,
    checksum,
    sessionKey,
    requiredVersion,
    promptVersion,
  } = value as Record<string, unknown>;

  if (
    !isBundleVersion(version) ||
    platform !== expected.platform ||
    runtime !== expected.runtime ||
    !nonEmpty(url) ||
    !nonEmpty(checksum) ||
    !nonEmpty(sessionKey)
  ) {
    return null;
  }

  try {
    if (new URL(url).origin !== new URL(expected.baseUrl).origin) return null;
  } catch {
    return null;
  }

  return {
    version,
    platform: expected.platform,
    runtime: expected.runtime,
    url,
    checksum,
    sessionKey,
    // A malformed floor is ignored, never a reason to drop the update.
    ...(isBundleVersion(requiredVersion) ? { requiredVersion } : {}),
    ...(isBundleVersion(promptVersion) ? { promptVersion } : {}),
  };
}

/** How urgently `running` should move to the manifest's bundle. */
export function bundleUpdateLevel(
  manifest: Pick<LiveUpdateManifest, 'requiredVersion' | 'promptVersion'>,
  running: string,
): BundleUpdateLevel {
  if (
    manifest.requiredVersion &&
    isNewerBundle(manifest.requiredVersion, running)
  ) {
    return 'required';
  }

  if (
    manifest.promptVersion &&
    isNewerBundle(manifest.promptVersion, running)
  ) {
    return 'prompt';
  }

  return 'silent';
}

/**
 * The downloaded bundle to switch to at launch: the newest one that was
 * downloaded but never run, is newer than the running bundle and has not
 * failed on this device before.
 */
export function pickBundleToApply(
  bundles: BundleInfo[],
  currentVersion: string,
  failedVersions: string[],
): BundleInfo | null {
  let best: BundleInfo | null = null;

  for (const bundle of bundles) {
    if (
      bundle.status === 'pending' &&
      isNewerBundle(bundle.version, currentVersion) &&
      !failedVersions.includes(bundle.version) &&
      (!best || bundle.version > best.version)
    ) {
      best = bundle;
    }
  }

  return best;
}

// ---------------------------------------------------------------- store gate

/**
 * `<platform>/store.json`, written by `yarn live-update store`: the oldest
 * store versions (the app's marketing version, `1.2`) that may keep running
 * or that are still current enough not to be nudged. Every binary reads it,
 * whatever its native runtime, so it reaches apps that live updates can't.
 */
export type StoreGate = {
  /** Older apps are blocked until they update from the store. */
  required?: string;
  /** Older apps get a dismissable "new version in the store" toast. */
  recommended?: string;
  /** The store listing; the app falls back to its own when absent. */
  url?: string;
};

export type StoreUpdateLevel = 'required' | 'recommended';

const APP_VERSION_PATTERN = /^\d+(\.\d+){0,3}$/;

export const isAppVersion = (value: unknown): value is string =>
  typeof value === 'string' && APP_VERSION_PATTERN.test(value);

/** Numeric, part by part: `1.10` is newer than `1.9`, `1.0` equals `1`. */
export function compareAppVersions(a: string, b: string): number {
  const left = a.split('.').map(Number);
  const right = b.split('.').map(Number);

  for (let i = 0; i < Math.max(left.length, right.length); i += 1) {
    const diff = (left[i] ?? 0) - (right[i] ?? 0);

    if (diff !== 0) return Math.sign(diff);
  }

  return 0;
}

export function parseStoreGate(
  data: unknown,
  platform: LiveUpdatePlatform,
): StoreGate | null {
  let value = data;

  if (typeof value === 'string') {
    try {
      value = JSON.parse(value);
    } catch {
      return null;
    }
  }

  if (!value || typeof value !== 'object') return null;

  const fields = value as Record<string, unknown>;

  if (fields.platform !== platform) return null;

  let url: string | undefined;

  try {
    if (typeof fields.url === 'string') {
      const parsed = new URL(fields.url);

      if (parsed.protocol === 'https:') url = parsed.toString();
    }
  } catch {
    url = undefined;
  }

  return {
    ...(isAppVersion(fields.required) ? { required: fields.required } : {}),
    ...(isAppVersion(fields.recommended)
      ? { recommended: fields.recommended }
      : {}),
    ...(url ? { url } : {}),
  };
}

/** Whether an app at `appVersion` has to, or should, update from the store. */
export function storeUpdateLevel(
  gate: StoreGate,
  appVersion: string,
): StoreUpdateLevel | null {
  if (!isAppVersion(appVersion)) return null;

  if (gate.required && compareAppVersions(appVersion, gate.required) < 0) {
    return 'required';
  }

  if (
    gate.recommended &&
    compareAppVersions(appVersion, gate.recommended) < 0
  ) {
    return 'recommended';
  }

  return null;
}
