'use client';
import { useTranslations } from 'next-intl';
import React from 'react';

import { storesFor } from './appPromoPolicy';
import { STORE_URLS } from './StoreLinks';
import { useAppReminder } from './useAppPromo';

import { APP_STORES_LIVE } from '@/config/appStores';

const Reminder: React.FC<{ style?: React.CSSProperties }> = ({ style }) => {
  const t = useTranslations('appPromo');
  const { visible, platform } = useAppReminder();

  if (!visible) return null;

  const [store] = storesFor(platform);

  return (
    <p
      className="mt-4 text-[13px] font-semibold leading-snug text-white/70 text-balance"
      style={style}
    >
      {t('reminder')}{' '}
      <a
        href={STORE_URLS[store]}
        className="font-extrabold text-white underline underline-offset-2"
      >
        {t('reminderAction')}
      </a>
    </p>
  );
};

/**
 * One line under the winner on a phone: the show just ended, so it's the
 * moment to mention watching the next one full screen in the app (at most
 * twice, a month apart; see appPromoPolicy.ts). Mount it with the winner
 * card: it decides once, on mount.
 */
const AppPromoReminder: React.FC<{ style?: React.CSSProperties }> = ({
  style,
}) => (APP_STORES_LIVE ? <Reminder style={style} /> : null);

export default AppPromoReminder;
