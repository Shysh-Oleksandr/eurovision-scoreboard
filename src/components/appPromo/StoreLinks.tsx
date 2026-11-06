import { ArrowUpRight } from 'lucide-react';
import React from 'react';

import {
  APP_STORE_URL,
  type AppStore,
  PLAY_STORE_URL,
  storeBadgeSrc,
} from '@/config/appStores';

export const STORE_URLS: Record<AppStore, string> = {
  'app-store': APP_STORE_URL,
  'google-play': PLAY_STORE_URL,
};

/** Proper names: the same in every language. */
export const STORE_NAMES: Record<AppStore, string> = {
  'app-store': 'App Store',
  'google-play': 'Google Play',
};

const newTabProps = (newTab: boolean) =>
  newTab ? { target: '_blank', rel: 'noopener noreferrer' } : {};

/**
 * A store link styled as the app's surface button, for the app's own screens
 * (setup hub, Settings). Pages outside the app use the official badges
 * (`StoreBadges`). Phones follow the link in place (the store app opens);
 * desktops get a new tab.
 */
export const StoreLinkButton: React.FC<{
  store: AppStore;
  newTab: boolean;
}> = ({ store, newTab }) => (
  <a
    href={STORE_URLS[store]}
    {...newTabProps(newTab)}
    className="dp-act inline-flex h-10 shrink-0 items-center gap-1.5 whitespace-nowrap rounded-xl px-3.5 text-[13px] font-extrabold leading-none text-white"
  >
    {STORE_NAMES[store]}
    <ArrowUpRight className="size-4 text-white/60" aria-hidden />
  </a>
);

/**
 * Apple's and Google's official badges in the page's language. They keep
 * their own black artwork (the one exception to the theme-only colours: the
 * stores' guidelines don't allow changing them).
 */
export const StoreBadges: React.FC<{
  locale: string;
  stores?: AppStore[];
  newTab?: boolean;
  className?: string;
}> = ({
  locale,
  stores = ['app-store', 'google-play'],
  newTab = false,
  className = '',
}) => (
  <div className={`flex flex-wrap items-center gap-3 ${className}`}>
    {stores.map((store) => (
      <a
        key={store}
        href={STORE_URLS[store]}
        {...newTabProps(newTab)}
        className="block rounded-[9px] transition-transform active:scale-[0.985]"
      >
        <img
          src={storeBadgeSrc(store, locale)}
          alt={STORE_NAMES[store]}
          className="block h-11 w-auto"
        />
      </a>
    ))}
  </div>
);

/**
 * Short reasons to install, as translation keys under `appPromo.benefits`;
 * `next` is what's coming to the apps (offline mode).
 */
export const APP_BENEFIT_KEYS = [
  'fullScreen',
  'haptics',
  'images',
  'next',
] as const;

export const AppBenefitList: React.FC<{
  items: string[];
  className?: string;
}> = ({ items, className = '' }) => (
  <ul
    className={`list-disc space-y-1 pl-4 text-[13px] font-semibold leading-snug text-white/80 marker:text-white/40 ${className}`}
  >
    {items.map((item) => (
      <li key={item}>{item}</li>
    ))}
  </ul>
);

export const GET_APP_QR_SRC = '/img/get-app-qr.svg';
