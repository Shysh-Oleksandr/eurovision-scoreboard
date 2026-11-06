'use client';
import { ChevronDown, QrCode, X } from 'lucide-react';
import { useTranslations } from 'next-intl';
import React, { useRef, useState } from 'react';

import {
  androidOpenAppUrl,
  type DevicePlatform,
  type HubCardVariant,
  storesFor,
} from './appPromoPolicy';
import {
  APP_BENEFIT_KEYS,
  AppBenefitList,
  GET_APP_QR_SRC,
  StoreLinkButton,
} from './StoreLinks';
import { useHubAppCard } from './useAppPromo';

import { APP_STORES_LIVE } from '@/config/appStores';
import { getLandingShareParam } from '@/helpers/shareUrl';
import { fitStepAttributes, useFitStep } from '@/hooks/useFitStep';

/**
 * One row while the text fits beside the actions at its natural width;
 * otherwise the actions move under it. See `.dp-app-promo-grid`.
 */
const CARD_STEPS = [{ layout: 'row' }, { layout: 'stack' }] as const;

type Panel = 'why' | 'qr' | null;

const toggleClassName =
  'inline-flex h-10 shrink-0 items-center gap-1.5 whitespace-nowrap rounded-xl px-3 text-[13px] font-bold text-white/80 transition-colors hover:bg-white/[0.07] hover:text-white';

const AppPromoCardBody: React.FC<{
  variant: HubCardVariant;
  platform: DevicePlatform;
  onDismiss: () => void;
}> = ({ variant, platform, onDismiss }) => {
  const t = useTranslations('appPromo');
  const ref = useRef<HTMLDivElement>(null);
  const step = useFitStep(ref, CARD_STEPS);
  const [panel, setPanel] = useState<Panel>(null);
  const isOpen = variant === 'open';
  const title = isOpen ? t('openTitle') : t('title');

  const toggle = (next: Exclude<Panel, null>) =>
    setPanel((current) => (current === next ? null : next));

  return (
    <section
      className="dp-app-promo rounded-[14px] px-3.5 py-3 2cols:px-4"
      aria-label={title}
    >
      <div
        ref={ref}
        className="dp-app-promo-grid"
        {...fitStepAttributes(CARD_STEPS[step])}
      >
        {/* The icon people will look for on their home screen. */}
        <img
          src="/img/brand/icon-192.png"
          alt=""
          className="dp-app-promo-icon size-10 rounded-[10px]"
        />
        <div className="dp-app-promo-text min-w-0">
          <p className="text-[15px] font-extrabold leading-tight tracking-[-0.01em] text-white text-balance">
            {title}
          </p>
          <p className="mt-0.5 text-[13px] font-semibold text-white/75 text-balance">
            {isOpen ? t('openBody') : t('body')}
          </p>
        </div>
        {/* Wraps when even a row of its own is too narrow (desktop at
            phone width: two stores, QR code, "Why the app?"). */}
        <div className="dp-app-promo-actions flex flex-wrap items-center gap-2">
          {isOpen ? (
            <a
              href={androidOpenAppUrl(getLandingShareParam())}
              className="dp-act inline-flex h-10 shrink-0 items-center whitespace-nowrap rounded-xl px-3.5 text-[13px] font-extrabold leading-none text-white"
            >
              {t('openApp')}
            </a>
          ) : (
            <>
              {storesFor(platform).map((store) => (
                <StoreLinkButton
                  key={store}
                  store={store}
                  newTab={platform === 'desktop'}
                />
              ))}
              {platform === 'desktop' && (
                <button
                  type="button"
                  className={toggleClassName}
                  aria-expanded={panel === 'qr'}
                  onClick={() => toggle('qr')}
                >
                  <QrCode className="size-4" aria-hidden />
                  {t('qrCode')}
                </button>
              )}
              <button
                type="button"
                className={toggleClassName}
                aria-expanded={panel === 'why'}
                onClick={() => toggle('why')}
              >
                {t('why')}
                <ChevronDown
                  className={`size-4 transition-transform ${
                    panel === 'why' ? 'rotate-180' : ''
                  }`}
                  aria-hidden
                />
              </button>
            </>
          )}
        </div>
        <button
          type="button"
          className="dp-app-promo-close grid size-9 place-items-center rounded-[10px] text-white/60 transition-colors hover:bg-white/[0.08] hover:text-white"
          aria-label={t('dismiss')}
          title={t('dismiss')}
          onClick={onDismiss}
        >
          <X className="size-[18px]" aria-hidden />
        </button>
      </div>

      {panel === 'why' && (
        <AppBenefitList
          items={APP_BENEFIT_KEYS.map((key) => t(`benefits.${key}`))}
          className="mt-3"
        />
      )}
      {panel === 'qr' && (
        <div className="mt-3 flex items-center gap-3.5">
          <img
            src={GET_APP_QR_SRC}
            alt="douzepoints.app/get-app"
            className="size-[112px] shrink-0 rounded-[10px] bg-white"
          />
          <p className="text-[13px] font-semibold text-white/75 text-balance">
            {t('qrHint')}
          </p>
        </div>
      )}
    </section>
  );
};

/**
 * The setup hub's app announcement (appPromoPolicy.ts decides when): the
 * store for this device (both on desktop, plus a QR code), the reasons on
 * request, and "Not now". Android phones with the app installed get "Open the
 * app" instead.
 */
const AppPromoCard = () => {
  const { variant, platform, dismiss } = useHubAppCard();

  if (!APP_STORES_LIVE || !variant) return null;

  return (
    <AppPromoCardBody
      variant={variant}
      platform={platform}
      onDismiss={dismiss}
    />
  );
};

export default AppPromoCard;
