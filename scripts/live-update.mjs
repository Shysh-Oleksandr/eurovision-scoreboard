#!/usr/bin/env node
/**
 * Live updates for the native apps (docs/native-apps.md §11).
 *
 *   yarn live-update publish [--mode silent|prompt|required] [--allow-dirty] [--dry-run] [--out <dir>]
 *   yarn live-update store <ios|android> [--required <version|none>] [--recommended <version|none>] [--url <listing>] [--force] [--dry-run] [--out <dir>]
 *   yarn live-update status
 *   yarn live-update keygen
 *
 * publish: builds the native web bundle (`yarn build:native`), zips `out/`,
 * encrypts and signs it with the private key (the plugin's "encryption v2":
 * AES-128-CBC with a random session key, session key and SHA-256 checksum
 * RSA-signed), and uploads it to R2 with wrangler:
 *
 *   app-updates/bundles/<version>.zip        immutable
 *   app-updates/<platform>/<runtime>.json    the latest bundle for that runtime
 *
 * The runtimes are the native fingerprints of this tree
 * (scripts/native-runtime.mjs); an installed app only reads the manifest of
 * its own runtime. `--out <dir>` writes that layout to a directory instead of
 * uploading (local tests, with NEXT_PUBLIC_LIVE_UPDATE_URL pointing at a
 * server for it); `--dry-run` stops after building and signing.
 *
 * `--mode` sets how urgently installed apps move to the bundle: `silent`
 * (default: next launch, or a resume after a long break), `prompt` (also a
 * "restart to update" toast) or `required` (a blocking screen that updates
 * at once). The manifest stores the latest prompt / required versions as
 * floors (`promptVersion`, `requiredVersion`) and later publishes carry them
 * forward, so an app that missed a required bundle is still made to update.
 *
 * store: writes `app-updates/<platform>/store.json`, the store gate every
 * binary reads whatever its runtime: apps below `required` (a marketing
 * version, `1.2`) are blocked with a link to the store, apps below
 * `recommended` get a dismissable toast. Values not passed are kept.
 *
 * Needs `npx wrangler login` (or CLOUDFLARE_API_TOKEN) with access to the
 * bucket, and the private key at ~/keys/douzepoints-live-update.pem
 * (LIVE_UPDATE_PRIVATE_KEY overrides the path).
 */
import { spawnSync } from 'node:child_process';
import {
  constants,
  createCipheriv,
  createDecipheriv,
  createHash,
  createPrivateKey,
  createPublicKey,
  generateKeyPairSync,
  privateEncrypt,
  publicDecrypt,
  randomBytes,
} from 'node:crypto';
import {
  existsSync,
  mkdirSync,
  readdirSync,
  readFileSync,
  rmSync,
  writeFileSync,
} from 'node:fs';
import os from 'node:os';
import path from 'node:path';

import {
  BUNDLE_VERSION_PATTERN,
  bundlePath,
  liveUpdateUrl,
  manifestPath,
  nativeRuntime,
  newBundleVersion,
  PLATFORMS,
  PUBLIC_KEY_FILE,
} from './native-runtime.mjs';

const BUCKET = process.env.LIVE_UPDATE_BUCKET || 'douzepoints-assets';
const PRIVATE_KEY_PATH =
  process.env.LIVE_UPDATE_PRIVATE_KEY ||
  path.join(os.homedir(), 'keys', 'douzepoints-live-update.pem');
const STAGING_DIR = '.live-update';
const OUT_DIR = 'out';
const MODES = ['silent', 'prompt', 'required'];
const APP_VERSION_PATTERN = /^\d+(\.\d+){0,3}$/;
// Mirrors src/config/appStores.ts; the app falls back to the same links.
const STORE_URLS = {
  ios: 'https://apps.apple.com/app/id6821299332',
  android: 'https://play.google.com/store/apps/details?id=app.douzepoints',
};

const [command, ...args] = process.argv.slice(2);
const flag = (name) => args.includes(name);
const option = (name) => {
  const index = args.indexOf(name);

  return index >= 0 ? args[index + 1] : undefined;
};

function fail(message) {
  console.error(`\n[live-update] ${message}`);
  process.exit(1);
}

function run(cmd, cmdArgs, options = {}) {
  const result = spawnSync(cmd, cmdArgs, { stdio: 'inherit', ...options });

  if (result.status !== 0) {
    fail(`\`${cmd} ${cmdArgs.join(' ')}\` failed (exit ${result.status}).`);
  }

  return result;
}

const git = (...gitArgs) =>
  spawnSync('git', gitArgs, { encoding: 'utf8' }).stdout?.trim() ?? '';

const sha256 = (data) => createHash('sha256').update(data).digest();

const samePem = (a, b) => a.replace(/\s+/g, '') === b.replace(/\s+/g, '');

// ---------------------------------------------------------------- keygen

function keygen() {
  const force = flag('--force');

  if (existsSync(PRIVATE_KEY_PATH) && !force) {
    fail(`${PRIVATE_KEY_PATH} already exists (--force replaces it).`);
  }

  if (existsSync(PUBLIC_KEY_FILE) && !force) {
    fail(
      `${PUBLIC_KEY_FILE} already exists. A new key pair only works for binaries built after it; installed apps keep verifying with the old key (--force replaces it anyway).`,
    );
  }

  // The plugin reads a PKCS#1 ("BEGIN RSA PUBLIC KEY") RSA-2048 key.
  const { publicKey, privateKey } = generateKeyPairSync('rsa', {
    modulusLength: 2048,
    publicKeyEncoding: { type: 'pkcs1', format: 'pem' },
    privateKeyEncoding: { type: 'pkcs1', format: 'pem' },
  });

  mkdirSync(path.dirname(PRIVATE_KEY_PATH), { recursive: true });
  writeFileSync(PRIVATE_KEY_PATH, privateKey, { mode: 0o600 });
  writeFileSync(PUBLIC_KEY_FILE, publicKey);

  console.log(`Private key: ${PRIVATE_KEY_PATH} (back it up; never commit it)`);
  console.log(
    `Public key:  ${PUBLIC_KEY_FILE} (commit it; it ships in the binaries)`,
  );
}

// ---------------------------------------------------------------- signing

function loadPrivateKey() {
  if (!existsSync(PRIVATE_KEY_PATH)) {
    fail(
      `No private key at ${PRIVATE_KEY_PATH}. Restore it from the backup, or set LIVE_UPDATE_PRIVATE_KEY.`,
    );
  }

  const privateKey = createPrivateKey(readFileSync(PRIVATE_KEY_PATH, 'utf8'));
  const derivedPublic = createPublicKey(privateKey).export({
    type: 'pkcs1',
    format: 'pem',
  });

  if (!samePem(derivedPublic, readFileSync(PUBLIC_KEY_FILE, 'utf8'))) {
    fail(
      `The private key at ${PRIVATE_KEY_PATH} does not match ${PUBLIC_KEY_FILE}; the apps would reject the bundle.`,
    );
  }

  return privateKey;
}

const rsaSign = (privateKey, data) =>
  privateEncrypt(
    { key: privateKey, padding: constants.RSA_PKCS1_PADDING },
    data,
  );

/** The plugin's encryption v2: what `download()` needs as `checksum` and `sessionKey`. */
function encryptBundle(zip, privateKey) {
  const aesKey = randomBytes(16);
  const iv = randomBytes(16);
  const cipher = createCipheriv('aes-128-cbc', aesKey, iv);

  return {
    encrypted: Buffer.concat([cipher.update(zip), cipher.final()]),
    // SHA-256 of the plain zip, signed; hex is the format current plugins expect.
    checksum: rsaSign(privateKey, sha256(zip)).toString('hex'),
    sessionKey: `${iv.toString('base64')}:${rsaSign(
      privateKey,
      aesKey,
    ).toString('base64')}`,
  };
}

/** Decrypts like the app does, so a bundle the app would reject never ships. */
function verifyBundle(zip, { encrypted, checksum, sessionKey }) {
  const publicKey = readFileSync(PUBLIC_KEY_FILE, 'utf8');
  const recover = (data) =>
    publicDecrypt(
      { key: publicKey, padding: constants.RSA_PKCS1_PADDING },
      data,
    );
  const [iv, encryptedKey] = sessionKey.split(':');
  const decipher = createDecipheriv(
    'aes-128-cbc',
    recover(Buffer.from(encryptedKey, 'base64')),
    Buffer.from(iv, 'base64'),
  );
  const plain = Buffer.concat([decipher.update(encrypted), decipher.final()]);

  if (
    !plain.equals(zip) ||
    !recover(Buffer.from(checksum, 'hex')).equals(sha256(plain))
  ) {
    fail('The signed bundle does not verify against the public key.');
  }
}

// ---------------------------------------------------------------- published files

/**
 * A JSON file as published under the base URL (or under `--out`); null when
 * there is none. Anything else fails: overwriting a manifest or gate that
 * could not be read would drop its floors.
 */
async function readPublished(baseUrl, outDir, relPath) {
  if (outDir) {
    const file = path.join(path.resolve(outDir), relPath);

    return existsSync(file) ? JSON.parse(readFileSync(file, 'utf8')) : null;
  }

  const res = await fetch(`${baseUrl}/${relPath}?t=${Date.now()}`);

  if (res.status === 404) return null;
  if (!res.ok) {
    fail(`Could not read the published ${relPath} (HTTP ${res.status}).`);
  }

  return res.json();
}

const bundleVersionOrUndefined = (value) =>
  typeof value === 'string' && BUNDLE_VERSION_PATTERN.test(value)
    ? value
    : undefined;

// ---------------------------------------------------------------- publish

function containsText(dir, needle) {
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const file = path.join(dir, entry.name);

    if (entry.isDirectory()) {
      if (containsText(file, needle)) return true;
    } else if (
      entry.name.endsWith('.js') &&
      readFileSync(file, 'utf8').includes(needle)
    ) {
      return true;
    }
  }

  return false;
}

function stage(root, relPath, data) {
  const file = path.join(root, relPath);

  mkdirSync(path.dirname(file), { recursive: true });
  writeFileSync(file, data);

  return file;
}

function upload(baseUrl, relPath, file, contentType, cacheControl) {
  // The CDN host serves the bucket root, so the URL path is the object key.
  const key = `${new URL(baseUrl).pathname.replace(/^\/+/, '')}/${relPath}`;

  run('npx', [
    'wrangler',
    'r2',
    'object',
    'put',
    `${BUCKET}/${key}`,
    '--file',
    file,
    '--content-type',
    contentType,
    '--cache-control',
    cacheControl,
    '--remote',
  ]);
}

async function publish() {
  const dryRun = flag('--dry-run');
  const outDir = option('--out');
  const mode = option('--mode') ?? 'silent';
  const dirty = git('status', '--porcelain') !== '';

  if (!MODES.includes(mode)) {
    fail(`--mode must be one of ${MODES.join(', ')} (got "${mode}").`);
  }

  if (dirty && !flag('--allow-dirty')) {
    fail(
      'The working tree has uncommitted changes. Publish from a clean tree so every bundle maps to a commit (--allow-dirty overrides).',
    );
  }

  const privateKey = loadPrivateKey();
  const version = newBundleVersion();
  const baseUrl = liveUpdateUrl();
  const runtimes = Object.fromEntries(
    PLATFORMS.map((platform) => [platform, nativeRuntime(platform)]),
  );
  // Read before building, so an unreachable CDN fails fast.
  const previous = Object.fromEntries(
    await Promise.all(
      PLATFORMS.map(async (platform) => [
        platform,
        await readPublished(
          baseUrl,
          outDir,
          manifestPath(platform, runtimes[platform]),
        ),
      ]),
    ),
  );

  console.log(`[live-update] building bundle ${version} (${mode})`);
  run('yarn', ['build:native'], {
    env: {
      ...process.env,
      LIVE_UPDATE_VERSION: version,
      LIVE_UPDATE_LOGGED: '',
    },
  });

  for (const platform of PLATFORMS) {
    if (nativeRuntime(platform) !== runtimes[platform]) {
      fail(
        `The ${platform} native runtime changed during the build; publish again.`,
      );
    }
  }

  if (!existsSync(path.join(OUT_DIR, 'index.html'))) {
    fail(`${OUT_DIR}/index.html is missing after the build.`);
  }

  if (!containsText(path.join(OUT_DIR, '_next'), version)) {
    fail(`The build did not bake bundle version ${version} into the JS.`);
  }

  // A temporary zip of out/ without hidden files (the plugin may refuse them).
  const workDir = path.join(STAGING_DIR, version);
  const plainZip = path.resolve(workDir, 'plain.zip');

  rmSync(workDir, { recursive: true, force: true });
  mkdirSync(workDir, { recursive: true });
  run('zip', ['-r', '-X', '-q', plainZip, '.', '-x', '.*', '-x', '*/.*'], {
    cwd: OUT_DIR,
  });

  const zip = readFileSync(plainZip);
  const signed = encryptBundle(zip, privateKey);

  verifyBundle(zip, signed);
  rmSync(plainZip);

  const commit = git('rev-parse', '--short', 'HEAD') + (dirty ? '-dirty' : '');
  const stagingRoot = outDir ? path.resolve(outDir) : workDir;
  const bundleFile = stage(stagingRoot, bundlePath(version), signed.encrypted);
  const manifests = PLATFORMS.map((platform) => {
    const manifest = {
      version,
      platform,
      runtime: runtimes[platform],
      url: `${baseUrl}/${bundlePath(version)}`,
      checksum: signed.checksum,
      sessionKey: signed.sessionKey,
      // Floors: running bundles older than these are made to / asked to
      // switch. Carried forward from the manifest this one replaces.
      requiredVersion:
        mode === 'required'
          ? version
          : bundleVersionOrUndefined(previous[platform]?.requiredVersion),
      promptVersion:
        mode === 'silent'
          ? bundleVersionOrUndefined(previous[platform]?.promptVersion)
          : version,
      size: signed.encrypted.length,
      commit,
      publishedAt: new Date().toISOString(),
    };
    const relPath = manifestPath(platform, runtimes[platform]);

    return {
      relPath,
      file: stage(
        stagingRoot,
        relPath,
        `${JSON.stringify(manifest, null, 2)}\n`,
      ),
    };
  });

  const sizeMb = (signed.encrypted.length / 1024 / 1024).toFixed(1);

  console.log(`\n[live-update] bundle ${version} (${commit}, ${sizeMb} MB)`);
  for (const platform of PLATFORMS) {
    console.log(`  ${platform.padEnd(8)} runtime ${runtimes[platform]}`);
  }
  console.log(`  mode     ${mode}`);

  if (outDir) {
    console.log(`\nWritten to ${stagingRoot}; serve it at ${baseUrl}.`);

    return;
  }

  if (dryRun) {
    console.log(`\nDry run: staged in ${workDir}, nothing uploaded.`);

    return;
  }

  // The bundle first, so a manifest never points at a missing file.
  upload(
    baseUrl,
    bundlePath(version),
    bundleFile,
    'application/zip',
    'public, max-age=31536000, immutable',
  );
  for (const { relPath, file } of manifests) {
    upload(baseUrl, relPath, file, 'application/json', 'no-cache, max-age=0');
  }

  const when = {
    silent: 'switch on the next launch (or a resume after 30 minutes away)',
    prompt: 'are asked to restart once it has downloaded',
    required: 'are blocked until they have switched to it',
  }[mode];

  console.log(
    `\nPublished. Apps on these runtimes download it on their next check and ${when}. Check with: yarn live-update status`,
  );
}

// ---------------------------------------------------------------- store gate

/** CFBundleShortVersionString / versionName of the native projects in this tree. */
function projectVersion(platform) {
  const [file, pattern] =
    platform === 'ios'
      ? [
          'ios/App/App.xcodeproj/project.pbxproj',
          /MARKETING_VERSION = ([\d.]+);/,
        ]
      : ['android/app/build.gradle', /versionName "([\d.]+)"/];

  if (!existsSync(file)) return null;

  const [, version] = readFileSync(file, 'utf8').match(pattern) ?? [];

  return version ?? null;
}

function compareAppVersions(a, b) {
  const left = a.split('.').map(Number);
  const right = b.split('.').map(Number);

  for (let i = 0; i < Math.max(left.length, right.length); i += 1) {
    const diff = (left[i] ?? 0) - (right[i] ?? 0);

    if (diff !== 0) return Math.sign(diff);
  }

  return 0;
}

/** `--required` / `--recommended`: a version, `none` to clear, or the current value. */
function gateVersion(name, current) {
  const value = option(name);

  if (value === undefined) return current;
  if (value === 'none') return undefined;
  if (!APP_VERSION_PATTERN.test(value)) {
    fail(`${name} must be a version like 1.2 (or "none"), got "${value}".`);
  }

  return value;
}

async function store() {
  const [platform] = args;

  if (!PLATFORMS.includes(platform)) {
    fail(
      'Usage: yarn live-update store <ios|android> [--required <version|none>] [--recommended <version|none>] [--url <listing>]',
    );
  }

  const outDir = option('--out');
  const baseUrl = liveUpdateUrl();
  const relPath = `${platform}/store.json`;
  const current = (await readPublished(baseUrl, outDir, relPath)) ?? {};
  const gate = {
    platform,
    required: gateVersion('--required', current.required),
    recommended: gateVersion('--recommended', current.recommended),
    url: option('--url') ?? current.url ?? STORE_URLS[platform],
    updatedAt: new Date().toISOString(),
  };

  if (gate.url && !gate.url.startsWith('https://')) {
    fail('--url must be an https:// store link.');
  }

  // A floor above the newest binary would block every app, the newest too.
  const newest = projectVersion(platform);

  for (const [name, value] of [
    ['required', gate.required],
    ['recommended', gate.recommended],
  ]) {
    if (!value) continue;

    if (!newest) {
      console.warn(
        `[live-update] could not read the ${platform} project version.`,
      );
    } else if (compareAppVersions(value, newest) > 0 && !flag('--force')) {
      fail(
        `${name} ${value} is newer than this tree's ${platform} version ${newest}: no binary would pass. --force if that version is already in the store.`,
      );
    }
  }

  const body = `${JSON.stringify(gate, null, 2)}\n`;

  console.log(`[live-update] ${relPath}\n${body}`);

  if (outDir) {
    stage(path.resolve(outDir), relPath, body);
    console.log(`Written to ${path.resolve(outDir)}.`);

    return;
  }

  if (flag('--dry-run')) {
    console.log('Dry run: nothing uploaded.');

    return;
  }

  const file = stage(path.join(STAGING_DIR, 'store'), relPath, body);

  upload(baseUrl, relPath, file, 'application/json', 'no-cache, max-age=0');

  if (gate.required) {
    console.log(
      `\nApps below ${platform} ${gate.required} are now blocked until they update. Only do this once that version is live in the store.`,
    );
  }
}

// ---------------------------------------------------------------- status

async function status() {
  const baseUrl = liveUpdateUrl();

  console.log(`Base URL: ${baseUrl}\n`);

  for (const platform of PLATFORMS) {
    const gate = await readPublished(baseUrl, null, `${platform}/store.json`);

    console.log(
      `${platform} store gate: ${
        gate
          ? `required ${gate.required ?? '-'}, recommended ${
              gate.recommended ?? '-'
            }, ${gate.url ?? 'no store link'}`
          : 'none'
      }`,
    );
  }
  console.log('');

  for (const platform of PLATFORMS) {
    const runtime = nativeRuntime(platform);
    const url = `${baseUrl}/${manifestPath(platform, runtime)}`;
    const res = await fetch(`${url}?t=${Date.now()}`);

    console.log(`${platform} (runtime ${runtime} of this tree)`);

    if (res.status === 404) {
      console.log('  nothing published for this runtime\n');
      continue;
    }

    if (!res.ok) {
      console.log(`  ${url}: HTTP ${res.status}\n`);
      continue;
    }

    const manifest = await res.json();
    const bundle = await fetch(manifest.url, { method: 'HEAD' });

    console.log(`  bundle    ${manifest.version} (${manifest.commit})`);
    console.log(`  published ${manifest.publishedAt}`);
    console.log(`  required  ${manifest.requiredVersion ?? '-'}`);
    console.log(`  prompt    ${manifest.promptVersion ?? '-'}`);
    console.log(
      `  zip       ${bundle.ok ? 'reachable' : `HTTP ${bundle.status}`}\n`,
    );
  }
}

switch (command) {
  case 'publish':
    await publish();
    break;
  case 'store':
    await store();
    break;
  case 'status':
    await status();
    break;
  case 'keygen':
    keygen();
    break;
  default:
    console.log(
      'Usage: yarn live-update <publish [--mode silent|prompt|required] [--allow-dirty] [--dry-run] [--out <dir>] | store <ios|android> [--required <v|none>] [--recommended <v|none>] [--url <listing>] [--force] | status | keygen>',
    );
    process.exit(command ? 1 : 0);
}
