import { useEffect, useState } from 'react';

let cached: boolean | null = null;

/**
 * Compute once per session — device capability doesn't change, and reduced-motion
 * flips rarely enough that a one-time read is fine for gating a cosmetic animation.
 */
function computeIsLowPerfDevice(): boolean {
  if (cached !== null) return cached;
  if (typeof window === 'undefined') return false;

  const prefersReducedMotion = window.matchMedia(
    '(prefers-reduced-motion: reduce)',
  ).matches;

  // GPU can't be probed cheaply, so use conservative CPU/RAM proxies — only
  // clearly low-end devices trip these thresholds. `deviceMemory` is reported in
  // coarse steps (…0.5, 1, 2, 4, 8) and is absent in Safari/Firefox.
  const nav = navigator as Navigator & { deviceMemory?: number };
  const lowMemory =
    typeof nav.deviceMemory === 'number' && nav.deviceMemory <= 2;
  const fewCores =
    typeof nav.hardwareConcurrency === 'number' && nav.hardwareConcurrency <= 2;

  cached = prefersReducedMotion || lowMemory || fewCores;

  return cached;
}

/**
 * Best-effort "skip nice-to-have animations" signal, combining the user's
 * reduced-motion preference with crude device-capability hints. Starts `false`
 * (matching SSR) and resolves after mount to avoid a hydration mismatch.
 */
export function useIsLowPerfDevice(): boolean {
  const [isLowPerf, setIsLowPerf] = useState(false);

  useEffect(() => {
    setIsLowPerf(computeIsLowPerfDevice());
  }, []);

  return isLowPerf;
}
