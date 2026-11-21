'use client';
import React from 'react';

import { playHaptic } from '@/native/haptics';

interface OddsSegmentedProps<T extends string> {
  value: T;
  options: { value: T; label: string }[];
  onChange: (value: T) => void;
  ariaLabel: string;
  className?: string;
}

/**
 * Numbers / Ranking and Jury / Televote: the simulation's segmented well,
 * 40px when the controls sit above the list (phones), 36px in the column.
 */
function OddsSegmented<T extends string>({
  value,
  options,
  onChange,
  ariaLabel,
  className = '',
}: OddsSegmentedProps<T>) {
  return (
    <div
      role="radiogroup"
      aria-label={ariaLabel}
      className={`dp-sim-seg flex min-w-0 gap-0.5 rounded-xl p-[3px] ${className}`}
    >
      {options.map((option) => {
        const on = option.value === value;

        return (
          <button
            key={option.value}
            type="button"
            role="radio"
            aria-checked={on}
            onClick={() => {
              if (!on) playHaptic({ id: 'selection' });
              onChange(option.value);
            }}
            className={`${
              on ? 'is-on' : 'text-white/70 hover:text-white'
            } dp-odds-seg-btn min-w-0 flex-1 truncate rounded-[9px] px-3 text-[13.5px] font-bold transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-accent`}
          >
            {option.label}
          </button>
        );
      })}
    </div>
  );
}

export default OddsSegmented;
