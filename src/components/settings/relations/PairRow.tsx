import React from 'react';

import { DirectedPairLabel } from './DirectedPairLabel';
import { DivergingSlider } from './DivergingSlider';

import { useGeneralStore } from '@/state/generalStore';
import { findOverride } from '@/state/scoreboard/diaspora';

interface PairRowProps {
  from: string;
  to: string;
  /** the preset (or historical) value shown when there is no override */
  presetValue: number;
}

/**
 * One tunable directed pair. Subscribes only to its own override so editing one
 * row doesn't re-render the whole (potentially long) list; the effective value
 * is `override ?? presetValue`, and edits go through the race-safe store action.
 * Wraps to two lines on narrow screens so long country names always fit.
 */
export const PairRow: React.FC<PairRowProps> = ({ from, to, presetValue }) => {
  const overrideValue = useGeneralStore(
    (s) => findOverride(s.settings.diaspora.overrides, from, to)?.affinity,
  );
  const updateOverride = useGeneralStore((s) => s.updateDiasporaOverride);
  const value = overrideValue ?? presetValue;

  return (
    <div className="flex flex-wrap items-center gap-x-3 gap-y-1.5 sm:flex-nowrap">
      <div className="w-full min-w-0 overflow-hidden sm:w-[220px] sm:shrink-0">
        <DirectedPairLabel from={from} to={to} value={value} size={16} />
      </div>
      <div className="w-full min-w-0 sm:flex-1">
        <DivergingSlider
          value={value}
          onChange={(v) => updateOverride(from, to, v)}
          compact
        />
      </div>
    </div>
  );
};
