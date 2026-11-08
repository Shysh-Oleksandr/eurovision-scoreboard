'use client';

import { CloudOff, WifiOff } from 'lucide-react';
import { useTranslations } from 'next-intl';
import React from 'react';

import Button from '@/components/common/Button';
import { QueryView } from '@/hooks/useQueryView';
import { useConnectivityStatus } from '@/state/connectivityStore';

type OfflineNoticeProps = {
  /** What comes back online; defaults to the generic line. */
  message?: string;
  className?: string;
};

/**
 * In place of content that needs the API while the app is offline (lists,
 * profile sections, sign-in). Says what's missing, never asks to sign in or
 * retry: the strip and the reconnect take care of that.
 */
export const OfflineNotice: React.FC<OfflineNoticeProps> = ({
  message,
  className = 'sm:py-12 py-8',
}) => {
  const t = useTranslations('offline');
  const status = useConnectivityStatus();
  const Icon = status === 'unreachable' ? CloudOff : WifiOff;

  return (
    <div
      role="status"
      className={`flex flex-col items-center gap-2 text-center ${className}`}
    >
      <Icon className="size-6 text-white/55" aria-hidden="true" />
      <p className="font-semibold text-white">
        {status === 'unreachable' ? t('unreachableTitle') : t('title')}
      </p>
      <p className="max-w-[320px] text-sm leading-snug text-white/70">
        {message ?? t('body')}
      </p>
    </div>
  );
};

type LoadErrorNoticeProps = {
  onRetry: () => void;
  className?: string;
};

/** A request that got an answer, just not the data: say so and offer a retry. */
export const LoadErrorNotice: React.FC<LoadErrorNoticeProps> = ({
  onRetry,
  className = 'sm:py-12 py-8',
}) => {
  const t = useTranslations('offline');

  return (
    <div
      role="alert"
      className={`flex flex-col items-center gap-3 text-center ${className}`}
    >
      <p className="text-white/70">{t('loadFailed')}</p>
      <Button
        variant="surface"
        size="sm"
        label={t('retry')}
        onClick={onRetry}
      />
    </div>
  );
};

type QueryNoticeProps = {
  view: Exclude<QueryView, 'ready'>;
  onRetry: () => void;
  /** Passed to `OfflineNotice`. */
  offlineMessage?: string;
  className?: string;
};

/** The loader, offline or error state for a `useQueryView` view. */
export const QueryNotice: React.FC<QueryNoticeProps> = ({
  view,
  onRetry,
  offlineMessage,
  className = 'sm:py-12 py-8',
}) => {
  if (view === 'offline') {
    return <OfflineNotice message={offlineMessage} className={className} />;
  }
  if (view === 'error') {
    return <LoadErrorNotice onRetry={onRetry} className={className} />;
  }

  return (
    <div className={`text-center ${className}`}>
      <span className="loader" />
    </div>
  );
};
