import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const plugin = vi.hoisted(() => ({
  getFailedUpdate: vi.fn(),
  list: vi.fn(),
  set: vi.fn(),
}));
const reportLiveUpdateRollback = vi.hoisted(() => vi.fn());

vi.mock('./platform', () => ({ IS_NATIVE_APP: true }));
vi.mock('@capacitor/core', () => ({
  Capacitor: {
    getPlatform: () => 'android',
    isPluginAvailable: () => true,
  },
}));
vi.mock('@capgo/capacitor-updater', () => ({ CapacitorUpdater: plugin }));
vi.mock('@capacitor/app', () => ({
  App: { getInfo: async () => ({ version: '1.3', build: '3' }) },
}));
vi.mock('@capacitor/splash-screen', () => ({
  SplashScreen: { show: async () => undefined },
}));
vi.mock('./crashWatch', () => ({ reportLiveUpdateRollback }));

const FAILED = '20261118.171120';

/** A fresh module: `liveUpdateBoot()` runs once per page load. */
async function boot() {
  vi.resetModules();
  const { liveUpdateBoot } = await import('./liveUpdate');

  await liveUpdateBoot();
}

describe('liveUpdateBoot rollback report', () => {
  beforeEach(() => {
    vi.stubEnv('NEXT_PUBLIC_LIVE_UPDATE_VERSION', '20261114.000000');
    vi.stubEnv('NEXT_PUBLIC_LIVE_UPDATE_URL', 'https://cdn.example/updates');
    vi.stubEnv('NEXT_PUBLIC_LIVE_UPDATE_RUNTIME_ANDROID', 'be43745f2e9d268c');
    localStorage.clear();
    plugin.list.mockResolvedValue({ bundles: [] });
    plugin.getFailedUpdate.mockResolvedValue({
      bundle: {
        id: 'WhDy9jgXeS',
        version: FAILED,
        downloaded: '2026-11-18T17:34:53.143Z',
        checksum: '',
        status: 'error',
      },
    });
    reportLiveUpdateRollback.mockClear();
  });

  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it('reports a bundle the plugin rolled back', async () => {
    await boot();

    await vi.waitFor(() =>
      expect(reportLiveUpdateRollback).toHaveBeenCalledWith({
        failedBundle: FAILED,
        downloadedAt: '2026-11-18T17:34:53.143Z',
        runningBundle: '20261114.000000',
        platform: 'android',
        runtime: 'be43745f2e9d268c',
        appVersion: '1.3 (3)',
      }),
    );
    expect(JSON.parse(localStorage.getItem('live-update-failed')!)).toEqual([
      FAILED,
    ]);
  });

  it('reports each rolled-back version once per device', async () => {
    await boot();
    await vi.waitFor(() =>
      expect(reportLiveUpdateRollback).toHaveBeenCalledTimes(1),
    );

    // The plugin can keep answering with the same failure on later launches.
    await boot();
    await new Promise((resolve) => setTimeout(resolve, 20));

    expect(reportLiveUpdateRollback).toHaveBeenCalledTimes(1);
  });

  it('reports nothing when no update failed', async () => {
    plugin.getFailedUpdate.mockResolvedValue(null);

    await boot();
    await new Promise((resolve) => setTimeout(resolve, 20));

    expect(reportLiveUpdateRollback).not.toHaveBeenCalled();
  });
});
