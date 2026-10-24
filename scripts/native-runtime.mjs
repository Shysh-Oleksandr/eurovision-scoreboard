/**
 * Native runtime fingerprints and build values for live updates
 * (docs/native-apps.md §11).
 *
 * A live update replaces the web bundle, never the native code, so a bundle
 * is only safe on a binary whose native side matches the one it was built
 * against. Per platform, this hashes what the JS can observe of that side:
 * the Capacitor runtime and every native plugin with its installed version,
 * the app's own native code (the iOS delegates, Android's MediaSaver plugin),
 * the files that declare permissions, URL schemes and shared paths, and
 * `capacitor.config.ts` with the live-update public key (plugin config ships
 * inside the binary). Everything else in ios/ and android/ (version numbers,
 * icons, Xcode and Gradle settings) is left out, so a store release that only
 * bumps the version keeps receiving the same updates.
 *
 * Native builds bake these runtimes into the JS (next.config.ts), and
 * `yarn live-update publish` files a bundle under the runtimes of the tree it
 * was built from, so an installed app only downloads bundles made for it.
 */
import { createHash } from 'node:crypto';
import { existsSync, readdirSync, readFileSync } from 'node:fs';
import path from 'node:path';

export const PLATFORMS = ['ios', 'android'];

/** Where `publish` uploads and the apps look (R2, cdn.douzepoints.app). */
export const DEFAULT_LIVE_UPDATE_URL =
  'https://cdn.douzepoints.app/app-updates';

export const PUBLIC_KEY_FILE = 'live-update-public.pem';

/** `YYYYMMDD.HHmmss` in UTC: unique per build and sortable as a string. */
export const BUNDLE_VERSION_PATTERN = /^\d{8}\.\d{6}$/;

const SHARED_FILES = ['capacitor.config.ts', PUBLIC_KEY_FILE];

const NATIVE_FILES = {
  ios: [
    { dir: 'ios/App/App', match: (file) => file.endsWith('.swift') },
    { file: 'ios/App/App/Info.plist' },
    { file: 'ios/App/App/App.entitlements' },
  ],
  android: [
    {
      dir: 'android/app/src/main/java',
      match: (file) => /\.(java|kt)$/.test(file),
    },
    { file: 'android/app/src/main/AndroidManifest.xml' },
    // FileProvider paths (sharing) and the per-app language list. cap sync
    // generates config.xml from the plugin list, which is hashed anyway.
    {
      dir: 'android/app/src/main/res/xml',
      match: (file) =>
        file.endsWith('.xml') && path.basename(file) !== 'config.xml',
    },
  ],
};

// Build output and copied web assets, never native source.
const SKIPPED_DIRS = new Set([
  'public',
  'build',
  'DerivedData',
  'node_modules',
]);

function walk(root, dir, match, out) {
  const abs = path.join(root, dir);

  if (!existsSync(abs)) return;

  for (const entry of readdirSync(abs, { withFileTypes: true })) {
    const rel = path.posix.join(dir, entry.name);

    if (entry.isDirectory()) {
      if (!SKIPPED_DIRS.has(entry.name)) walk(root, rel, match, out);
    } else if (match(rel)) {
      out.push(rel);
    }
  }
}

function nativeFiles(root, platform) {
  const files = [];

  for (const spec of NATIVE_FILES[platform]) {
    if (spec.file) {
      if (existsSync(path.join(root, spec.file))) files.push(spec.file);
    } else {
      walk(root, spec.dir, spec.match, files);
    }
  }

  return files.sort();
}

/** `name@version` of the Capacitor runtime and every plugin with native code for `platform`. */
export function nativePackages(platform, root = process.cwd()) {
  const pkg = JSON.parse(readFileSync(path.join(root, 'package.json'), 'utf8'));
  const names = Object.keys({
    ...pkg.dependencies,
    ...pkg.devDependencies,
  }).sort();
  const packages = [];

  for (const name of names) {
    const file = path.join(root, 'node_modules', name, 'package.json');

    if (!existsSync(file)) {
      throw new Error(`${name} is not installed; run yarn install first.`);
    }

    const dep = JSON.parse(readFileSync(file, 'utf8'));
    const isRuntime =
      name === '@capacitor/core' || name === `@capacitor/${platform}`;

    if (isRuntime || dep.capacitor?.[platform]) {
      packages.push(`${name}@${dep.version}`);
    }
  }

  return packages;
}

// Formatting-only edits (Xcode, plutil and the asset tool all reformat) must
// not change the fingerprint.
const normalize = (text) => text.replace(/\s+/g, ' ').trim();

/** The runtime fingerprint of `platform` for the working tree at `root`. */
export function nativeRuntime(platform, root = process.cwd()) {
  const hash = createHash('sha256');
  const add = (label, value) => hash.update(`${label}\0${value}\0`);

  for (const entry of nativePackages(platform, root)) add('package', entry);

  for (const file of [...SHARED_FILES, ...nativeFiles(root, platform)]) {
    const abs = path.join(root, file);

    add(file, existsSync(abs) ? normalize(readFileSync(abs, 'utf8')) : '');
  }

  return hash.digest('hex').slice(0, 16);
}

export function newBundleVersion(date = new Date()) {
  const iso = date.toISOString(); // 2026-10-12T14:30:05.123Z

  return `${iso.slice(0, 10).replaceAll('-', '')}.${iso
    .slice(11, 19)
    .replaceAll(':', '')}`;
}

/**
 * The values next.config.ts bakes into every native export. The bundle
 * version is fixed in `process.env` on first use so every Next worker that
 * evaluates the config bakes the same one; `publish` sets it up front.
 */
export function liveUpdateBuildEnv(root = process.cwd()) {
  process.env.LIVE_UPDATE_VERSION ||= newBundleVersion();

  const env = {
    NEXT_PUBLIC_LIVE_UPDATE_VERSION: process.env.LIVE_UPDATE_VERSION,
    NEXT_PUBLIC_LIVE_UPDATE_URL: liveUpdateUrl(),
    NEXT_PUBLIC_LIVE_UPDATE_RUNTIME_IOS: nativeRuntime('ios', root),
    NEXT_PUBLIC_LIVE_UPDATE_RUNTIME_ANDROID: nativeRuntime('android', root),
  };

  if (!process.env.LIVE_UPDATE_LOGGED) {
    process.env.LIVE_UPDATE_LOGGED = '1';
    console.log(
      `[live-update] bundle ${env.NEXT_PUBLIC_LIVE_UPDATE_VERSION}, runtimes ios ${env.NEXT_PUBLIC_LIVE_UPDATE_RUNTIME_IOS}, android ${env.NEXT_PUBLIC_LIVE_UPDATE_RUNTIME_ANDROID}`,
    );
  }

  return env;
}

/** The base URL, without a trailing slash; NEXT_PUBLIC_LIVE_UPDATE_URL overrides it for tests. */
export function liveUpdateUrl() {
  return (
    process.env.NEXT_PUBLIC_LIVE_UPDATE_URL || DEFAULT_LIVE_UPDATE_URL
  ).replace(/\/+$/, '');
}

/** Where the manifest for `platform` / `runtime` lives, relative to the base URL. */
export const manifestPath = (platform, runtime) =>
  `${platform}/${runtime}.json`;

export const bundlePath = (version) => `bundles/${version}.zip`;
