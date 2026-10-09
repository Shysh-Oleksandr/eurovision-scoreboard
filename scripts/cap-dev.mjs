#!/usr/bin/env node
/**
 * Live reload for the Capacitor apps: the native shell loads the Next dev
 * server (`yarn dev`) instead of the bundled static export, so edits show up
 * on the device the same way they do in the browser.
 *
 *   yarn cap:dev ios            iOS simulator (shares the Mac's localhost)
 *   yarn cap:dev ios --lan      physical iPhone on the same Wi-Fi
 *   yarn cap:dev android        emulator or USB device (ports via adb reverse)
 *
 * iOS points the native config at the dev server and opens Xcode; press Run
 * there (any simulator or device). It does not use `cap run ios`: Xcode 27
 * replaced Simulator.app with DeviceHub.app and native-run 2.0.3 still opens
 * the old path. Android runs `cap run android --live-reload`; extra flags go
 * to it (e.g. `--target <id>`).
 *
 * Ctrl+C restores the native config, but the installed app keeps loading the
 * dev server until you build it again without this script (Xcode Run after
 * Ctrl+C, or `yarn cap:android`). If the terminal is closed instead,
 * `yarn cap:sync` regenerates the config.
 *
 * Over localhost the app's origin is http://localhost:3000, the same as the
 * web dev setup, so the local backend's CORS and API URL work unchanged.
 *
 * Start the dev server with `yarn dev:native` to get the app's code paths
 * (client-side locale, no image proxy); plain `yarn dev` runs the website's.
 */
import { execFileSync, spawn } from 'node:child_process';
import { readFileSync, writeFileSync } from 'node:fs';
import os from 'node:os';
import path from 'node:path';

const DEV_PORT = 3000;
const API_PORT = 8001;

const [platform, ...rest] = process.argv.slice(2);

if (platform !== 'ios' && platform !== 'android') {
  console.error('Usage: yarn cap:dev <ios|android> [--lan] [cap run flags]');
  process.exit(1);
}

const lan = rest.includes('--lan');
const capArgs = rest.filter((arg) => arg !== '--lan');

const lanIp = () => {
  const nics = os.networkInterfaces();
  const preferred = ['en0', 'en1', ...Object.keys(nics)];

  for (const name of preferred) {
    const ipv4 = (nics[name] ?? []).find(
      (nic) => nic.family === 'IPv4' && !nic.internal,
    );

    if (ipv4) return ipv4.address;
  }

  return null;
};

const host = lan ? lanIp() : 'localhost';

if (!host) {
  console.error('No LAN IPv4 address found. Is Wi-Fi connected?');
  process.exit(1);
}

const devUrl = `http://${host}:${DEV_PORT}`;

try {
  await fetch(devUrl, { signal: AbortSignal.timeout(5000) });
} catch {
  console.error(
    `Dev server not reachable at ${devUrl}. Start it first:\n  ${
      lan ? `NEXT_PUBLIC_API_URL=http://${host}:${API_PORT} ` : ''
    }yarn dev:native`,
  );
  process.exit(1);
}

if (lan) {
  console.log(
    [
      `Phone will load ${devUrl}. For backend calls from the phone:`,
      `  - run the dev server with NEXT_PUBLIC_API_URL=http://${host}:${API_PORT}`,
      `  - add ${devUrl} to FRONTEND_URL in douze-points-backend/.env, after the localhost entry, and restart the backend`,
      '  - allow the "Local Network" prompt on the device',
      '',
    ].join('\n'),
  );
}

// Android: keep device ports 3000/8001 tunnelled to the Mac for every
// connected device. Re-applied on an interval because `cap run` may boot an
// emulator after we start, and native-run drops its own forwards on exit.
let reverseTimer;
let removeTunnels = () => {};

if (platform === 'android' && !lan) {
  const adb = process.env.ANDROID_HOME
    ? path.join(process.env.ANDROID_HOME, 'platform-tools', 'adb')
    : 'adb';
  const adbRun = (args) =>
    execFileSync(adb, args, { encoding: 'utf8', timeout: 5000, stdio: 'pipe' });

  const tunnelled = new Set();

  removeTunnels = () => {
    clearInterval(reverseTimer);

    for (const serial of tunnelled) {
      for (const port of [DEV_PORT, API_PORT]) {
        try {
          adbRun(['-s', serial, 'reverse', '--remove', `tcp:${port}`]);
        } catch {
          // device already unplugged
        }
      }
    }
  };

  const reverse = () => {
    let devices = '';

    try {
      devices = adbRun(['devices']);
    } catch {
      return;
    }

    for (const line of devices.split('\n').slice(1)) {
      const [serial, state] = line.trim().split(/\s+/);

      if (state !== 'device') continue;

      tunnelled.add(serial);

      for (const port of [DEV_PORT, API_PORT]) {
        try {
          adbRun(['-s', serial, 'reverse', `tcp:${port}`, `tcp:${port}`]);
        } catch {
          // device went away mid-loop; the next tick retries
        }
      }
    }
  };

  reverse();
  reverseTimer = setInterval(reverse, 3000);
}

if (platform === 'ios') {
  // Same edit `cap run -l` makes. The file is bundled into the app at build
  // time, so it only has to hold the dev URL while Xcode builds.
  const configPath = path.join('ios', 'App', 'App', 'capacitor.config.json');
  const original = readFileSync(configPath, 'utf8');
  const config = JSON.parse(original);

  config.server = { ...config.server, url: devUrl };
  writeFileSync(configPath, `${JSON.stringify(config, null, '\t')}\n`);

  const restore = () => {
    writeFileSync(configPath, original);
    console.log('\nRestored ios/App/App/capacitor.config.json.');
    console.log(
      'Press Run in Xcode once more so the app goes back to its bundled build.',
    );
    process.exit(0);
  };

  process.on('SIGINT', restore);
  process.on('SIGTERM', restore);

  spawn(path.join('node_modules', '.bin', 'cap'), ['open', 'ios'], {
    stdio: 'ignore',
  });
  console.log(
    `iOS app now loads ${devUrl}.\nIn Xcode pick a simulator or your iPhone and press Run (Cmd+R). Edits reload by themselves; rebuild only after native changes.\nCtrl+C here when done.`,
  );
  setInterval(() => {}, 1 << 30);
} else {
  // `cap run -l` writes server.url into the platform's copy of
  // capacitor.config.json and reverts it on Ctrl+C. `--no-sync`: the web
  // assets are irrelevant here; run `yarn cap:sync` after adding a plugin.
  const child = spawn(
    path.join('node_modules', '.bin', 'cap'),
    [
      'run',
      'android',
      '--live-reload',
      '--host',
      host,
      '--port',
      String(DEV_PORT),
      '--no-sync',
      ...capArgs,
    ],
    { stdio: 'inherit' },
  );

  // Wait for the child to restore the config instead of exiting first. A
  // terminal Ctrl+C already reaches it (same process group); forwarding covers
  // signals sent to this process alone. A second SIGINT is harmless.
  process.on('SIGINT', () => child.kill('SIGINT'));
  process.on('SIGTERM', () => child.kill('SIGINT'));

  child.on('exit', (code) => {
    removeTunnels();
    process.exit(code ?? 0);
  });
}
