'use client';
import React, { useEffect, useRef, useState } from 'react';

import { useDebounce } from '@/hooks/useDebounce';
import { useSliderHaptics } from '@/hooks/useSliderHaptics';

/** A pause this long while dragging saves the value. */
const COMMIT_DELAY = 400;

interface OddsSliderProps {
  id: string;
  value: number;
  onChange: (value: number) => void;
  /** Every value while dragging, for a readout elsewhere (the phones' combo). */
  onLive?: (value: number) => void;
  minLabel: string;
  maxLabel: string;
  /** The name and value above the track; without it, `ariaLabelledBy` names it. */
  label?: string;
  ariaLabelledBy?: string;
}

/**
 * Randomness or Points spread, 0–100: the app's range slider with its name
 * and live value above it ("Randomness ... 50") and what each end means
 * under it. Saves after a pause in dragging.
 */
const OddsSlider: React.FC<OddsSliderProps> = ({
  id,
  value,
  onChange,
  onLive,
  minLabel,
  maxLabel,
  label,
  ariaLabelledBy,
}) => {
  const [live, setLive] = useState(value);
  const debounced = useDebounce(live, COMMIT_DELAY);
  const valueRef = useRef(value);
  const tick = useSliderHaptics(0, 100);

  valueRef.current = value;

  useEffect(() => {
    setLive(value);
  }, [value]);

  useEffect(() => {
    if (debounced !== valueRef.current) onChange(debounced);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [debounced]);

  const handleInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    const next = Number(e.target.value);

    tick(next);
    setLive(next);
    onLive?.(next);
  };

  return (
    <div className="flex flex-col gap-2">
      {label && (
        <label
          htmlFor={id}
          className="flex items-baseline gap-3 text-[13.5px] font-bold"
        >
          <span className="min-w-0 flex-1">{label}</span>
          <span className="tabular-nums">{live}</span>
        </label>
      )}
      <div className="range-wrapper">
        <input
          id={id}
          type="range"
          min={0}
          max={100}
          value={live}
          onChange={handleInput}
          aria-labelledby={label ? undefined : ariaLabelledBy}
          className="range-slider"
          style={{ '--progress': `${live}%` } as React.CSSProperties}
        />
      </div>
      <div className="flex justify-between gap-3 text-[12px] font-semibold text-white/55">
        <span>{minLabel}</span>
        <span className="text-right">{maxLabel}</span>
      </div>
    </div>
  );
};

export default OddsSlider;
