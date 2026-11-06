#!/usr/bin/env node
/**
 * App Store and Google Play screenshots: the real app (the static export)
 * captured at each store's size, framed and captioned in every app language
 * (docs/store-submission.md §6).
 *
 *   yarn build:native                       # once, and after UI changes
 *   yarn store-screenshots                  # every device, language and scene
 *   yarn store-screenshots --device iphone --locale en,de --scene winner
 *   yarn store-screenshots --jobs 2         # parallel device/language runs
 *
 * Output: assets/store/screenshots/<locale>/<device>/<NN>-<scene>.png
 * (gitignored). The signed-in scenes (setup, builder, contests) need Docker
 * and the sibling douze-points-backend checkout: a throwaway backend is
 * started for them and stopped at the end. Nothing is written to production.
 */
import {
  createReadStream,
  existsSync,
  mkdirSync,
  mkdtempSync,
  rmSync,
  statSync,
} from 'node:fs';
import http from 'node:http';
import os from 'node:os';
import path from 'node:path';

import { SESSIONS, runSession, seedAccount } from './store-screenshots/app.mjs';
import { startBackend } from './store-screenshots/backend.mjs';
import { DEVICES, LOCALES } from './store-screenshots/devices.mjs';
import { SLIDES, composeFrames } from './store-screenshots/frame.mjs';

const OUT_DIR = 'out';
const SCREENSHOTS_DIR = 'assets/store/screenshots';
const SCENES = SLIDES.map(([scene]) => scene);

const args = process.argv.slice(2);
const listArg = (name, all) => {
  const i = args.indexOf(`--${name}`);

  if (i === -1) return all;
  const picked = args[i + 1].split(',');
  const unknown = picked.filter((value) => !all.includes(value));

  if (unknown.length) {
    console.error(`Unknown ${name} "${unknown}", expected ${all.join(', ')}`);
    process.exit(1);
  }

  return picked;
};
const deviceNames = listArg('device', Object.keys(DEVICES));
const locales = listArg('locale', Object.keys(LOCALES));
const scenes = listArg('scene', SCENES);
const jobs = Number(args.includes('--jobs') ? args[args.indexOf('--jobs') + 1] : 2);
const keepRaw = args.includes('--keep-raw');

if (!existsSync(`${OUT_DIR}/index.html`)) {
  console.error(`No ${OUT_DIR}/index.html: run yarn build:native first`);
  process.exit(1);
}

// --- Static server ---------------------------------------------------------

const MIME = {
  '.css': 'text/css',
  '.html': 'text/html',
  '.ico': 'image/x-icon',
  '.jpg': 'image/jpeg',
  '.js': 'text/javascript',
  '.json': 'application/json',
  '.mp3': 'audio/mpeg',
  '.png': 'image/png',
  '.svg': 'image/svg+xml',
  '.txt': 'text/plain',
  '.webp': 'image/webp',
  '.woff2': 'font/woff2',
};

/** Serves out/ like Capacitor: paths without an extension get index.html. */
const serveExport = async () => {
  const server = http.createServer((req, res) => {
    const pathname = decodeURIComponent(new URL(req.url, 'http://x').pathname);
    const file = path.join(
      OUT_DIR,
      path.extname(pathname) ? pathname : 'index.html',
    );

    if (!existsSync(file) || statSync(file).isDirectory()) {
      res.writeHead(404).end();

      return;
    }
    res.writeHead(200, {
      'content-type': MIME[path.extname(file)] ?? 'application/octet-stream',
    });
    createReadStream(file).pipe(res);
  });

  await new Promise((resolve) => server.listen(0, resolve));

  return { server, url: `http://localhost:${server.address().port}` };
};

// --- Run -------------------------------------------------------------------

/** Runs `worker` over `items`, `limit` at a time. */
const pool = async (items, limit, worker) => {
  const queue = [...items];

  await Promise.all(
    Array.from({ length: Math.max(1, limit) }, async () => {
      while (queue.length) await worker(queue.shift());
    }),
  );
};

const { server, url } = await serveExport();
const rawRoot = mkdtempSync(path.join(os.tmpdir(), 'dp-store-raw-'));
const sessions = SESSIONS.filter((s) => s.scenes.some((scene) => scenes.includes(scene)));
const needsAccount = sessions.some((s) => s.account);
const failures = [];
let backend;

try {
  if (needsAccount) {
    backend = await startBackend();
    console.log('seeding the test account');
    const seedDir = path.join(rawRoot, 'seed');

    mkdirSync(seedDir, { recursive: true });
    await seedAccount({ url, device: DEVICES.iphone, locale: 'en', rawDir: seedDir });
  }

  const tasks = deviceNames.flatMap((device) => locales.map((locale) => ({ device, locale })));

  await pool(tasks, jobs, async ({ device: deviceName, locale }) => {
    const device = DEVICES[deviceName];
    const rawDir = path.join(rawRoot, locale, deviceName);
    const outDir = path.join(SCREENSHOTS_DIR, locale, deviceName);

    mkdirSync(rawDir, { recursive: true });
    mkdirSync(outDir, { recursive: true });
    for (const spec of sessions) {
      const started = Date.now();

      try {
        await runSession(spec, { url, device, locale, rawDir, scenes });
        console.log(`  ${locale} ${deviceName} ${spec.name} (${Math.round((Date.now() - started) / 1000)} s)`);
      } catch (error) {
        failures.push(`${locale} ${deviceName} ${spec.name}: ${error.message.split('\n')[0]}`);
        console.error(`  ${locale} ${deviceName} ${spec.name} FAILED (debug image in ${rawDir})`);
      }
    }
    const written = await composeFrames({ device, locale, rawDir, outDir, scenes });

    console.log(`${locale} ${deviceName}: ${written.length} screenshots in ${outDir}`);
  });
} finally {
  backend?.stop();
  server.close();
  if (failures.length || keepRaw) {
    console.log(`Raw captures kept in ${rawRoot}`);
  } else {
    rmSync(rawRoot, { recursive: true, force: true });
  }
}

if (failures.length) {
  console.error(`\n${failures.length} failed:\n${failures.join('\n')}`);
  process.exit(1);
}
