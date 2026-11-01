// Review-only: fakes a signed-in session in the browser so the setup panel
// shows profile counts, without minting a session on the backend (which points
// at production data). GETs pass through without the token; writes are mocked.
(() => {
  const API = 'http://localhost:8001';
  const user = {
    _id: 'mock-user',
    name: 'fan_account',
    username: 'fan_account',
    avatarUrl: null,
  };
  const summary = {
    followersCount: 212,
    followingCount: 40,
    customThemesCount: 18,
    savedThemesCount: 28,
    privateContestsCount: 6,
    publicContestsCount: 3,
    designsCount: 2,
    savedDesignsCount: 4,
  };
  const json = (body, status = 200) =>
    Promise.resolve(
      new Response(JSON.stringify(body), {
        status,
        headers: { 'Content-Type': 'application/json' },
      }),
    );
  const original = window.fetch.bind(window);

  window.fetch = (input, init = {}) => {
    const url = typeof input === 'string' ? input : input.url;

    if (!url.startsWith(API)) return original(input, init);

    const path = url.slice(API.length).split('?')[0];
    const method = (
      init.method ||
      (typeof input !== 'string' && input.method) ||
      'GET'
    ).toUpperCase();

    if (path === '/auth/refresh') return json({ accessToken: 'mock-token' });
    if (path === '/auth/me') return json({ user });
    if (path === '/profiles/me/summary') return json(summary);
    if (method !== 'GET') return json({ message: 'mocked' }, 404);

    const headers = new Headers(init.headers || undefined);

    headers.delete('authorization');

    return original(url, { ...init, headers, credentials: 'omit' });
  };
})();
