import { create } from 'zustand';
import { persist } from 'zustand/middleware';

import {
  api,
  setAccessTokenGetter,
  attachRefreshInterceptor,
} from '@/api/client';
import { clearUserData } from '@/api/clearUserData';
import { queryClient } from '@/api/queryClient';
import { API_BASE_URL } from '@/config';
import type { Profile } from '@/types/profile';
import { toast } from 'react-toastify';

import { useCountriesStore } from './countriesStore';

export interface AuthState {
  user: Profile | null;
  accessToken: string | null;
  isBusy: boolean;
  login: () => void;
  handlePostLogin: (force?: boolean) => Promise<void>;
  refresh: () => Promise<string | undefined>;
  fetchMe: () => Promise<void>;
  logout: () => Promise<void>;
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
        if (!get().user && !force) return;

        attachRefreshInterceptor(get().refresh);
        setAccessTokenGetter(() => useAuthStore.getState().accessToken);
        try {
          const token = await get().refresh();
          if (token) {
            await get().fetchMe();

            // Refetch all user-specific data after successful token refresh
            // This handles the case where the token was expired on app load
            // and queries failed with 401 before the token was refreshed
            // Invalidate by the 'user' prefix to catch all user queries
            queryClient.invalidateQueries({
              predicate: (query) => {
                const key = query.queryKey[0];
                return key === 'user';
              },
            });

            if (force) {
              toast('Logged in successfully', {
                type: 'success',
              });
            }
          }
        } catch (e) {
          // Refresh failed (e.g., expired/invalid refresh). Ensure we clear session state.
          set({ user: null, accessToken: null });
          toast('Failed to login', {
            type: 'error',
          });
        }
        // Strip query params after handling redirect
        const url = new URL(window.location.href);
        if (url.search) {
          window.history.replaceState({}, '', url.origin + url.pathname);
        }
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
