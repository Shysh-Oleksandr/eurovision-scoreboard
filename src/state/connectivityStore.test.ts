import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

/**
 * The store keeps its monitor and probe state at module scope, so each test
 * gets fresh modules (client + store) via resetModules + dynamic import.
 */
type Store = typeof import('./connectivityStore');
type Client = typeof import('@/api/client');

let store: Store;
let client: Client;
let fetchMock: ReturnType<typeof vi.fn>;

const answer = () => new Response(null, { status: 200 });
const noAnswer = () => Promise.reject(new TypeError('Failed to fetch'));

const setOnLine = (value: boolean) =>
  Object.defineProperty(window.navigator, 'onLine', {
    configurable: true,
    get: () => value,
  });

beforeEach(async () => {
  vi.useFakeTimers();
  vi.resetModules();
  setOnLine(true);
  fetchMock = vi.fn();
  vi.stubGlobal('fetch', fetchMock);
  client = await import('@/api/client');
  store = await import('./connectivityStore');
  store.startConnectivityMonitor();
});

afterEach(() => {
  vi.useRealTimers();
  vi.unstubAllGlobals();
});

describe('connectivity', () => {
  it('starts online', () => {
    expect(store.getConnectivityStatus()).toBe('online');
  });

  it('follows the browser offline and online events', () => {
    window.dispatchEvent(new Event('offline'));
    expect(store.getConnectivityStatus()).toBe('offline');

    window.dispatchEvent(new Event('online'));
    expect(store.getConnectivityStatus()).toBe('online');
  });

  it('marks the API unreachable only when the probe fails too', async () => {
    // The request fails, then the probe answers: still online.
    fetchMock.mockImplementationOnce(noAnswer).mockResolvedValueOnce(answer());
    await client.api.get('/themes').catch(() => undefined);
    await vi.runOnlyPendingTimersAsync();
    expect(store.getConnectivityStatus()).toBe('online');

    // The request fails and so does the probe.
    fetchMock.mockImplementationOnce(noAnswer).mockImplementationOnce(noAnswer);
    await client.api.get('/themes').catch(() => undefined);
    await vi.advanceTimersByTimeAsync(0);
    expect(store.getConnectivityStatus()).toBe('unreachable');
  });

  it('fails requests at once while unreachable, and re-probes until the API answers', async () => {
    const reconnected = vi.fn();

    store.onReconnect(reconnected);
    fetchMock.mockImplementation(noAnswer);
    await client.api.get('/themes').catch(() => undefined);
    await vi.advanceTimersByTimeAsync(0);
    expect(store.getConnectivityStatus()).toBe('unreachable');

    const calls = fetchMock.mock.calls.length;
    const err = await client.api.get('/themes').catch((error) => error);

    expect(client.isNetworkError(err)).toBe(true);
    expect(fetchMock.mock.calls.length).toBe(calls);

    fetchMock.mockImplementation(() => Promise.resolve(answer()));
    await vi.advanceTimersByTimeAsync(5_000);

    expect(store.getConnectivityStatus()).toBe('online');
    expect(reconnected).toHaveBeenCalledTimes(1);
  });

  it('assumes the API answers again when the device reconnects', async () => {
    fetchMock.mockImplementation(noAnswer);
    await client.api.get('/themes').catch(() => undefined);
    await vi.advanceTimersByTimeAsync(0);
    window.dispatchEvent(new Event('offline'));
    expect(store.getConnectivityStatus()).toBe('offline');

    window.dispatchEvent(new Event('online'));
    expect(store.getConnectivityStatus()).toBe('online');
  });
});
