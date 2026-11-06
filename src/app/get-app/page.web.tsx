import type { Metadata } from 'next';

import { headers } from 'next/headers';
import { notFound, redirect } from 'next/navigation';
import { getTranslations } from 'next-intl/server';

import { detectDevicePlatform } from '@/components/appPromo/appPromoPolicy';
import {
  APP_STORE_URL,
  APP_STORES_LIVE,
  GET_APP_PATH,
  PLAY_STORE_URL,
} from '@/config/appStores';
import GetApp from '@/views/GetApp';

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations('appPromo.page');

  return {
    title: t('metaTitle'),
    description: t('metaDescription'),
    alternates: { canonical: GET_APP_PATH },
    openGraph: {
      title: t('metaTitle'),
      description: t('metaDescription'),
      url: `https://douzepoints.app${GET_APP_PATH}`,
    },
  };
}

/**
 * douzepoints.app/get-app, the one link to post anywhere: iPhones and iPads
 * (by user agent) go straight to the App Store, Android phones to Google
 * Play, everything else (computers, iPads asking for desktop pages, link
 * preview bots) gets both badges and a QR code back to this page. A 404
 * until the store links are live (`APP_STORES_LIVE`).
 */
export default async function GetAppPage() {
  if (!APP_STORES_LIVE) notFound();

  const platform = detectDevicePlatform(
    (await headers()).get('user-agent') ?? '',
  );

  if (platform === 'ios') redirect(APP_STORE_URL);
  if (platform === 'android') redirect(PLAY_STORE_URL);

  return <GetApp />;
}
