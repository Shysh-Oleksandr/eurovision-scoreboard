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
