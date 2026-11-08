import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { useAuthStore } from './useAuthStore';

import { queryClient } from '@/api/queryClient';
import type { Profile } from '@/types/profile';

/**
 * The website path (IS_NATIVE_APP is false in tests): a persisted user whose
 * session restore can't reach the API stays signed in, unverified; only an
 * answer from the server ends the session (docs/offline-mode.md).
 */
const user = { _id: 'u1', username: 'fan', name: 'Fan' } as Profile;

const json = (status: number, body: unknown) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { 'content-type': 'application/json' },
  });

let fetchMock: ReturnType<typeof vi.fn>;

beforeEach(() => {
  fetchMock = vi.fn();
  vi.stubGlobal('fetch', fetchMock);
  useAuthStore.setState({
    user,
    accessToken: 'old',
    sessionStatus: 'unknown',
  });
});

afterEach(() => {
  vi.unstubAllGlobals();
  queryClient.clear();
});

describe('session restore offline', () => {
  it('keeps the account and marks the session unverified on a network error', async () => {
    fetchMock.mockRejectedValue(new TypeError('Failed to fetch'));

    const restored = await useAuthStore.getState().handlePostLogin();

    expect(restored).toBe(false);
    expect(useAuthStore.getState().user).toEqual(user);
    expect(useAuthStore.getState().sessionStatus).toBe('unverified');
  });

  it('restores the session once the API answers again', async () => {
    fetchMock.mockRejectedValueOnce(new TypeError('Failed to fetch'));
    await useAuthStore.getState().handlePostLogin();

    fetchMock
      .mockResolvedValueOnce(json(200, { accessToken: 'new' }))
      .mockResolvedValueOnce(json(200, { user: { ...user, name: 'Renamed' } }));
    await useAuthStore.getState().handlePostLogin();

    expect(useAuthStore.getState().sessionStatus).toBe('verified');
    expect(useAuthStore.getState().accessToken).toBe('new');
    expect(useAuthStore.getState().user?.name).toBe('Renamed');
  });

  it('signs out and drops cached account data when the server rejects the session', async () => {
    queryClient.setQueryData(['user', 'profile-summary'], {
      followersCount: 3,
    });
    fetchMock.mockResolvedValueOnce(json(401, { message: 'Invalid token' }));

    await useAuthStore.getState().handlePostLogin();

    expect(useAuthStore.getState().user).toBeNull();
    expect(useAuthStore.getState().accessToken).toBeNull();
    expect(
      queryClient.getQueryData(['user', 'profile-summary']),
    ).toBeUndefined();
  });

  it('keeps the account when /auth/me gets no answer after a refresh', async () => {
    fetchMock
      .mockResolvedValueOnce(json(200, { accessToken: 'new' }))
      .mockRejectedValueOnce(new TypeError('Failed to fetch'));

    await useAuthStore.getState().handlePostLogin();

    expect(useAuthStore.getState().user).toEqual(user);
    expect(useAuthStore.getState().sessionStatus).toBe('unverified');
  });
});

describe('refresh', () => {
  it('shares one request between concurrent callers', async () => {
    fetchMock.mockResolvedValueOnce(json(200, { accessToken: 'new' }));

    const [a, b] = await Promise.all([
      useAuthStore.getState().refresh(),
      useAuthStore.getState().refresh(),
    ]);

    expect(a).toBe('new');
    expect(b).toBe('new');
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it('starts a new request once the previous one settled', async () => {
    fetchMock
      .mockResolvedValueOnce(json(200, { accessToken: 'first' }))
      .mockResolvedValueOnce(json(200, { accessToken: 'second' }));

    await useAuthStore.getState().refresh();
    const token = await useAuthStore.getState().refresh();

    expect(token).toBe('second');
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });
});

describe('logout offline', () => {
  it('changes nothing when the server can not be reached', async () => {
    fetchMock.mockRejectedValue(new TypeError('Failed to fetch'));

    await expect(useAuthStore.getState().logout()).rejects.toBeTruthy();

    expect(useAuthStore.getState().user).toEqual(user);
    expect(useAuthStore.getState().isBusy).toBe(false);
  });
});
