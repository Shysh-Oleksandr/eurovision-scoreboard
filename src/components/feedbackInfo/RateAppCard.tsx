import { useTranslations } from 'next-intl';
import React from 'react';

import { StoreLinkButton } from '@/components/appPromo/StoreLinks';
import { type AppStore, STORE_REVIEW_URLS } from '@/config/appStores';
import { nativePlatform } from '@/native/platform';

/** This app's store; both in `yarn dev:native` in a desktop browser. */
const storesForThisApp = (): AppStore[] => {
  const platform = nativePlatform();

  if (platform === 'ios') return ['app-store'];
  if (platform === 'android') return ['google-play'];

  return ['app-store', 'google-play'];
};

/**
 * Feedback → a link to the store's review form, in the apps (where the
 * website has the donation card). Always there, unlike the system's rating
 * prompt (src/native/review), which the stores throttle. A plain link with
 * no question before it, as both stores require.
 */
const RateAppCard: React.FC = () => {
  const t = useTranslations('feedbackInfo');

  return (
    <div className="border border-white/10 border-solid rounded-xl bg-primary-800/60 pt-[18px] px-5 pb-5">
      <p className="font-bold mb-[11px]">{t('rateCardTitle')}</p>
      <p className="text-white/70 text-base leading-[1.70] mb-[17px]">
        {t('rateCardText')}
      </p>
      <div className="flex flex-wrap gap-2">
        {storesForThisApp().map((store) => (
          <StoreLinkButton
            key={store}
            store={store}
            href={STORE_REVIEW_URLS[store]}
            newTab
          />
        ))}
      </div>
    </div>
  );
};

export default RateAppCard;
