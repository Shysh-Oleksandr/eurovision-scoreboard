import React from 'react';

import { playHaptic } from '@/native/haptics';

interface StatsSegmentedProps<T extends string> {
  value: T;
  options: { value: T; label: string; disabled?: boolean }[];
  onChange: (value: T) => void;
  ariaLabel: string;
  className?: string;
}

/**
 * The stats modal's channel switch (Total / Jury / Televote): the
 * simulation's segmented control (`dp-sim-seg`), 46px tall on phones (a
 * thumb's target), 38px from `2cols`.
 */
function StatsSegmented<T extends string>({
  value,
  options,
  onChange,
  ariaLabel,
  className = '',
}: StatsSegmentedProps<T>) {
  return (
    <div
      role="radiogroup"
      aria-label={ariaLabel}
      className={`dp-sim-seg flex gap-0.5 rounded-[11px] p-[3px] ${className}`}
    >
      {options.map((option) => {
        const isOn = option.value === value;

        return (
          <button
            key={option.value}
            type="button"
            role="radio"
            aria-checked={isOn}
            disabled={option.disabled}
            onClick={() => {
              if (!isOn) playHaptic({ id: 'selection' });
              onChange(option.value);
            }}
            className={`${
              isOn ? 'is-on' : 'text-white/70 hover:text-white'
            } h-[38px] 2cols:h-[30px] min-w-0 flex-auto whitespace-nowrap rounded-lg px-3 text-[13px] font-bold transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-accent disabled:cursor-default disabled:text-white/35`}
          >
            {option.label}
          </button>
        );
      })}
    </div>
  );
}

export default StatsSegmented;
