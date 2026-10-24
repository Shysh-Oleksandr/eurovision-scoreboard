import { readFileSync } from 'fs';
import path from 'path';

import { afterEach, describe, expect, it, vi } from 'vitest';

const load = async (native: boolean) => {
  vi.resetModules();
  vi.stubEnv('NEXT_PUBLIC_NATIVE_APP', native ? '1' : '');

  return import('./shareUrl');
};

afterEach(() => {
  vi.unstubAllEnvs();
  window.history.replaceState({}, '', '/');
});

describe('buildShareUrl', () => {
  it('keeps the website origin and drops the current query', async () => {
    window.history.replaceState({}, '', '/?editor=1&contest=old');
    const { buildShareUrl } = await load(false);

    expect(buildShareUrl({ theme: 'abc' })).toBe(
      `${window.location.origin}/?theme=abc`,
    );
  });

  it('points the apps at the public website', async () => {
    const { buildShareUrl } = await load(true);

    expect(buildShareUrl({ contest: 'c 1' })).toBe(
      'https://douzepoints.app/?contest=c+1',
    );
    expect(buildShareUrl()).toBe('https://douzepoints.app/');
  });
});

describe('findShareParam', () => {
  it('finds the share parameter among others', async () => {
    const { findShareParam } = await load(false);

    expect(
      findShareParam(new URL('https://douzepoints.app/?utm=x&theme=t1')),
    ).toEqual({ key: 'theme', value: 't1' });
    expect(findShareParam(new URL('https://douzepoints.app/?contest='))).toBe(
      null,
    );
    expect(
      findShareParam(new URL('https://douzepoints.app/?provider=google')),
    ).toBe(null);
  });
});

describe('parsePublicSiteUrl', () => {
  it('accepts only links to the public website', async () => {
    const { parsePublicSiteUrl } = await load(true);

    expect(
      parsePublicSiteUrl(
        'https://douzepoints.app/?design=d1',
      )?.searchParams.get('design'),
    ).toBe('d1');
    expect(parsePublicSiteUrl('http://douzepoints.app/?design=d1')).toBe(null);
    expect(parsePublicSiteUrl('https://evil.app/?design=d1')).toBe(null);
    expect(
      parsePublicSiteUrl('com.googleusercontent.apps.123:/oauth2redirect'),
    ).toBe(null);
    expect(parsePublicSiteUrl('not a url')).toBe(null);
  });
});

describe('app link configuration', () => {
  const root = path.join(__dirname, '..', '..');
  const read = (file: string) => readFileSync(path.join(root, file), 'utf8');

  it('opens the apps for exactly the share parameters', async () => {
    const { SHARE_PARAM_KEYS } = await load(false);
    const expected = [...SHARE_PARAM_KEYS].sort();

    const aasa = JSON.parse(
      read('public/.well-known/apple-app-site-association'),
    );
    const [{ components }]: {
      components: { '/': string; '?': Record<string, string> }[];
    }[] = aasa.applinks.details;

    expect(components.every((c) => c['/'] === '/')).toBe(true);
    expect(components.flatMap((c) => Object.keys(c['?'])).sort()).toEqual(
      expected,
    );

    const manifest = read('android/app/src/main/AndroidManifest.xml');
    const androidKeys = [
      ...manifest.matchAll(/android:queryAdvancedPattern="(\w+)=\.\+"/g),
    ].map(([, key]) => key);

    expect(androidKeys.sort()).toEqual(expected);
  });
});
