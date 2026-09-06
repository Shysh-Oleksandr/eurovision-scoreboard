'use client';

import { useCallback, useEffect, useRef, useState } from 'react';

import { useReportWebVitals } from 'next/web-vitals';

type UmamiWindow = Window & {
  umami?: {
    track: (event: string, data?: Record<string, string | number>) => void;
  };
};

/** Core Web Vitals plus the two load timings worth correlating them against. */
const TRACKED = ['LCP', 'INP', 'CLS', 'FCP', 'TTFB'] as const;

type TrackedName = (typeof TRACKED)[number];

/**
 * Structural stand-in for web-vitals' `Metric`: Next re-exports the type from
 * a compiled path that does not resolve under our tsconfig, so the callback
 * argument would otherwise be `any`.
 */
type WebVitalMetric = { name: string; value: number; rating: string };

const isTracked = (name: string): name is TrackedName =>
  (TRACKED as readonly string[]).includes(name);

/**
 * Reports field Core Web Vitals to Umami as a single `web-vitals` event.
 *
 * All of our performance numbers so far come from 4x-throttled emulation; this
 * is the only thing that says whether any of it matters on the devices people
 * actually use.
 *
 * Values are buffered and sent once, when the page is first hidden: CLS and
 * INP keep changing for as long as the page is open, so sending on every
 * update would both spam Umami and report values that are not final. The
 * trade-off is that a session which never backgrounds the tab and is killed
 * outright reports nothing.
 *
 * The flush listeners are attached only once FCP has been reported, not on
 * mount, and that ordering is load-bearing. `visibilitychange` listeners run
 * in registration order, and web-vitals finalises CLS from its own
 * `visibilitychange` handler — but `onCLS` defers registering that handler
 * until FCP fires, while `onLCP`/`onINP` register theirs synchronously. A
 * listener attached on mount therefore flushes *before* CLS is ever recorded
 * (and, because the flush is one-shot, records no CLS at all, ever), while
 * still catching LCP and INP. That is exactly what the first Umami sample
 * showed: `cls`/`cls_rating` empty in 118/118 sessions, `inp` present in 60%.
 * Waiting for FCP specifically — not merely for the first metric, since TTFB
 * can land earlier — puts us behind all three handlers.
 */
export const WebVitals = () => {
  const latest = useRef<Partial<Record<TrackedName, number>>>({});
  const ratings = useRef<Partial<Record<TrackedName, string>>>({});
  const sent = useRef(false);
  const [fcpReported, setFcpReported] = useState(false);

  useReportWebVitals(
    // Stable identity: `useReportWebVitals` re-runs its effect whenever the
    // callback changes, and each run registers a fresh set of observers.
    useCallback((metric: WebVitalMetric) => {
      if (!isTracked(metric.name)) return;

      latest.current[metric.name] = metric.value;
      ratings.current[metric.name] = metric.rating;

      // See the note above: CLS's own hidden-handler is registered from
      // within web-vitals' FCP callback, which runs before this one.
      if (metric.name === 'FCP') setFcpReported(true);
    }, []),
  );

  useEffect(() => {
    if (!fcpReported) return;

    const flush = () => {
      if (sent.current) return;

      const { umami } = window as UmamiWindow;

      if (!umami) return;

      const { LCP, INP, CLS, FCP, TTFB } = latest.current;

      // Nothing worth sending yet (the page was hidden before it painted).
      if (LCP === undefined && FCP === undefined) return;

      sent.current = true;

      const round = (value: number | undefined) =>
        value === undefined ? undefined : Math.round(value);

      const data: Record<string, string | number> = {};
      const put = (key: string, value: string | number | undefined) => {
        if (value !== undefined) data[key] = value;
      };

      put('lcp', round(LCP));
      put('lcp_rating', ratings.current.LCP);
      put('inp', round(INP));
      put('inp_rating', ratings.current.INP);
      put('cls', CLS === undefined ? undefined : Number(CLS.toFixed(3)));
      put('cls_rating', ratings.current.CLS);
      put('fcp', round(FCP));
      put('ttfb', round(TTFB));

      umami.track('web-vitals', data);
    };

    const onVisibilityChange = () => {
      if (document.visibilityState === 'hidden') flush();
    };

    document.addEventListener('visibilitychange', onVisibilityChange);
    // Safari does not reliably fire visibilitychange on tab close.
    window.addEventListener('pagehide', flush);

    return () => {
      document.removeEventListener('visibilitychange', onVisibilityChange);
      window.removeEventListener('pagehide', flush);
    };
  }, [fcpReported]);

  return null;
};
