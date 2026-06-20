import React, { useRef } from 'react';

import { cn } from '@/helpers/utils';
import { useReadableForegroundFromCssVar } from '@/theme/useReadableForegroundFromCssVar';

type BadgeProps = {
  label?: string;
  onClick: () => void;
  isActive: boolean;
  Icon?: React.ReactNode;
  className?: string;
  children?: React.ReactNode;
};

const Badge: React.FC<BadgeProps> = ({
  label,
  onClick,
  isActive,
  Icon,
  className = '',
  children,
}) => {
  const ref = useRef<HTMLButtonElement | null>(null);
  // Active fill is primary-700 → primary-750; flip the label dark on light themes.
  const activeColor = useReadableForegroundFromCssVar(ref, '--twc-primary-700');

  return (
    <button
      ref={ref}
      type="button"
      onClick={onClick}
      className={cn(
        'text-[13.5px] font-semibold px-[14px] py-[7px] rounded-full border whitespace-nowrap transition-[color,border-color]',
        isActive
          ? '!border-primary-700'
          : 'bg-white/[0.04] border-white/[0.10] text-white/70 hover:text-white hover:border-white/[0.16]',
        Icon ? 'flex items-center gap-1.5' : '',
        className,
      )}
      style={
        isActive
          ? {
              color: activeColor,
              background:
                'linear-gradient(180deg, hsl(var(--twc-primary-700)), hsl(var(--twc-primary-750)))',
              boxShadow: '0 4px 14px rgba(0,0,0,0.15)',
            }
          : {}
      }
    >
      {Icon}
      {label}
      {children}
    </button>
  );
};

export default Badge;
