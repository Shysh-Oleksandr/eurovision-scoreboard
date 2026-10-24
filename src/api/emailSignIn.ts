import { api, ApiError } from './client';

/**
 * Passwordless email sign-in (docs/email-sign-in.md): `/auth/email/start`
 * emails a 6-digit code, `/auth/email/verify` (in `useAuthStore`) signs in
 * with it. One flow for new and existing accounts.
 */

export interface EmailCodeSent {
  /** Seconds until another code may be requested. */
  resendAfter: number;
  /** Seconds the code stays valid. */
  expiresIn: number;
}

export async function requestEmailCode(
  email: string,
  locale: string,
): Promise<EmailCodeSent> {
  const { data } = await api.post<EmailCodeSent>('/auth/email/start', {
    email,
    locale,
  });

  return data;
}

export type EmailSignInErrorKind =
  | 'invalidEmail'
  | 'tooManyRequests'
  | 'undeliverable'
  | 'sendFailed'
  | 'invalidCode'
  | 'tooManyAttempts'
  | 'codeExpired'
  | 'network'
  | 'unknown';

export interface EmailSignInError {
  kind: EmailSignInErrorKind;
  /** `invalidCode`: guesses left on this code. */
  attemptsLeft?: number;
  /** `tooManyRequests`: seconds to wait. */
  retryAfter?: number;
}

/** The server's `code` → the dialog's error kind. */
function kindOfCode(code: unknown): EmailSignInErrorKind | null {
  switch (code) {
    case 'too_many_requests':
      return 'tooManyRequests';
    case 'undeliverable':
      return 'undeliverable';
    case 'send_failed':
      return 'sendFailed';
    case 'invalid_code':
      return 'invalidCode';
    case 'too_many_attempts':
      return 'tooManyAttempts';
    case 'code_expired':
      return 'codeExpired';
    default:
      return null;
  }
}

/** Maps a failed start/verify call to the message the dialog shows. */
export function parseEmailSignInError(error: unknown): EmailSignInError {
  // fetch rejects with a TypeError when the request never completes.
  if (!(error instanceof ApiError)) return { kind: 'network' };

  const { status, data } = error.response;
  const kind = kindOfCode(data?.code);

  if (kind) {
    return {
      kind,
      attemptsLeft:
        typeof data.attemptsLeft === 'number' ? data.attemptsLeft : undefined,
      retryAfter:
        typeof data.retryAfter === 'number' ? data.retryAfter : undefined,
    };
  }
  // The request validation rejected the address (or a malformed code).
  if (status === 400) return { kind: 'invalidEmail' };
  if (status === 429) return { kind: 'tooManyRequests' };
  if (status === 0) return { kind: 'network' };

  return { kind: 'unknown' };
}

/** A plausible address: something@something.tld, no spaces. */
export function looksLikeEmail(value: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
}
