import React from 'react';

import { cn } from '@/helpers/utils';

type BadgeProps = {
  label: string;
  onClick: () => void;
  isActive: boolean;
  Icon?: React.ReactNode;
  className?: string;
};

const Badge: React.FC<BadgeProps> = ({
  label,
  onClick,
  isActive,
  Icon,
  className = '',
}) => (
  <button
    onClick={onClick}
    className={cn(
      'xs:px-4 px-3 py-1 text-base font-medium rounded-full whitespace-nowrap transition-colors',
      isActive
        ? 'bg-primary-800 text-white'
        : 'bg-primary-900 hover:bg-primary-800 text-white/70',
      Icon ? 'flex items-center gap-1.5' : '',
      className,
    )}
  >
    {Icon}
    {label}
  </button>
);

export default Badge;
