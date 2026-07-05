import React from 'react';

import { FALLBACK_FLAG, getCountryMeta } from './countryMeta';

import { cn } from '@/helpers/utils';

interface RelFlagProps {
  code: string;
  /** rendered width in px; height is derived ~0.72x */
  size?: number;
  className?: string;
}

/** Small rectangular country flag for the Relations UI (custom entries aware). */
export const RelFlag: React.FC<RelFlagProps> = ({
  code,
  size = 20,
  className,
}) => (
  <img
    src={getCountryMeta(code).flag}
    alt=""
    aria-hidden
    onError={(e) => {
      e.currentTarget.src = FALLBACK_FLAG;
    }}
    className={cn('shrink-0 rounded-[2px] object-cover', className)}
    style={{ width: size, height: Math.round(size * 0.72) }}
  />
);
