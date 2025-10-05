import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import {
  api,
  setAccessTokenGetter,
  attachRefreshInterceptor,
} from '@/api/client';
import type { Profile } from '@/types/profile';

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
        const apiBase =
          (import.meta as any).env?.VITE_API_URL || 'http://localhost:8001';
        window.location.href = `${apiBase}/auth/google`;
      },
      handlePostLogin: async (force?: boolean) => {
        if (!get().user && !force) return;

        attachRefreshInterceptor(get().refresh);
        setAccessTokenGetter(() => useAuthStore.getState().accessToken);
        try {
          const token = await get().refresh();
          if (token) {
            await get().fetchMe();
          }
        } catch (e) {
          // Refresh failed (e.g., expired/invalid refresh). Ensure we clear session state.
          set({ user: null, accessToken: null });
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
          set({ user: null, accessToken: null });
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
