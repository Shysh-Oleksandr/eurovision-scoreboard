import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { takePendingWebLogin, useAuthStore } from './useAuthStore';

const realLocation = window.location;

beforeEach(() => {
  localStorage.clear();
  // `login()` leaves for the provider's page; keep jsdom where it is.
  Object.defineProperty(window, 'location', {
    configurable: true,
    value: { ...realLocation, href: realLocation.href },
  });
});

afterEach(() => {
  vi.useRealTimers();
  Object.defineProperty(window, 'location', {
    configurable: true,
    value: realLocation,
  });
});

describe('takePendingWebLogin', () => {
  it('is false for a landing no sign-in started (a saved ?provider= link)', () => {
    expect(takePendingWebLogin()).toBe(false);
  });

  it('is true once after login() left for the provider', () => {
    useAuthStore.getState().login('google');

    expect(window.location.href).toMatch(/\/auth\/google$/);
    expect(takePendingWebLogin()).toBe(true);
    expect(takePendingWebLogin()).toBe(false);
  });

  it('ignores a sign-in abandoned over half an hour ago', () => {
    vi.useFakeTimers();
    useAuthStore.getState().login('apple');
    vi.advanceTimersByTime(31 * 60 * 1000);

    expect(takePendingWebLogin()).toBe(false);
  });
});
