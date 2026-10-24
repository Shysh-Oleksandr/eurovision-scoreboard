'use client';

import { useEffect, useRef } from 'react';
import { toast } from 'react-toastify';

import { api } from '@/api/client';
import { fetchDesignById } from '@/api/designs';
import { fetchProfileById } from '@/api/profiles';
import { parseDesign } from '@/graphics/model/design';
import { useGraphicsStudioStore } from '@/graphics/state/graphicsStudioStore';
import { findShareParam, type ShareParamKey } from '@/helpers/shareUrl';
import { useCountriesStore } from '@/state/countriesStore';
import { useGeneralStore } from '@/state/generalStore';
import type { ThemeCreator } from '@/types/customTheme';

async function showSharedItem(key: ShareParamKey, value: string) {
  const general = useGeneralStore.getState();

  try {
    if (key === 'profile') {
      const { data } = await fetchProfileById(value);
      const user: ThemeCreator = {
        _id: data._id,
        username: data.username,
        name: data.name,
        country: data.country,
        avatarUrl: data.avatarUrl,
      };

      general.setSelectedProfileUser(user);

      return;
    }

    if (key === 'contest') {
      const { data } = await api.get(`/contests/${value}`);

      general.setSelectedShareContest(data);

      return;
    }

    if (key === 'theme') {
      const { data } = await api.get(`/themes/${value}`);

      general.setSelectedShareTheme(data);

      return;
    }

    // A published graphics design: open the Graphics modal on Explore with
    // the design sheet over it.
    const record = await fetchDesignById(value);
    const studio = useGraphicsStudioStore.getState();

    studio.setGraphicsModalOpen(true, 'explore');
    studio.openSheet({
      design: parseDesign(record.design),
      source: { kind: 'cloud', record },
    });
  } catch (err: any) {
    console.error('Share link error:', err);
    const message =
      err?.response?.data?.message ||
      err?.message ||
      'Failed to load shared content';

    toast.error(message);
  }
}

/**
 * Opens what a share link (`?profile=`, `?contest=`, `?theme=`, `?design=`)
 * points to, over Event Setup. Returns false for a link without a share
 * parameter. The website calls it for the URL it loaded with; the apps for
 * every universal link / App Link that opens them (`src/native/appLinks.ts`).
 */
export function openShareLink(url: URL): boolean {
  const param = findShareParam(url);

  if (!param) return false;

  useCountriesStore.getState().setEventSetupModalOpen(true);
  void showSharedItem(param.key, param.value);

  return true;
}

export function useShareLinks() {
  const hasProcessedRef = useRef(false);

  useEffect(() => {
    if (hasProcessedRef.current) return;
    hasProcessedRef.current = true;

    const url = new URL(window.location.href);

    if (openShareLink(url)) {
      window.history.replaceState({}, '', url.origin + url.pathname);
    }
  }, []);
}
