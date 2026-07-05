import React, { useEffect, useRef, useState } from 'react';

import { ValueChip } from './ValueChip';

import { cn } from '@/helpers/utils';
import { useDebounce } from '@/hooks/useDebounce';

interface DivergingSliderProps {
  value: number;
  onChange: (value: number) => void;
  compact?: boolean;
  disabled?: boolean;
  showChip?: boolean;
  delay?: number;
}

const colorFor = (value: number): string =>
  value > 0
    ? 'var(--rel-pos)'
    : value < 0
    ? 'var(--rel-neg)'
    : 'rgba(255,255,255,.4)';

/**
 * Directed -100..+100 control: fill grows from the centre, sign-coloured
 * (favor warm / snub cool), with a trailing signed chip. Debounces writes while
 * dragging (mirrors RangeSlider) so it doesn't thrash the store.
 */
export const DivergingSlider: React.FC<DivergingSliderProps> = ({
  value,
  onChange,
  compact,
  disabled,
  showChip = true,
  delay = 300,
}) => {
  const [internal, setInternal] = useState(value);
  const debounced = useDebounce(internal, delay);

  // The last value that flowed in from the prop (or that we emitted). We only
  // emit onChange when the debounced value genuinely diverges from it — so the
  // slider never fires on mount or when it's just echoing an external update
  // (which previously wrote spurious overrides for every mounted bloc pair).
  const lastValueRef = useRef(value);
  const onChangeRef = useRef(onChange);

  onChangeRef.current = onChange;

  useEffect(() => {
    lastValueRef.current = value;
    setInternal(value);
  }, [value]);

  useEffect(() => {
    if (debounced !== lastValueRef.current) {
      lastValueRef.current = debounced;
      onChangeRef.current(debounced);
    }
  }, [debounced]);

  const color = colorFor(internal);
  const pct = (internal + 100) / 2; // 0..100
  const fill: React.CSSProperties =
    internal >= 0
      ? { left: '50%', width: `${pct - 50}%` }
      : { left: `${pct}%`, width: `${50 - pct}%` };

  return (
    <div
      className="flex w-full items-center gap-2.5"
      style={{ opacity: disabled ? 0.45 : 1 }}
    >
      <div
        className={cn('rel-diverging flex-1', compact && 'compact')}
        style={{ '--rel-thumb': color } as React.CSSProperties}
      >
        <div className="rel-diverging-track" />
        <div className="rel-diverging-notch" />
        <div
          className="rel-diverging-fill"
          style={{
            ...fill,
            background: color,
            boxShadow: internal !== 0 ? `0 0 10px ${color}` : 'none',
          }}
        />
        <input
          type="range"
          min={-100}
          max={100}
          value={internal}
          disabled={disabled}
          onChange={(e) => setInternal(Number(e.target.value))}
          className="rel-diverging-input"
          aria-label="Affinity"
        />
      </div>
      {showChip && <ValueChip value={internal} />}
    </div>
  );
};
