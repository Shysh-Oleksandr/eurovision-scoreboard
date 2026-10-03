'use client';
import { ChevronDown } from 'lucide-react';
import React from 'react';

interface CountPillProps {
  count: number;
  ariaLabel: string;
  onClick: (e: React.MouseEvent<HTMLButtonElement>) => void;
  size?: 'md' | 'sm';
}

/** Count pill on stage / category headers; opens the "Move all to…" menu. */
const CountPill: React.FC<CountPillProps> = ({
  count,
  ariaLabel,
  onClick,
  size = 'md',
}) => (
  <button
    type="button"
    onClick={(e) => {
      e.stopPropagation();
      onClick(e);
    }}
    aria-label={ariaLabel}
    aria-haspopup="menu"
    className={`dp-count-pill flex items-center gap-[7px] rounded-[9px] font-extrabold whitespace-nowrap tabular-nums ${
      size === 'md'
        ? 'h-[34px] px-[11px] text-[12.5px]'
        : 'h-[30px] px-2.5 text-xs'
    }`}
  >
    {count}
    <ChevronDown className={size === 'md' ? 'size-[13px]' : 'size-3'} />
  </button>
);

export default CountPill;
