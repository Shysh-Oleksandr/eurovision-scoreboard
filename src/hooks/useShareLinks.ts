'use client';

import { useEffect, useRef } from 'react';
import { toast } from 'react-toastify';

import { api } from '@/api/client';
import { fetchProfileById } from '@/api/profiles';
import { useCountriesStore } from '@/state/countriesStore';
import { useGeneralStore } from '@/state/generalStore';
import type { ThemeCreator } from '@/types/customTheme';

const SHARE_PARAM_KEYS = ['profile', 'contest', 'theme'] as const;

export function useShareLinks() {
  const setEventSetupModalOpen = useCountriesStore(
    (state) => state.setEventSetupModalOpen,
  );
  const setSelectedProfileUser = useGeneralStore(
    (state) => state.setSelectedProfileUser,
  );
  const setSelectedShareTheme = useGeneralStore(
    (state) => state.setSelectedShareTheme,
  );
  const setSelectedShareContest = useGeneralStore(
    (state) => state.setSelectedShareContest,
  );
  const hasProcessedRef = useRef(false);

  useEffect(() => {
    if (typeof window === 'undefined' || hasProcessedRef.current) return;

    const url = new URL(window.location.href);
    let paramType: (typeof SHARE_PARAM_KEYS)[number] | null = null;
    let paramValue: string | null = null;

    for (const key of SHARE_PARAM_KEYS) {
      const value = url.searchParams.get(key);
      if (value) {
        paramType = key;
        paramValue = value;
        break;
      }
    }

    if (!paramType || !paramValue) return;

    hasProcessedRef.current = true;
    setEventSetupModalOpen(true);

    const run = async () => {
      try {
        if (['profile', 'contest', 'theme'].includes(paramType)) {
          window.history.replaceState({}, '', url.origin + url.pathname);
        }

        if (paramType === 'profile') {
          const { data } = await fetchProfileById(paramValue);
          const user: ThemeCreator = {
            _id: data._id,
            username: data.username,
            name: data.name,
            country: data.country,
            avatarUrl: data.avatarUrl,
          };
          setSelectedProfileUser(user);
          return;
        }

        if (paramType === 'contest') {
          const { data } = await api.get(`/contests/${paramValue}`);
          setSelectedShareContest(data);
          return;
        }

        if (paramType === 'theme') {
          const { data } = await api.get(`/themes/${paramValue}`);
          setSelectedShareTheme(data);
        }
      } catch (err: any) {
        console.error('Share link error:', err);
        const message =
          err?.response?.data?.message ||
          err?.message ||
          'Failed to load shared content';
        toast.error(message);
      }
    };

    run();
  }, [
    setEventSetupModalOpen,
    setSelectedProfileUser,
    setSelectedShareTheme,
    setSelectedShareContest,
  ]);
}
