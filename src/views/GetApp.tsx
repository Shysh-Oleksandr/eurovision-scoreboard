import { getLocale, getTranslations } from 'next-intl/server';

import {
  APP_BENEFIT_KEYS,
  AppBenefitList,
  GET_APP_QR_SRC,
  StoreBadges,
} from '@/components/appPromo/StoreLinks';

/**
 * /get-app on a computer: the official badges, a QR code for the phone in
 * the visitor's hand, and what the app adds. Phones never see it (the route
 * sends them to their store).
 */
const GetApp = async () => {
  const locale = await getLocale();
  const t = await getTranslations('appPromo');

  return (
    <div className="h-full overflow-y-auto bg-p-950 text-white safe-area-padding">
      <main className="mx-auto max-w-[560px] px-4 py-10 sm:py-16">
        <div className="rounded-2xl border border-hair bg-p-900 p-5 sm:p-7">
          <img
            src="/img/brand/icon-192.png"
            alt=""
            className="size-16 rounded-[16px]"
          />
          <h1 className="mt-4 text-[24px] font-extrabold leading-tight tracking-[-0.022em] text-balance">
            {t('page.title')}
          </h1>
          <p className="mt-2 text-[14px] font-semibold text-white/75 text-balance">
            {t('page.intro')}
          </p>

          <StoreBadges locale={locale} className="mt-5" />

          <div className="mt-6 flex items-center gap-4 rounded-[14px] border border-hair bg-white/[0.06] p-3.5">
            <img
              src={GET_APP_QR_SRC}
              alt="douzepoints.app/get-app"
              className="size-[104px] shrink-0 rounded-[10px] bg-white"
            />
            <p className="text-[13px] font-semibold text-white/75 text-balance">
              {t('page.qrHint')}
            </p>
          </div>

          <h2 className="mt-6 text-[15px] font-extrabold tracking-[-0.01em]">
            {t('page.benefitsTitle')}
          </h2>
          <AppBenefitList
            items={APP_BENEFIT_KEYS.map((key) => t(`benefits.${key}`))}
            className="mt-2"
          />

          <a
            href="/"
            className="dp-act mt-7 inline-flex h-10 items-center rounded-xl px-3.5 text-[13px] font-extrabold leading-none text-white"
          >
            {t('page.back')}
          </a>
        </div>
      </main>
    </div>
  );
};

export default GetApp;
