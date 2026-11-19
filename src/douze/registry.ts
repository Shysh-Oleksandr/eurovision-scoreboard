import type { DouzeAnimationSpec } from './model';
import { year2022Douze } from './specs/year2022';

import type { DouzePointsAnimationMode } from '@/theme/types';

/** Douze modes played from a spec (the rest are the hand-written variants). */
const SPECS: Partial<Record<DouzePointsAnimationMode, DouzeAnimationSpec>> = {
  year2022: year2022Douze,
};

export const getDouzeSpec = (
  mode: DouzePointsAnimationMode | undefined,
): DouzeAnimationSpec | null => (mode ? SPECS[mode] ?? null : null);

/** The animation plays where the row is, and the row climbs afterwards. */
export const doesDouzePlayBeforeMove = (
  mode: DouzePointsAnimationMode | undefined,
) => getDouzeSpec(mode)?.reorder === 'after';

/** How long the board waits after a 12 before it moves (ms). */
export const getDouzeMoveDelayMs = (
  mode: DouzePointsAnimationMode | undefined,
): number => {
  const spec = getDouzeSpec(mode);

  return spec?.reorder === 'after' ? spec.durationMs + 150 : 1000;
};
