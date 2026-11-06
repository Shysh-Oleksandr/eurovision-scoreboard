import { useQuery } from '@tanstack/react-query';

import { api, ApiError } from './client';
import { queryClient } from './queryClient';
import { queryKeys } from './queryKeys';

import { API_BASE_URL } from '@/config';
import { IS_NATIVE_APP } from '@/native/platform';

/**
 * The signed-in account's sign-in methods (docs/sign-in-methods.md): Google,
 * Apple and email codes, at most one of each. Connecting proves the new
 * method in the same step; one that already opens another account is
 * refused (`in_use`), accounts are never merged.
 */

export type SignInMethod = 'google' | 'apple' | 'email';
export type SignInProvider = 'google' | 'apple';

export interface SignInMethods {
  google: { email?: string } | null;
  apple: { email?: string; hiddenEmail: boolean } | null;
  /** The address email codes sign in with. */
  email: { address: string; hiddenEmail: boolean } | null;
}

export function useSignInMethodsQuery(enabled: boolean) {
  return useQuery({
    queryKey: queryKeys.user.signInMethods(),
    queryFn: async () => {
      const { data } = await api.get<SignInMethods>('/auth/methods');

      return data;
    },
    enabled,
  });
}

function setMethods(methods: SignInMethods) {
  queryClient.setQueryData(queryKeys.user.signInMethods(), methods);
}

/** How a connect or a removal failed, for the message shown. */
export type SignInMethodErrorKind =
  | 'inUse'
  | 'alreadyConnected'
  | 'lastMethod'
  | 'network'
  | 'unknown';

export function parseSignInMethodError(error: unknown): SignInMethodErrorKind {
  // fetch rejects with a TypeError when the request never completes; other
  // errors come from the native sign-in sheets.
  if (error instanceof TypeError) return 'network';
  if (!(error instanceof ApiError)) return 'unknown';

  switch (error.response.data?.code) {
    case 'in_use':
      return 'inUse';
    case 'already_connected':
      return 'alreadyConnected';
    case 'last_method':
      return 'lastMethod';
    default:
      return error.response.status === 0 ? 'network' : 'unknown';
  }
}

const nativeAuth = () => import('@/native/nativeAuth');

/**
 * Connects Google or Apple. The apps show the platform's sheet and post its
 * token (resolves to the new list, or null when the sheet was dismissed).
 * The website arms the link cookie and leaves for the provider; the
 * redirect lands on `?link=<provider>&result=…` (AppBootstrap).
 */
export async function connectProvider(
  provider: SignInProvider,
): Promise<SignInMethods | null> {
  if (!IS_NATIVE_APP) {
    await api.post('/auth/methods/link', { provider });
    markWebLinkPending();
    window.location.href = `${API_BASE_URL}/auth/${provider}/link`;

    // The page is leaving; never resolve so the button stays busy.
    return new Promise<never>(() => {});
  }

  const { getAppleCredential, getGoogleIdToken, signOutOfGoogle } =
    await nativeAuth();
  let data: SignInMethods;

  if (provider === 'apple') {
    const credential = await getAppleCredential();

    if (!credential) return null;
    ({ data } = await api.post<SignInMethods>('/auth/methods/apple', {
      identityToken: credential.identityToken,
      authorizationCode: credential.authorizationCode,
    }));
  } else {
    // Forget the account the SDK remembers, so the sheet offers a choice.
    await signOutOfGoogle();
    const idToken = await getGoogleIdToken();

    if (!idToken) return null;
    ({ data } = await api.post<SignInMethods>('/auth/methods/google', {
      idToken,
    }));
  }
  setMethods(data);

  return data;
}

export async function removeSignInMethod(
  method: SignInMethod,
): Promise<SignInMethods> {
  const { data } = await api.delete<SignInMethods>(`/auth/methods/${method}`);

  setMethods(data);

  return data;
}

/** Add or change the address, step 1 (same answers as sign-in's start). */
export async function requestLinkEmailCode(email: string, locale: string) {
  const { data } = await api.post<{ resendAfter: number; expiresIn: number }>(
    '/auth/methods/email/start',
    { email, locale },
  );

  return data;
}

/** Step 2: the emailed code; rejects with `in_use` for another account's. */
export async function verifyLinkEmailCode(
  email: string,
  code: string,
): Promise<SignInMethods> {
  const { data } = await api.post<SignInMethods>('/auth/methods/email/verify', {
    email,
    code,
  });

  setMethods(data);

  return data;
}

/**
 * Like `dp:pending-web-login`: the `?link=` landing is kept in history, so
 * only a landing with a recent marker toasts.
 */
const PENDING_WEB_LINK_KEY = 'dp:pending-web-link';
const PENDING_WEB_LINK_TTL_MS = 30 * 60 * 1000;

function markWebLinkPending() {
  try {
    localStorage.setItem(PENDING_WEB_LINK_KEY, String(Date.now()));
  } catch {
    // Storage blocked: the connect still happens, just without a toast.
  }
}

/** Reads and clears the marker: true when this browser started a connect. */
export function takePendingWebLink(): boolean {
  try {
    const startedAt = Number(localStorage.getItem(PENDING_WEB_LINK_KEY));

    localStorage.removeItem(PENDING_WEB_LINK_KEY);

    return startedAt > 0 && Date.now() - startedAt < PENDING_WEB_LINK_TTL_MS;
  } catch {
    return false;
  }
}

/** How a website connect ended (`AuthController.linkLanding`). */
export type WebLinkResult =
  | 'ok'
  | 'cancelled'
  | 'in_use'
  | 'already_connected'
  | 'expired'
  | 'error';

/**
 * The toast for a `?link=<provider>&result=…` landing, as a key under
 * `widgets.profile.signInMethods`; null for nothing to say (cancelled).
 */
export function webLinkToast(
  provider: string | null,
  result: string | null,
): { type: 'success' | 'error'; key: string } | null {
  if (provider !== 'google' && provider !== 'apple') return null;

  switch (result as WebLinkResult) {
    case 'ok':
      return { type: 'success', key: `${provider}Connected` };
    case 'cancelled':
      return null;
    case 'in_use':
      return { type: 'error', key: errorKey('inUse', provider) };
    case 'already_connected':
      return { type: 'error', key: errorKey('alreadyConnected', provider) };
    case 'expired':
      return { type: 'error', key: 'errors.expired' };
    default:
      return { type: 'error', key: errorKey('unknown', provider) };
  }
}

/** The message key (under `widgets.profile.signInMethods`) for an error. */
export function errorKey(
  kind: SignInMethodErrorKind,
  method: SignInMethod,
): string {
  if (kind === 'inUse') {
    return method === 'google'
      ? 'errors.inUseGoogle'
      : method === 'apple'
      ? 'errors.inUseApple'
      : 'errors.inUseEmail';
  }

  return `errors.${kind}`;
}
