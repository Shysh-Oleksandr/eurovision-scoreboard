import { useCallback, useRef } from 'react';

import { playHaptic } from '@/native/haptics';

/** A slider with more steps than this ticks every 5% instead of every step. */
const MAX_TICKED_STEPS = 40;
const NO_DETENTS: readonly number[] = [];

/**
 * Detent ticks for a range input (native apps, docs/haptics.md): call the
 * returned function with each new value. A tick per step (per 5% on fine
 * sliders), and a firmer one at the ends and at any `detents` (the diverging
 * slider's 0).
 */
export function useSliderHaptics(
  min: number,
  max: number,
  step = 1,
  detents: readonly number[] = NO_DETENTS,
): (value: number) => void {
  const lastRef = useRef<{ bucket: number; value: number } | null>(null);

  return useCallback(
    (value: number) => {
      const range = max - min;

      if (!(range > 0) || !Number.isFinite(value)) return;

      const last = lastRef.current;

      if (last?.value === value) return;

      const stepSize = step > 0 ? step : 1;
      const bucket =
        range / stepSize > MAX_TICKED_STEPS
          ? Math.round(((value - min) / range) * 20)
          : Math.round((value - min) / stepSize);
      const isDetent = value <= min || value >= max || detents.includes(value);

      lastRef.current = { bucket, value };
      if (last && last.bucket === bucket && !isDetent) return;

      playHaptic({ id: 'sliderTick', edge: isDetent });
    },
    [min, max, step, detents],
  );
}
