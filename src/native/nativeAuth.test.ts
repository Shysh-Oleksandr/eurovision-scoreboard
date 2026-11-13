import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const { initialize, login, platform } = vi.hoisted(() => ({
  initialize: vi.fn(),
  login: vi.fn(),
  platform: { current: 'android' },
}));

vi.mock('@capacitor/core', () => ({
  Capacitor: { getPlatform: () => platform.current },
}));
vi.mock('@capgo/capacitor-social-login', () => ({
  SocialLogin: { initialize, login },
}));

/** A fresh module (its cached plugin init) with the client IDs set. */
async function loadNativeAuth() {
  vi.resetModules();
  vi.stubEnv('NEXT_PUBLIC_GOOGLE_WEB_CLIENT_ID', 'web-client');
  vi.stubEnv('NEXT_PUBLIC_GOOGLE_IOS_CLIENT_ID', 'ios-client');

  return import('./nativeAuth');
}

beforeEach(() => {
  initialize.mockReset().mockResolvedValue(undefined);
  login.mockReset().mockResolvedValue({
    result: { responseType: 'online', idToken: 'id-token' },
  });
});

afterEach(() => {
  vi.unstubAllEnvs();
});

describe('getGoogleIdToken', () => {
  it('passes no scopes on Android, where the plugin refuses them', async () => {
    platform.current = 'android';
    const { getGoogleIdToken } = await loadNativeAuth();

    await expect(getGoogleIdToken()).resolves.toBe('id-token');
    expect(login).toHaveBeenCalledWith({ provider: 'google', options: {} });
  });

  it('keeps the email and profile scopes on iOS', async () => {
    platform.current = 'ios';
    const { getGoogleIdToken } = await loadNativeAuth();

    await expect(getGoogleIdToken()).resolves.toBe('id-token');
    expect(login).toHaveBeenCalledWith({
      provider: 'google',
      options: { scopes: ['email', 'profile'] },
    });
  });

  it('returns null when the account sheet is dismissed', async () => {
    login.mockRejectedValue(
      Object.assign(new Error('Google Sign-In cancelled by user'), {
        code: 'USER_CANCELLED',
      }),
    );
    const { getGoogleIdToken } = await loadNativeAuth();

    await expect(getGoogleIdToken()).resolves.toBeNull();
  });
});
