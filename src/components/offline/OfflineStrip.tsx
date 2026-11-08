'use client';

import { useTranslations } from 'next-intl';
import React, { useEffect, useLayoutEffect, useRef, useState } from 'react';

import { fitStepAttributes, useFitStep } from '@/hooks/useFitStep';
import { useConnectivityStatus } from '@/state/connectivityStore';

/** Keep in sync with `.dp-offline-strip-row` in styles.css. */
const STRIP_HEIGHT_PX = 28;
/** How long "Back online" stays before the strip collapses. */
const BACK_ONLINE_MS = 2000;
/** The `--offline-strip-h` transition in styles.css. */
const COLLAPSE_MS = 200;

/** The full sentence while it fits on one line, else the short form. */
const TEXT_STEPS = [{ text: 'full' }, { text: 'short' }] as const;

type StripState = 'offline' | 'unreachable' | 'back';

const StripBody: React.FC<{ state: StripState }> = ({ state }) => {
  const t = useTranslations('offline');
  const rowRef = useRef<HTMLDivElement>(null);
  const step = useFitStep(rowRef, TEXT_STEPS);

  const [full, short] =
    state === 'back'
      ? [t('backOnline'), t('backOnline')]
      : state === 'unreachable'
      ? [t('stripUnreachable'), t('stripUnreachableShort')]
      : [t('strip'), t('stripShort')];

  return (
    <div
      ref={rowRef}
      className="dp-offline-strip-row"
      {...fitStepAttributes(TEXT_STEPS[step])}
    >
      <span className="dp-offline-strip-dot" aria-hidden="true" />
      <span className="dp-offline-strip-full">{full}</span>
      <span className="dp-offline-strip-short">{short}</span>
    </div>
  );
};

/**
 * The slim line over the status bar while the app can't reach the API (see
 * docs/offline-mode.md). Everything else keeps working, so it informs and
 * never blocks. Its height goes into `--offline-strip-h`, which full-page
 * surfaces, full-screen modals and the graphics editor add to their top
 * padding. On reconnect it says "Back online", then collapses.
 */
const OfflineStrip: React.FC = () => {
  const status = useConnectivityStatus();
  const [backOnline, setBackOnline] = useState(false);
  const wasOffline = useRef(false);

  useEffect(() => {
    if (status !== 'online') {
      wasOffline.current = true;
      setBackOnline(false);

      return undefined;
    }
    if (!wasOffline.current) return undefined;

    wasOffline.current = false;
    setBackOnline(true);
    const timer = window.setTimeout(() => setBackOnline(false), BACK_ONLINE_MS);

    return () => window.clearTimeout(timer);
  }, [status]);

  const state: StripState | null =
    status === 'online' ? (backOnline ? 'back' : null) : status;

  // The last state stays rendered while the strip collapses.
  const [shown, setShown] = useState<StripState | null>(null);

  useEffect(() => {
    if (state) {
      setShown(state);

      return undefined;
    }
    const timer = window.setTimeout(() => setShown(null), COLLAPSE_MS);

    return () => window.clearTimeout(timer);
  }, [state]);

  useLayoutEffect(() => {
    document.documentElement.style.setProperty(
      '--offline-strip-h',
      state ? `${STRIP_HEIGHT_PX}px` : '0px',
    );
  }, [state]);

  const rendered = state ?? shown;

  if (!rendered) return null;

  return (
    <div
      className="dp-offline-strip"
      data-state={rendered}
      role="status"
      aria-live="polite"
    >
      <StripBody state={rendered} />
    </div>
  );
};

export default OfflineStrip;
