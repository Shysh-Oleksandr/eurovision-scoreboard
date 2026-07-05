import { ArrowRight } from 'lucide-react';
import React from 'react';

import { countryName } from './countryMeta';
import { RelFlag } from './RelFlag';

interface DirectedPairLabelProps {
  from: string;
  to: string;
  /** used only to tint the arrow by sign */
  value?: number;
  showNames?: boolean;
  size?: number;
}

const arrowColor = (value: number): string =>
  value > 0
    ? 'var(--rel-pos)'
    : value < 0
    ? 'var(--rel-neg)'
    : 'rgba(255,255,255,.35)';

/**
 * FROM → TO directed relationship label; arrow tinted by sign. Names truncate
 * (rather than overflow) when the row is narrow, so they never spill into the
 * slider and eat the gap.
 */
export const DirectedPairLabel: React.FC<DirectedPairLabelProps> = ({
  from,
  to,
  value = 0,
  showNames = true,
  size = 18,
}) => (
  <span className="flex min-w-0 items-center gap-1.5">
    <RelFlag code={from} size={size} />
    {showNames && (
      <b className="min-w-0 truncate text-[13px] font-bold text-white">
        {countryName(from)}
      </b>
    )}
    <ArrowRight
      size={16}
      className="mx-0.5 shrink-0"
      style={{ color: arrowColor(value) }}
    />
    <RelFlag code={to} size={size} />
    {showNames && (
      <b className="min-w-0 truncate text-[13px] font-bold text-white">
        {countryName(to)}
      </b>
    )}
  </span>
);
