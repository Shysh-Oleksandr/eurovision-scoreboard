'use client';

import { useTranslations } from 'next-intl';

import { JUNIOR_SUPPORTED_YEARS, SUPPORTED_YEARS } from '@/data/data';

/** First and last year of a list, as strings (numbers would get grouped: "2,004"). */
const yearRange = (years: readonly number[]) => [
  String(years[0]),
  String(years[years.length - 1]),
];

/**
 * The home page's text before the app mounts. `Main` is client-only, so the
 * document had none at all: crawlers that don't run JavaScript (the AI
 * answer engines') saw an empty page. People only see this on a slow load:
 * it fades in after a short delay (`.dp-home-intro`), and the app replaces
 * it once it mounts. Website only.
 */
const HomeIntro = () => {
  const t = useTranslations('Metadata');
  const [escFrom, escTo] = yearRange(SUPPORTED_YEARS);
  const [jescFrom, jescTo] = yearRange(JUNIOR_SUPPORTED_YEARS);

  return (
    <main className="dp-home-intro fixed inset-0 flex items-center justify-center px-4 text-white">
      <div className="max-w-[460px] text-center">
        <img
          src="/img/brand/icon-192.png"
          alt=""
          width={64}
          height={64}
          className="mx-auto size-16 rounded-[16px]"
        />
        <h1 className="mt-4 text-[24px] font-extrabold leading-tight tracking-[-0.022em]">
          DouzePoints
        </h1>
        <p className="mt-2 text-[13px] font-semibold text-white/80 text-balance">
          {t('intro', { escFrom, escTo, jescFrom, jescTo })}
        </p>
        <p className="mt-3 text-[12px] font-semibold text-white/75 text-balance">
          {t('notAffiliated')}
        </p>
      </div>
    </main>
  );
};

export default HomeIntro;
