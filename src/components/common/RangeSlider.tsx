import React, { useState, useEffect } from 'react';

import { useDebounce } from '@/hooks/useDebounce';
import usePrevious from '@/hooks/usePrevious';

interface RangeSliderProps {
  id?: string;
  label?: string;
  max: number;
  maxLabel?: string;
  min: number;
  minLabel?: string;
  onChange: (value: number) => void;
  value: number;
  delay?: number;
  step?: number;
  displayValue?: boolean;
}

export const RangeSlider: React.FC<RangeSliderProps> = ({
  min,
  max,
  value,
  onChange,
  label,
  minLabel,
  maxLabel,
  id,
  delay = 400,
  step,
  displayValue = true,
}) => {
  const [internalValue, setInternalValue] = useState(value);
  const debouncedValue = useDebounce(internalValue, delay);
  const prevDebouncedValue = usePrevious(debouncedValue);

  useEffect(() => {
    if (debouncedValue !== prevDebouncedValue) {
      onChange(debouncedValue);
    }
  }, [debouncedValue, onChange, prevDebouncedValue]);

  useEffect(() => {
    setInternalValue(value);
  }, [value]);

  const handleInputChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    setInternalValue(Number(event.target.value));
  };

  const progress = ((internalValue - min) / (max - min)) * 100;

  return (
    <div className="w-full">
      {label && (
        <label
          htmlFor={id}
          className="block text-sm font-medium text-white/70 mb-1"
        >
          {label}
          {displayValue && ': '}
          {displayValue && (
            <span className="text-white/90 font-semibold text-base">
              {internalValue}
            </span>
          )}
        </label>
      )}
      <div className="range-wrapper">
        <input
          id={id}
          type="range"
          min={min}
          max={max}
          step={step}
          value={internalValue}
          onChange={handleInputChange}
          className="range-slider"
          style={{ '--progress': `${progress}%` } as React.CSSProperties}
        />
      </div>
      {(minLabel || maxLabel) && (
        <div className="flex justify-between text-sm text-white/60 mt-1">
          {minLabel && <span>{minLabel}</span>}
          {maxLabel && <span>{maxLabel}</span>}
        </div>
      )}
    </div>
  );
};
