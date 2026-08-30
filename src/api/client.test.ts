import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

/**
 * The client keeps auth/refresh state at module scope, so each test gets a
 * fresh module instance via resetModules + dynamic import.
 */
type ClientModule = typeof import('./client');

const jsonResponse = (
  status: number,
  body: unknown,
  headers: Record<string, string> = {},
) =>
  new Response(body === undefined ? null : JSON.stringify(body), {
    status,
    headers: { 'content-type': 'application/json', ...headers },
  });

describe('api client (fetch wrapper)', () => {
  let client: ClientModule;
  let fetchMock: ReturnType<typeof vi.fn>;

  beforeEach(async () => {
    vi.resetModules();
    fetchMock = vi.fn();
    vi.stubGlobal('fetch', fetchMock);
    client = await import('./client');
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('resolves 2xx JSON with { data, status } and injects the bearer token', async () => {
    client.setAccessTokenGetter(() => 'token-1');
    fetchMock.mockResolvedValueOnce(jsonResponse(200, { hello: 'world' }));

    const res = await client.api.get('/things');

    expect(res.status).toBe(200);
    expect(res.data).toEqual({ hello: 'world' });
    const [[url, init]] = fetchMock.mock.calls;

    expect(url).toMatch(/\/things$/);
    expect(init.credentials).toBe('include');
    expect(new Headers(init.headers).get('authorization')).toBe(
      'Bearer token-1',
    );
  });

  it('serializes params, skipping null/undefined and repeating arrays', async () => {
    fetchMock.mockResolvedValueOnce(jsonResponse(200, []));

    await client.api.get('/errors', {
      params: { page: 2, q: 'x y', skip: undefined, gone: null, ids: [1, 2] },
    });

    const [[url]] = fetchMock.mock.calls;

    expect(url).toContain('/errors?');
    expect(url).toContain('page=2');
    expect(url).toContain('q=x+y');
    expect(url).not.toContain('skip');
    expect(url).not.toContain('gone');
    expect(url).toContain('ids%5B%5D=1');
    expect(url).toContain('ids%5B%5D=2');
  });

  it('JSON-stringifies plain bodies with a json content-type', async () => {
    fetchMock.mockResolvedValueOnce(jsonResponse(201, { id: 1 }));

    await client.api.post('/contests', { name: 'ESC' });

    const [[, init]] = fetchMock.mock.calls;

    expect(init.method).toBe('POST');
    expect(init.body).toBe('{"name":"ESC"}');
    expect(new Headers(init.headers).get('content-type')).toBe(
      'application/json',
    );
  });

  it('passes FormData through and drops any caller multipart content-type', async () => {
    fetchMock.mockResolvedValueOnce(jsonResponse(200, {}));
    const form = new FormData();

    form.append('file', new Blob(['x']), 'x.png');

    await client.api.post('/profiles/me/avatar', form, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });

    const [[, init]] = fetchMock.mock.calls;

    expect(init.body).toBe(form);
    expect(new Headers(init.headers).has('content-type')).toBe(false);
  });

  it('sends a DELETE body from config.data', async () => {
    fetchMock.mockResolvedValueOnce(jsonResponse(200, {}));

    await client.api.delete('/errors/bulk/delete', { data: { ids: ['a'] } });

    const [[, init]] = fetchMock.mock.calls;

    expect(init.method).toBe('DELETE');
    expect(init.body).toBe('{"ids":["a"]}');
  });

  it('throws an error carrying response.status and response.data on non-2xx', async () => {
    fetchMock.mockResolvedValueOnce(
      jsonResponse(400, { message: ['first problem', 'second'] }),
    );

    const err: any = await client.api
      .post('/themes', {})
      .catch((error) => error);

    expect(err.response.status).toBe(400);
    expect(err.response.data.message).toEqual(['first problem', 'second']);
  });

  it('propagates network failures without a response property', async () => {
    fetchMock.mockRejectedValueOnce(new TypeError('Failed to fetch'));

    const err: any = await client.api.get('/things').catch((error) => error);

    expect(err).toBeInstanceOf(TypeError);
    expect(err.response).toBeUndefined();
  });

  it('throws 401s straight through before the refresh interceptor attaches', async () => {
    fetchMock.mockResolvedValueOnce(jsonResponse(401, { message: 'nope' }));

    const err: any = await client.api.get('/auth/me').catch((error) => error);

    expect(err.response.status).toBe(401);
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it('refreshes once on 401 and retries once with the fresh token', async () => {
    const refresh = vi.fn(async () => {
      client.setAccessTokenGetter(() => 'fresh');

      return 'fresh';
    });

    client.setAccessTokenGetter(() => 'stale');
    client.attachRefreshInterceptor(refresh);
    fetchMock
      .mockResolvedValueOnce(jsonResponse(401, {}))
      .mockResolvedValueOnce(jsonResponse(200, { me: true }));

    const res = await client.api.get('/auth/me');

    expect(res.data).toEqual({ me: true });
    expect(refresh).toHaveBeenCalledTimes(1);
    const [, [, retryInit]] = fetchMock.mock.calls;

    expect(new Headers(retryInit.headers).get('authorization')).toBe(
      'Bearer fresh',
    );
  });

  it('single-flights the refresh across concurrent 401s', async () => {
    let release: (token: string) => void = () => {};
    const refresh = vi.fn(
      () =>
        new Promise<string>((resolve) => {
          release = resolve;
        }),
    );

    client.attachRefreshInterceptor(refresh);
    fetchMock.mockImplementation(async (url: string, init: RequestInit) => {
      const auth = new Headers(init.headers).get('authorization');

      if (auth === 'Bearer fresh') return jsonResponse(200, { url });

      return jsonResponse(401, {});
    });

    const p1 = client.api.get('/a');
    const p2 = client.api.get('/b');

    await vi.waitFor(() => expect(refresh).toHaveBeenCalledTimes(1));
    release('fresh');
    const [r1, r2] = await Promise.all([p1, p2]);

    expect(refresh).toHaveBeenCalledTimes(1);
    expect(r1.status).toBe(200);
    expect(r2.status).toBe(200);
  });

  it('does not try to refresh when the refresh endpoint itself 401s', async () => {
    const refresh = vi.fn(async () => 'x');

    client.attachRefreshInterceptor(refresh);
    fetchMock.mockResolvedValueOnce(jsonResponse(401, {}));

    const err: any = await client.api
      .post('/auth/refresh', {})
      .catch((error) => error);

    expect(err.response.status).toBe(401);
    expect(refresh).not.toHaveBeenCalled();
  });

  it('retries at most once: a 401 after refresh surfaces as the error', async () => {
    const refresh = vi.fn(async () => 'fresh');

    client.attachRefreshInterceptor(refresh);
    fetchMock
      .mockResolvedValueOnce(jsonResponse(401, {}))
      .mockResolvedValueOnce(jsonResponse(401, { message: 'still no' }));

    const err: any = await client.api.get('/auth/me').catch((error) => error);

    expect(refresh).toHaveBeenCalledTimes(1);
    expect(fetchMock).toHaveBeenCalledTimes(2);
    expect(err.response.status).toBe(401);
  });

  it('propagates a failed refresh instead of the original 401', async () => {
    const refreshError = new Error('refresh exploded');
    const refresh = vi.fn(async () => {
      throw refreshError;
    });

    client.attachRefreshInterceptor(refresh);
    fetchMock.mockResolvedValueOnce(jsonResponse(401, {}));

    const err: any = await client.api.get('/auth/me').catch((error) => error);

    expect(err).toBe(refreshError);
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it('returns null data for empty responses and text for non-JSON', async () => {
    fetchMock.mockResolvedValueOnce(new Response(null, { status: 204 }));
    const empty = await client.api.delete('/things/1');

    expect(empty.data).toBeNull();

    fetchMock.mockResolvedValueOnce(
      new Response('plain', {
        status: 200,
        headers: { 'content-type': 'text/plain' },
      }),
    );
    const text = await client.api.get('/raw');

    expect(text.data).toBe('plain');
  });
});
