import { afterEach, describe, expect, it } from 'vitest';

import { ApiError } from './client';
import {
  errorKey,
  parseSignInMethodError,
  takePendingWebLink,
  webLinkToast,
} from './signInMethods';

describe('parseSignInMethodError', () => {
  it('maps the server codes', () => {
    expect(parseSignInMethodError(new ApiError(409, { code: 'in_use' }))).toBe(
      'inUse',
    );
    expect(
      parseSignInMethodError(new ApiError(409, { code: 'already_connected' })),
    ).toBe('alreadyConnected');
    expect(
      parseSignInMethodError(new ApiError(400, { code: 'last_method' })),
    ).toBe('lastMethod');
    expect(parseSignInMethodError(new ApiError(500, {}))).toBe('unknown');
  });

  it('tells a dropped request from a failing sign-in sheet', () => {
    expect(parseSignInMethodError(new TypeError('Failed to fetch'))).toBe(
      'network',
    );
    expect(parseSignInMethodError(new Error('Google sign-in failed'))).toBe(
      'unknown',
    );
  });
});

describe('errorKey', () => {
  it('names the provider in "already in use"', () => {
    expect(errorKey('inUse', 'google')).toBe('errors.inUseGoogle');
    expect(errorKey('inUse', 'apple')).toBe('errors.inUseApple');
    expect(errorKey('inUse', 'email')).toBe('errors.inUseEmail');
    expect(errorKey('lastMethod', 'email')).toBe('errors.lastMethod');
  });
});

describe('webLinkToast', () => {
  it('turns a landing into a toast', () => {
    expect(webLinkToast('google', 'ok')).toEqual({
      type: 'success',
      key: 'googleConnected',
    });
    expect(webLinkToast('apple', 'in_use')).toEqual({
      type: 'error',
      key: 'errors.inUseApple',
    });
    expect(webLinkToast('google', 'expired')).toEqual({
      type: 'error',
      key: 'errors.expired',
    });
    expect(webLinkToast('google', 'whatever')).toEqual({
      type: 'error',
      key: 'errors.unknown',
    });
  });

  it('stays quiet for a cancel or a provider it does not know', () => {
    expect(webLinkToast('google', 'cancelled')).toBeNull();
    expect(webLinkToast('email', 'ok')).toBeNull();
    expect(webLinkToast(null, 'ok')).toBeNull();
  });
});

describe('takePendingWebLink', () => {
  afterEach(() => localStorage.clear());

  it('is true once for a connect started in the last 30 minutes', () => {
    localStorage.setItem('dp:pending-web-link', String(Date.now() - 1000));
    expect(takePendingWebLink()).toBe(true);
    expect(takePendingWebLink()).toBe(false);

    localStorage.setItem(
      'dp:pending-web-link',
      String(Date.now() - 31 * 60 * 1000),
    );
    expect(takePendingWebLink()).toBe(false);
  });
});
