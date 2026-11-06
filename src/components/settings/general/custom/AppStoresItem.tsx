'use client';
import { useTranslations } from 'next-intl';
import React from 'react';

import { Highlight } from '../rows/Highlight';

import { StoreLinkButton } from '@/components/appPromo/StoreLinks';
import { useDevicePlatform } from '@/components/appPromo/useAppPromo';

/**
 * Look & feel → the store links, for good: where to find the apps after the
 * setup hub's announcement is gone. Website only (`APP_STORES_LIVE`).
 */
export const AppStoresItem: React.FC<{ query?: string }> = ({ query }) => {
  const t = useTranslations('appPromo');
  const newTab = useDevicePlatform() === 'desktop';

  return (
    <div className="flex flex-col gap-3 rounded-[10px] px-3 py-[11px] sm:flex-row sm:items-center sm:gap-4">
      <div className="min-w-0 flex-1">
        <div className="text-[14.5px] font-semibold text-white">
          <Highlight text={t('settingsLabel')} query={query} />
        </div>
        <p className="mt-0.5 text-[12.5px] text-white/50">
          <Highlight text={t('settingsDesc')} query={query} />
        </p>
      </div>
      <div className="flex shrink-0 gap-2">
        <StoreLinkButton store="app-store" newTab={newTab} />
        <StoreLinkButton store="google-play" newTab={newTab} />
      </div>
    </div>
  );
};
