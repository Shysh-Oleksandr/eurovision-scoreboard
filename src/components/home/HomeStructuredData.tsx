import { getTranslations } from 'next-intl/server';

import {
  APP_STORE_URL,
  APP_STORES_LIVE,
  PLAY_STORE_URL,
} from '@/config/appStores';
import { OG_IMAGE_URL, SITE_NAME, SITE_URL } from '@/config/seo';

/**
 * schema.org JSON-LD for the home page: what DouzePoints is, for search and
 * AI answer engines. Website only. No ratings: the stores' aren't ours to
 * copy here.
 */
const HomeStructuredData = async () => {
  const t = await getTranslations('Metadata');
  const description = t('description');
  const home = `${SITE_URL}/`;

  const data = {
    '@context': 'https://schema.org',
    '@graph': [
      {
        '@type': 'WebSite',
        '@id': `${home}#website`,
        url: home,
        name: SITE_NAME,
        description,
      },
      {
        '@type': 'WebApplication',
        '@id': `${home}#app`,
        url: home,
        name: SITE_NAME,
        description,
        image: OG_IMAGE_URL,
        isPartOf: { '@id': `${home}#website` },
        applicationCategory: 'EntertainmentApplication',
        operatingSystem: APP_STORES_LIVE ? 'Web, iOS, Android' : 'Web',
        browserRequirements: 'Requires JavaScript',
        isAccessibleForFree: true,
        offers: { '@type': 'Offer', price: '0', priceCurrency: 'EUR' },
        ...(APP_STORES_LIVE && { sameAs: [APP_STORE_URL, PLAY_STORE_URL] }),
      },
    ],
  };

  return (
    <script
      type="application/ld+json"
      // `<` escaped so no string in it can close the script tag.
      dangerouslySetInnerHTML={{
        __html: JSON.stringify(data).replace(/</g, '\\u003c'),
      }}
    />
  );
};

export default HomeStructuredData;
