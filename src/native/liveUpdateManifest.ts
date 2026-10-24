/**
 * The pure half of live updates (src/native/liveUpdate.ts): the manifest
 * `yarn live-update publish` writes, and the version rules. Bundle versions
 * are the UTC build time, `YYYYMMDD.HHmmss`, so newer is a string compare.
 */
import type { BundleInfo } from '@capgo/capacitor-updater';

export type LiveUpdatePlatform = 'ios' | 'android';

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

  const { version, platform, runtime, url, checksum, sessionKey } =
    value as Record<string, unknown>;

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
  };
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
