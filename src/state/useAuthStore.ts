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
import type { Profile } from '@/types/profile';

export interface AuthState {
  user: Profile | null;
  accessToken: string | null;
  isBusy: boolean;
  login: () => void;
  handlePostLogin: (force?: boolean) => Promise<boolean>;
  refresh: () => Promise<string | undefined>;
  fetchMe: () => Promise<void>;
  logout: () => Promise<void>;
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
      login: () => {
        window.location.href = `${API_BASE_URL}/auth/google`;
      },
      handlePostLogin: async (force?: boolean) => {
        if (!get().user && !force) return false;

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
        // Always attempt; backend verifies cookie and returns 401 if not present
        try {
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
          await api.post('/auth/logout');

          // Clear user data from React Query cache
          clearUserData(queryClient);

          // Clear auth state
          set({ user: null, accessToken: null });

          // Clear user-specific data from Zustand stores
          useCountriesStore.setState({ customCountries: [] });

          // Custom blocs are account-only, so drop them; the rest of the
          // diaspora settings (custom pairs, toggles, strength) stay and keep
          // persisting locally.
          useGeneralStore.getState().setDiaspora({ customGroups: [] });

          // Add more store cleanups here as needed in the future:
          // e.g., useSavedEventsStore.setState({ savedEvents: [] });
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
