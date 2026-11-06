/**
 * A throwaway backend for the signed-in screenshots: MongoDB in Docker and
 * the sibling douze-points-backend compiled to a temp folder, with a review
 * address that signs in with a fixed code (email-sign-in.md §6). It never
 * sees production: the environment is built from scratch, not inherited, and
 * the backend runs from a folder without a .env.
 */
import { execFileSync, spawn } from 'node:child_process';
import { createWriteStream, existsSync, mkdtempSync, rmSync } from 'node:fs';
import os from 'node:os';
import path from 'node:path';

export const BACKEND_PORT = 8011;
export const BACKEND_URL = `http://localhost:${BACKEND_PORT}`;
export const REVIEW_EMAIL = 'screenshots@douzepoints.test';
export const REVIEW_CODE = '246810';

const MONGO_PORT = 27019;
const MONGO_CONTAINER = 'dp-store-shots-mongo';
const DATABASE = 'dpshots';
const BACKEND_DIR = path.resolve('../douze-points-backend');

const docker = (...args) =>
  execFileSync('docker', args, { encoding: 'utf8', stdio: 'pipe' }).trim();

/** Runs a mongosh script against the throwaway database. */
export const mongo = (script) =>
  docker('exec', MONGO_CONTAINER, 'mongosh', '--quiet', DATABASE, '--eval', script);

const waitFor = async (check, what, timeoutMs = 90000) => {
  const start = Date.now();

  while (Date.now() - start < timeoutMs) {
    if (await check().catch(() => false)) return;
    await new Promise((resolve) => setTimeout(resolve, 1000));
  }
  throw new Error(`${what} didn't start within ${timeoutMs / 1000} s`);
};

const portInUse = async (port) => {
  try {
    await fetch(`http://localhost:${port}/`);

    return true;
  } catch {
    return false;
  }
};

export const startBackend = async () => {
  if (!existsSync(path.join(BACKEND_DIR, 'package.json'))) {
    throw new Error(`No backend at ${BACKEND_DIR}`);
  }
  if (await portInUse(BACKEND_PORT)) {
    throw new Error(`Port ${BACKEND_PORT} is taken; stop what runs there`);
  }
  const tmp = mkdtempSync(path.join(os.tmpdir(), 'dp-store-shots-'));

  console.log('backend: MongoDB in Docker');
  try {
    docker('rm', '-f', MONGO_CONTAINER);
  } catch {
    // Not running.
  }
  docker(
    'run', '-d', '--rm', '--name', MONGO_CONTAINER,
    '-p', `${MONGO_PORT}:27017`, 'mongo:7',
  );
  await waitFor(async () => mongo('db.runCommand({ ping: 1 }).ok') === '1', 'MongoDB');

  // Compiled outside the backend's dist/, which its watcher may own.
  console.log('backend: compiling');
  execFileSync(
    path.join(BACKEND_DIR, 'node_modules/.bin/tsc'),
    ['-p', 'tsconfig.build.json', '--outDir', path.join(tmp, 'dist')],
    { cwd: BACKEND_DIR, stdio: 'inherit' },
  );

  const env = {
    PATH: process.env.PATH,
    HOME: process.env.HOME,
    NODE_PATH: path.join(BACKEND_DIR, 'node_modules'),
    PORT: String(BACKEND_PORT),
    MONGODB_URI: `mongodb://localhost:${MONGO_PORT}/${DATABASE}`,
    JWT_SECRET: 'store-screenshots-local-only',
    JWT_EXPIRES_IN: '1h',
    REFRESH_TTL_MS: String(30 * 24 * 3600 * 1000),
    FRONTEND_URL: 'http://localhost:3999',
    // GoogleStrategy throws without them; R2 points nowhere (no uploads).
    GOOGLE_CLIENT_ID: 'unused',
    GOOGLE_SECRET: 'unused',
    GOOGLE_CALLBACK_URL: `${BACKEND_URL}/auth/google/callback`,
    R2_ACCESS_KEY: 'unused',
    R2_SECRET_KEY: 'unused',
    R2_ENDPOINT_URL: 'http://127.0.0.1:9',
    R2_BUCKET_NAME: 'unused',
    R2_PUBLIC_BASE_URL: 'http://127.0.0.1:9',
    EMAIL_REVIEW_ADDRESS: REVIEW_EMAIL,
    EMAIL_REVIEW_CODE: REVIEW_CODE,
  };
  const log = createWriteStream(path.join(tmp, 'backend.log'));
  const child = spawn(process.execPath, [path.join(tmp, 'dist/src/main.js')], {
    cwd: tmp,
    env,
    stdio: ['ignore', 'pipe', 'pipe'],
  });

  child.stdout.pipe(log);
  child.stderr.pipe(log);
  await waitFor(
    async () => (await fetch(`${BACKEND_URL}/themes/public?limit=1`)).ok,
    `The backend (log: ${path.join(tmp, 'backend.log')})`,
  );
  console.log(`backend: ${BACKEND_URL}`);

  return {
    stop: () => {
      child.kill();
      try {
        docker('stop', MONGO_CONTAINER);
      } catch {
        // Already gone.
      }
      rmSync(tmp, { recursive: true, force: true });
    },
  };
};

/** Clears the sign-in rate limits (per IP and address). */
export const resetSignInLimits = () => mongo('db.auth_rate_limits.deleteMany({}).deletedCount');

/**
 * The test account's public face: the app logo, a plain name, and no active
 * contest or theme (so the setup opens on the default line-up).
 */
export const dressTestAccount = () =>
  mongo(`db.profiles.updateOne(
    { email: ${JSON.stringify(REVIEW_EMAIL)} },
    {
      $set: { name: 'DouzePoints', username: 'douzepoints', avatarUrl: '/img/brand/icon-192.png' },
      $unset: { activeContestId: '', activeThemeId: '', preferredLocale: '' },
    },
  ).modifiedCount`);
