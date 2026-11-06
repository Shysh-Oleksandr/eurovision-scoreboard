'use client';

import { useTranslations } from 'next-intl';
import { type ReactNode, useEffect, useSyncExternalStore } from 'react';
import { toast } from 'react-toastify';

import Button from '@/components/common/Button';
import { useBackHandler } from '@/hooks/useBackHandler';
import {
  type BundleNotice,
  dismissBundlePrompt,
  dismissStoreRecommendation,
  getLiveUpdateNotices,
  openStoreListing,
  restartIntoUpdate,
  retryRequiredUpdate,
  type StoreNotice,
  subscribeLiveUpdateNotices,
} from '@/native/liveUpdate';
import { nativePlatform } from '@/native/platform';

const PROMPT_TOAST_ID = 'live-update-prompt';
const STORE_TOAST_ID = 'live-update-store';

/**
 * What live updates ask of the user (src/native/liveUpdate.ts,
 * docs/native-apps.md §11), most urgent first:
 * - the store gate requires a newer binary: a blocking screen with a link
 *   to the store;
 * - a required bundle: a blocking screen while it downloads and restarts;
 * - a prompt bundle has downloaded: a "restart to update" toast;
 * - the store gate recommends a newer binary: a dismissable toast.
 * Native apps only; app-bootstrap.tsx mounts it lazily.
 */
export default function LiveUpdateNotices() {
  const t = useTranslations('liveUpdate');
  const { bundle, store } = useSyncExternalStore(
    subscribeLiveUpdateNotices,
    getLiveUpdateNotices,
    getLiveUpdateNotices,
  );
  const storeName = nativePlatform() === 'ios' ? 'App Store' : 'Google Play';

  const blockingStore = store?.level === 'required' ? store : null;
  const blockingBundle =
    !blockingStore && bundle?.level === 'required' ? bundle : null;
  const blocked = Boolean(blockingStore || blockingBundle);
  const prompt = !blocked && bundle?.level === 'prompt' ? bundle : null;
  const recommendation =
    !blocked && !prompt && store?.level === 'recommended' && store.url
      ? store
      : null;

  const promptVersion = prompt?.version;

  useEffect(() => {
    if (!promptVersion) {
      toast.dismiss(PROMPT_TOAST_ID);

      return;
    }

    if (toast.isActive(PROMPT_TOAST_ID)) return;

    toast(
      <UpdateToast
        message={t('readyMessage')}
        action={t('restart')}
        later={t('later')}
        onAction={() => {
          toast.dismiss(PROMPT_TOAST_ID);
          void restartIntoUpdate();
        }}
        onLater={() => toast.dismiss(PROMPT_TOAST_ID)}
      />,
      {
        toastId: PROMPT_TOAST_ID,
        autoClose: false,
        closeOnClick: false,
        // "Later", a swipe away and a superseding notice all close it; the
        // bundle then switches on the next launch.
        onClose: dismissBundlePrompt,
      },
    );
  }, [promptVersion, t]);

  const recommendedUrl = recommendation?.url;
  const recommendedVersion = recommendation?.version;

  useEffect(() => {
    if (!recommendedUrl || !recommendedVersion) {
      toast.dismiss(STORE_TOAST_ID);

      return;
    }

    if (toast.isActive(STORE_TOAST_ID)) return;

    toast(
      <UpdateToast
        message={t('storeRecommendedMessage')}
        action={t('update')}
        later={t('later')}
        onAction={() => openStoreListing(recommendedUrl)}
        onLater={() => {
          dismissStoreRecommendation();
          toast.dismiss(STORE_TOAST_ID);
        }}
      />,
      { toastId: STORE_TOAST_ID, autoClose: false, closeOnClick: false },
    );
  }, [recommendedUrl, recommendedVersion, storeName, t]);

  if (blockingStore) {
    return <StoreRequiredScreen notice={blockingStore} storeName={storeName} />;
  }

  if (blockingBundle) return <BundleRequiredScreen notice={blockingBundle} />;

  return null;
}

function UpdateToast({
  message,
  action,
  later,
  onAction,
  onLater,
}: {
  message: string;
  action: string;
  later: string;
  onAction: () => void;
  onLater: () => void;
}) {
  return (
    <div className="flex flex-col gap-2.5">
      <p className="text-[13px] font-semibold leading-5 text-balance">
        {message}
      </p>
      <div className="flex gap-2">
        <Button size="sm" variant="cta" label={action} onClick={onAction} />
        <Button size="sm" variant="surface" label={later} onClick={onLater} />
      </div>
    </div>
  );
}

function BlockingScreen({
  title,
  body,
  children,
}: {
  title: string;
  body: string;
  children?: ReactNode;
}) {
  // Android back must not reach the app underneath.
  useBackHandler(true, () => undefined);

  return (
    <div
      role="alertdialog"
      aria-modal="true"
      aria-labelledby="live-update-title"
      aria-describedby="live-update-body"
      className="fixed inset-0 z-[2000] flex items-center justify-center bg-[var(--p-950)] pt-[var(--safe-top)] pb-[var(--safe-bottom)] pl-[calc(var(--safe-left)+16px)] pr-[calc(var(--safe-right)+16px)]"
    >
      <div className="flex w-full max-w-[360px] flex-col gap-3.5 text-center">
        <h2
          id="live-update-title"
          className="text-[20px] font-extrabold tracking-[-0.024em] text-white text-balance"
        >
          {title}
        </h2>
        <p
          id="live-update-body"
          className="text-[13px] font-semibold leading-5 text-white/80 text-balance"
        >
          {body}
        </p>
        {children}
      </div>
    </div>
  );
}

function BundleRequiredScreen({
  notice,
}: {
  notice: Extract<BundleNotice, { level: 'required' }>;
}) {
  const t = useTranslations('liveUpdate');

  if (notice.phase === 'failed') {
    return (
      <BlockingScreen title={t('requiredTitle')} body={t('requiredFailedBody')}>
        <Button
          size="xl"
          variant="cta"
          className="mt-1.5 w-full"
          label={t('tryAgain')}
          onClick={retryRequiredUpdate}
        />
      </BlockingScreen>
    );
  }

  const percent =
    notice.phase === 'restarting'
      ? 100
      : Math.max(0, Math.min(100, notice.percent));

  return (
    <BlockingScreen
      title={t('requiredTitle')}
      body={
        notice.phase === 'restarting' ? t('restartingBody') : t('requiredBody')
      }
    >
      <div
        role="progressbar"
        aria-valuemin={0}
        aria-valuemax={100}
        aria-valuenow={Math.round(percent)}
        aria-label={t('progressLabel')}
        className="mt-1.5 h-1.5 overflow-hidden rounded-full bg-white/10"
      >
        <div
          className="h-full rounded-full bg-[var(--accent)] transition-[width] duration-300"
          style={{ width: `${percent}%` }}
        />
      </div>
    </BlockingScreen>
  );
}

function StoreRequiredScreen({
  notice,
  storeName,
}: {
  notice: StoreNotice;
  storeName: string;
}) {
  const t = useTranslations('liveUpdate');
  const { url } = notice;

  return (
    <BlockingScreen
      title={t('storeRequiredTitle')}
      body={t('storeRequiredBody')}
    >
      {url && (
        <Button
          size="xl"
          variant="cta"
          className="mt-1.5 w-full"
          label={t('openStore', { store: storeName })}
          onClick={() => openStoreListing(url)}
        />
      )}
    </BlockingScreen>
  );
}
