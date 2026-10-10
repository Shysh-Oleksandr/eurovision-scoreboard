import { create } from 'zustand';

import { persist } from 'zustand/middleware';

import { useCountriesStore } from './countriesStore';
import { useGeneralStore } from './generalStore';

import { clearUserData } from '@/api/clearUserData';
import {
  api,
  ApiError,
  setAccessTokenGetter,
  attachRefreshInterceptor,
} from '@/api/client';
import { queryClient } from '@/api/queryClient';
import { API_BASE_URL } from '@/config';
import { IS_NATIVE_APP } from '@/native/platform';
import type { Profile } from '@/types/profile';

/**
 * Fired after a native-app sign-in attempt that got past the account sheet
 * (AppBootstrap shows the toast). The website reports its result through the
 * `?provider=google` / `?provider=apple` redirect instead.
 */
export const NATIVE_LOGIN_EVENT = 'dp:native-login';

export type AuthProvider = 'google' | 'apple';

const nativeAuth = () => import('@/native/nativeAuth');

export interface AuthState {
  user: Profile | null;
  accessToken: string | null;
  isBusy: boolean;
  /** Native apps: the account sheet / token exchange is in progress. */
  isSigningIn: boolean;
  login: (provider: AuthProvider) => void;
  handlePostLogin: (force?: boolean) => Promise<boolean>;
  refresh: () => Promise<string | undefined>;
  fetchMe: () => Promise<void>;
  logout: () => Promise<void>;
  /** Deletes the account and all of its data on the server, then signs out. */
  deleteAccount: () => Promise<void>;
}

type LoginStep = 'refresh' | 'me';

/**
 * The login toast can't say why it failed, so post the failing step and
 * response to /admin/errors: a 401 "Missing refresh token" means the browser
 * dropped the cookie, no status means the request never completed.
 */
function reportLoginFailure(step: LoginStep, error: unknown) {
  const response = error instanceof ApiError ? error.response : undefined;
  const detail =
    typeof response?.data?.message === 'string'
      ? ` ${response.data.message}`
      : '';

  api
    .post('/errors', {
      message: `Login failed at /auth/${step}: ${
        response ? `${response.status}${detail}` : 'network error'
      }`.slice(0, 300),
      stack: error instanceof Error ? error.stack : undefined,
      userDetails: {
        platform: navigator.platform,
        userAgent: navigator.userAgent,
        language: navigator.language,
        cookieEnabled: navigator.cookieEnabled,
        onLine: navigator.onLine,
      },
      generalInfo: {
        step,
        status: response?.status,
        response:
          typeof response?.data === 'string'
            ? response.data.slice(0, 500)
            : response?.data,
        error: error instanceof Error ? error.message : String(error),
      },
    })
    .catch(() => {});
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set, get) => ({
      user: null,
      accessToken: null,
      isBusy: false,
      isSigningIn: false,
      login: (provider) => {
        if (IS_NATIVE_APP) {
          void loginNatively(provider);

          return;
        }
        window.location.href = `${API_BASE_URL}/auth/${provider}`;
      },
      handlePostLogin: async (force?: boolean) => {
        // Native: the stored refresh token, not the persisted user, says
        // whether there is a session — an offline launch clears `user`, and
        // the next online launch should still restore it.
        const hasSession = IS_NATIVE_APP
          ? !!(await (await nativeAuth()).getRefreshToken())
          : !!get().user;

        if (!hasSession && !force) return false;

        let success = false;
        let step: LoginStep = 'refresh';

        attachRefreshInterceptor(get().refresh);
        setAccessTokenGetter(() => useAuthStore.getState().accessToken);
        try {
          const token = await get().refresh();

          if (token) {
            step = 'me';
            await get().fetchMe();

            // Refetch all user-specific data after successful token refresh
            // This handles the case where the token was expired on app load
            // and queries failed with 401 before the token was refreshed
            // Invalidate by the 'user' prefix to catch all user queries
            queryClient.invalidateQueries({
              predicate: (query) => {
                const [key] = query.queryKey;

                return key === 'user';
              },
            });

            if (force) {
              success = true;
            }
          }
        } catch (e) {
          // Refresh failed (e.g., expired/invalid refresh). Ensure we clear session state.
          set({ user: null, accessToken: null });

          success = false;

          // Only the post-redirect sign-in is reported: an ordinary load with
          // a lapsed session fails here routinely.
          if (force) reportLoginFailure(step, e);
        }
        // Strip query params after handling redirect
        const url = new URL(window.location.href);

        if (url.search) {
          window.history.replaceState({}, '', url.origin + url.pathname);
        }

        return success;
      },
      refresh: async () => {
        try {
          if (IS_NATIVE_APP) {
            const { getRefreshToken, setRefreshToken, clearRefreshToken } =
              await nativeAuth();
            const refreshToken = await getRefreshToken();

            if (!refreshToken) throw new Error('No refresh token');

            try {
              // The bearer header replaces the access token the client would
              // otherwise attach; a rotated token comes back in the body.
              const { data } = await api.post(
                '/auth/refresh',
                {},
                { headers: { authorization: `Bearer ${refreshToken}` } },
              );

              if (data.refreshToken) await setRefreshToken(data.refreshToken);
              set({ accessToken: data.accessToken });

              return data.accessToken as string;
            } catch (e) {
              // Only a rejected token ends the session for good; offline
              // launches keep it for the next one.
              if (e instanceof ApiError && e.response.status === 401) {
                await clearRefreshToken();
              }
              throw e;
            }
          }

          // Always attempt; backend verifies cookie and returns 401 if not present
          const { data } = await api.post('/auth/refresh', {});

          set({ accessToken: data.accessToken });

          return data.accessToken as string;
        } catch (e) {
          // On refresh failure, clear session so UI reflects logged-out state
          set({ user: null, accessToken: null });
          throw e;
        }
      },
      fetchMe: async () => {
        try {
          const { data } = await api.get('/auth/me');

          set({ user: data.user });
        } catch (e) {
          // If fetching current user fails (e.g., token expired), clear session
          set({ user: null, accessToken: null });
          throw e;
        }
      },
      logout: async () => {
        if (get().isBusy) return;
        set({ isBusy: true });
        try {
          if (IS_NATIVE_APP) {
            const { getRefreshToken, clearRefreshToken, signOutOfGoogle } =
              await nativeAuth();
            const refreshToken = await getRefreshToken();

            try {
              await api.post(
                '/auth/logout',
                undefined,
                refreshToken
                  ? { headers: { authorization: `Bearer ${refreshToken}` } }
                  : undefined,
              );
            } finally {
              await clearRefreshToken();
              void signOutOfGoogle();
            }
          } else {
            await api.post('/auth/logout');
          }

          clearSignedInState();
        } finally {
          set({ isBusy: false });
        }
      },
      deleteAccount: async () => {
        if (get().isBusy) return;
        set({ isBusy: true });
        try {
          // Also ends every session on the server, so there is nothing to log out.
          await api.delete('/account');

          if (IS_NATIVE_APP) {
            const { clearRefreshToken, signOutOfGoogle } = await nativeAuth();

            await clearRefreshToken();
            void signOutOfGoogle();
          }

          clearSignedInState();
        } finally {
          set({ isBusy: false });
        }
      },
    }),
    {
      name: 'auth-store',
      partialize(state) {
        return {
          user: state.user,
          accessToken: state.accessToken,
        };
      },
    },
  ),
);

/** Drops the signed-in user's data from this device after logout or deletion. */
function clearSignedInState() {
  // Clear user data from React Query cache
  clearUserData(queryClient);

  // Clear auth state
  useAuthStore.setState({ user: null, accessToken: null });

  // Clear user-specific data from Zustand stores
  useCountriesStore.setState({ customCountries: [] });

  // Custom blocs are account-only, so drop them; the rest of the diaspora
  // settings (custom pairs, toggles, strength) stay and keep persisting
  // locally.
  useGeneralStore.getState().setDiaspora({ customGroups: [] });

  // Add more store cleanups here as needed in the future:
  // e.g., useSavedEventsStore.setState({ savedEvents: [] });
}

/**
 * Native sign-in: the provider's sheet → its token → our token pair → the
 * same post-login path the website's redirect takes.
 */
async function loginNatively(provider: AuthProvider) {
  if (useAuthStore.getState().isSigningIn) return;
  useAuthStore.setState({ isSigningIn: true });

  let success: boolean | null = null;

  try {
    const { getGoogleIdToken, getAppleCredential, setRefreshToken } =
      await nativeAuth();
    let data: { accessToken: string; refreshToken: string };

    if (provider === 'apple') {
      const credential = await getAppleCredential();

      if (!credential) return; // the user dismissed the sheet
      ({ data } = await api.post('/auth/apple/native', credential));
    } else {
      const idToken = await getGoogleIdToken();

      if (!idToken) return; // the user dismissed the account sheet
      ({ data } = await api.post('/auth/google/native', { idToken }));
    }

    await setRefreshToken(data.refreshToken);
    useAuthStore.setState({ accessToken: data.accessToken });
    success = await useAuthStore.getState().handlePostLogin(true);
  } catch (error) {
    console.error(`Native ${provider} sign-in failed`, error);
    success = false;
  } finally {
    useAuthStore.setState({ isSigningIn: false });

    if (success !== null) {
      window.dispatchEvent(
        new CustomEvent(NATIVE_LOGIN_EVENT, { detail: { success } }),
      );
    }
  }
}
