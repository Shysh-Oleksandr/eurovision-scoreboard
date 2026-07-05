import React from 'react';

import { cn } from '@/helpers/utils';

const styleForSign = (value: number): React.CSSProperties => {
  if (value > 0) {
    return {
      background: 'var(--rel-pos-bg)',
      borderColor: 'var(--rel-pos-bd)',
      color: 'var(--rel-pos-ink)',
    };
  }
  if (value < 0) {
    return {
      background: 'var(--rel-neg-bg)',
      borderColor: 'var(--rel-neg-bd)',
      color: 'var(--rel-neg-ink)',
    };
  }

  return {
    background: 'rgba(0,0,0,.3)',
    borderColor: 'rgba(255,255,255,.1)',
    color: 'rgba(255,255,255,.4)',
  };
};

// true minus glyph for negatives, tabular numerals
const label = (value: number): string =>
  value > 0 ? `+${value}` : value < 0 ? `−${Math.abs(value)}` : '0';

export const ValueChip: React.FC<{ value: number; big?: boolean }> = ({
  value,
  big,
}) => (
  <span
    className={cn(
      'inline-flex items-center justify-center rounded-full border font-extrabold tabular-nums',
      big ? 'min-w-[46px] h-7 text-sm' : 'min-w-[40px] h-6 text-xs',
    )}
    style={styleForSign(value)}
  >
    {label(value)}
  </span>
);
