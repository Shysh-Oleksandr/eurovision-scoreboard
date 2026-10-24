import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import { ApiError } from './client';
import { looksLikeEmail, parseEmailSignInError } from './emailSignIn';

import {
  clearPendingEmailSignIn,
  loadPendingEmailSignIn,
  savePendingEmailSignIn,
} from '@/components/auth/emailSignInPending';

describe('parseEmailSignInError', () => {
  it('maps the server codes and keeps their details', () => {
    expect(
      parseEmailSignInError(
        new ApiError(400, { code: 'invalid_code', attemptsLeft: 3 }),
      ),
    ).toEqual({ kind: 'invalidCode', attemptsLeft: 3, retryAfter: undefined });
    expect(
      parseEmailSignInError(
        new ApiError(429, { code: 'too_many_requests', retryAfter: 120 }),
      ),
    ).toEqual({
      kind: 'tooManyRequests',
      attemptsLeft: undefined,
      retryAfter: 120,
    });
    expect(
      parseEmailSignInError(new ApiError(400, { code: 'code_expired' })).kind,
    ).toBe('codeExpired');
    expect(
      parseEmailSignInError(new ApiError(400, { code: 'too_many_attempts' }))
        .kind,
    ).toBe('tooManyAttempts');
    expect(
      parseEmailSignInError(new ApiError(400, { code: 'undeliverable' })).kind,
    ).toBe('undeliverable');
    expect(
      parseEmailSignInError(new ApiError(503, { code: 'send_failed' })).kind,
    ).toBe('sendFailed');
  });

  it('reads a validation 400 as a bad address', () => {
    expect(
      parseEmailSignInError(
        new ApiError(400, { message: ['email must be an email'] }),
      ).kind,
    ).toBe('invalidEmail');
  });

  it('tells network failures from server errors', () => {
    expect(parseEmailSignInError(new TypeError('Failed to fetch')).kind).toBe(
      'network',
    );
    expect(parseEmailSignInError(new ApiError(500, null)).kind).toBe('unknown');
  });
});

describe('looksLikeEmail', () => {
  it('accepts ordinary addresses and rejects obvious typos', () => {
    expect(looksLikeEmail('kid+esc@example.co.uk')).toBe(true);
    expect(looksLikeEmail('kid@example')).toBe(false);
    expect(looksLikeEmail('kid example@x.com')).toBe(false);
    expect(looksLikeEmail('@example.com')).toBe(false);
  });
});

describe('pending email sign-in', () => {
  beforeEach(() => localStorage.clear());
  afterEach(() => localStorage.clear());

  it('round-trips until the code expires', () => {
    const now = Date.now();

    savePendingEmailSignIn({
      email: 'kid@example.com',
      resendAt: now + 60_000,
      expiresAt: now + 600_000,
    });
    expect(loadPendingEmailSignIn(now)?.email).toBe('kid@example.com');
    expect(loadPendingEmailSignIn(now + 600_001)).toBeNull();
    // An expired entry is dropped.
    expect(localStorage.length).toBe(0);
  });

  it('ignores malformed entries and clears', () => {
    localStorage.setItem('email-sign-in-pending', '{"email":1}');
    expect(loadPendingEmailSignIn()).toBeNull();

    savePendingEmailSignIn({
      email: 'kid@example.com',
      resendAt: 0,
      expiresAt: Date.now() + 1000,
    });
    clearPendingEmailSignIn();
    expect(loadPendingEmailSignIn()).toBeNull();
  });
});
