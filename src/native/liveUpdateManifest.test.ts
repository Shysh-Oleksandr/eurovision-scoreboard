import { describe, expect, it } from 'vitest';

import type { BundleInfo } from '@capgo/capacitor-updater';

import {
  bundleUpdateLevel,
  compareAppVersions,
  isBundleVersion,
  isNewerBundle,
  parseManifest,
  parseStoreGate,
  pickBundleToApply,
  storeUpdateLevel,
} from './liveUpdateManifest';

const BASE_URL = 'https://cdn.douzepoints.app/app-updates';

const manifest = {
  version: '20261012.143005',
  platform: 'ios',
  runtime: '0123456789abcdef',
  url: `${BASE_URL}/bundles/20261012.143005.zip`,
  checksum: 'ab'.repeat(256),
  sessionKey: 'aXY=:a2V5',
  size: 123,
  commit: 'abc1234',
  publishedAt: '2026-10-12T14:31:10.000Z',
};

const expected = {
  platform: 'ios' as const,
  runtime: '0123456789abcdef',
  baseUrl: BASE_URL,
};

const bundle = (
  version: string,
  status: BundleInfo['status'] = 'pending',
): BundleInfo => ({
  id: `id-${version}`,
  version,
  status,
  downloaded: '2026-10-12T14:31:10.000Z',
  checksum: '',
});

describe('bundle versions', () => {
  it('accepts the build-time stamp only', () => {
    expect(isBundleVersion('20261012.143005')).toBe(true);
    expect(isBundleVersion('builtin')).toBe(false);
    expect(isBundleVersion('1.0.0')).toBe(false);
    expect(isBundleVersion('')).toBe(false);
    expect(isBundleVersion(undefined)).toBe(false);
  });

  it('compares by build time', () => {
    expect(isNewerBundle('20261012.143005', '20261012.143004')).toBe(true);
    expect(isNewerBundle('20261013.000000', '20261012.235959')).toBe(true);
    expect(isNewerBundle('20261012.143005', '20261012.143005')).toBe(false);
    expect(isNewerBundle('20261011.143005', '20261012.143005')).toBe(false);
  });

  it('never calls anything newer than a build without a version', () => {
    expect(isNewerBundle('20261012.143005', '')).toBe(false);
    expect(isNewerBundle('', '20261012.143005')).toBe(false);
  });
});

describe('parseManifest', () => {
  it('accepts a manifest for this platform and runtime', () => {
    expect(parseManifest(manifest, expected)).toEqual({
      version: manifest.version,
      platform: 'ios',
      runtime: manifest.runtime,
      url: manifest.url,
      checksum: manifest.checksum,
      sessionKey: manifest.sessionKey,
    });
  });

  it('accepts the JSON text Android may hand back', () => {
    expect(parseManifest(JSON.stringify(manifest), expected)?.version).toBe(
      manifest.version,
    );
    expect(parseManifest('{not json', expected)).toBeNull();
  });

  it('rejects another platform or runtime', () => {
    expect(
      parseManifest({ ...manifest, platform: 'android' }, expected),
    ).toBeNull();
    expect(
      parseManifest({ ...manifest, runtime: 'fedcba9876543210' }, expected),
    ).toBeNull();
  });

  it('rejects a bundle on another origin', () => {
    expect(
      parseManifest(
        { ...manifest, url: 'https://example.com/b.zip' },
        expected,
      ),
    ).toBeNull();
    expect(
      parseManifest({ ...manifest, url: 'not a url' }, expected),
    ).toBeNull();
  });

  it('keeps valid update floors and ignores malformed ones', () => {
    expect(
      parseManifest(
        {
          ...manifest,
          requiredVersion: '20261010.000000',
          promptVersion: '20261012.143005',
        },
        expected,
      ),
    ).toMatchObject({
      requiredVersion: '20261010.000000',
      promptVersion: '20261012.143005',
    });

    const parsed = parseManifest(
      { ...manifest, requiredVersion: 'soon', promptVersion: 42 },
      expected,
    );

    expect(parsed?.version).toBe(manifest.version);
    expect(parsed).not.toHaveProperty('requiredVersion');
    expect(parsed).not.toHaveProperty('promptVersion');
  });

  it('rejects missing signatures and bad versions', () => {
    expect(parseManifest({ ...manifest, checksum: '' }, expected)).toBeNull();
    expect(
      parseManifest({ ...manifest, sessionKey: undefined }, expected),
    ).toBeNull();
    expect(
      parseManifest({ ...manifest, version: '1.0.1' }, expected),
    ).toBeNull();
    expect(parseManifest(null, expected)).toBeNull();
  });
});

describe('pickBundleToApply', () => {
  const running = '20261012.120000';

  it('picks the newest downloaded bundle newer than the running one', () => {
    const picked = pickBundleToApply(
      [
        bundle('builtin', 'success'),
        bundle('20261012.130000'),
        bundle('20261012.140000'),
        bundle('20261012.110000'),
      ],
      running,
      [],
    );

    expect(picked?.version).toBe('20261012.140000');
  });

  it('skips bundles that ran before, failed or are not newer', () => {
    expect(
      pickBundleToApply(
        [
          bundle('20261012.130000', 'success'),
          bundle('20261012.140000', 'error'),
          bundle('20261012.150000', 'downloading'),
          bundle(running),
        ],
        running,
        [],
      ),
    ).toBeNull();
  });

  it('skips versions that were rolled back on this device', () => {
    expect(
      pickBundleToApply([bundle('20261012.130000')], running, [
        '20261012.130000',
      ]),
    ).toBeNull();
  });

  it('does nothing in a build without a version', () => {
    expect(pickBundleToApply([bundle('20261012.130000')], '', [])).toBeNull();
  });
});

describe('bundleUpdateLevel', () => {
  const floors = {
    requiredVersion: '20261020.000000',
    promptVersion: '20261025.000000',
  };

  it('requires a switch for bundles older than the required one', () => {
    expect(bundleUpdateLevel(floors, '20261019.235959')).toBe('required');
  });

  it('prompts bundles between the required and the prompt floor', () => {
    expect(bundleUpdateLevel(floors, '20261020.000000')).toBe('prompt');
    expect(bundleUpdateLevel(floors, '20261024.000000')).toBe('prompt');
  });

  it('stays silent for bundles at or past both floors', () => {
    expect(bundleUpdateLevel(floors, '20261025.000000')).toBe('silent');
    expect(bundleUpdateLevel({}, '20261001.000000')).toBe('silent');
  });

  it('never escalates a build without a version', () => {
    expect(bundleUpdateLevel(floors, '')).toBe('silent');
  });
});

describe('store gate', () => {
  it('compares app versions numerically', () => {
    expect(compareAppVersions('1.10', '1.9')).toBe(1);
    expect(compareAppVersions('1.0', '1')).toBe(0);
    expect(compareAppVersions('1.0.1', '1.1')).toBe(-1);
  });

  it('parses the gate for this platform only', () => {
    const gate = {
      platform: 'android',
      required: '1.1',
      recommended: '1.2',
      url: 'https://play.google.com/store/apps/details?id=app.douzepoints',
    };

    expect(parseStoreGate(gate, 'android')).toEqual({
      required: '1.1',
      recommended: '1.2',
      url: gate.url,
    });
    expect(parseStoreGate(JSON.stringify(gate), 'android')?.required).toBe(
      '1.1',
    );
    expect(parseStoreGate(gate, 'ios')).toBeNull();
    expect(parseStoreGate('{nope', 'android')).toBeNull();
  });

  it('drops malformed versions and non-https links', () => {
    expect(
      parseStoreGate(
        {
          platform: 'ios',
          required: 'v2',
          recommended: '1.2',
          url: 'http://apps.apple.com/app/id1',
        },
        'ios',
      ),
    ).toEqual({ recommended: '1.2' });
  });

  it('blocks below required, nudges below recommended', () => {
    const gate = { required: '1.1', recommended: '1.2' };

    expect(storeUpdateLevel(gate, '1.0')).toBe('required');
    expect(storeUpdateLevel(gate, '1.1')).toBe('recommended');
    expect(storeUpdateLevel(gate, '1.2')).toBeNull();
    expect(storeUpdateLevel({}, '1.0')).toBeNull();
  });

  it('never blocks an app whose version it cannot read', () => {
    expect(storeUpdateLevel({ required: '9.0' }, '')).toBeNull();
    expect(storeUpdateLevel({ required: '9.0' }, '1.0 (beta)')).toBeNull();
  });
});
