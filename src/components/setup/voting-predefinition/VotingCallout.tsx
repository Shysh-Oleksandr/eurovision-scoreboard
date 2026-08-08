import { X } from 'lucide-react';
import React from 'react';

import { cn } from '@/helpers/utils';

type Props = {
  variant: 'info' | 'warn';
  icon: React.ReactNode;
  children: React.ReactNode;
  /** Renders a dismiss affordance when provided. */
  onDismiss?: () => void;
  dismissLabel?: string;
  className?: string;
};

/**
 * The inline notice used across the tabs: the Totals explainer, feasibility
 * warnings, and the "can't save yet" ballot report.
 */
export const VotingCallout: React.FC<Props> = ({
  variant,
  icon,
  children,
  onDismiss,
  dismissLabel,
  className,
}) => (
  <div
    className={cn(
      'flex items-start gap-2.5 rounded-xl px-[13px] py-[11px] text-[13px] font-semibold leading-normal',
      variant === 'info'
        ? 'border border-primary-700/40 bg-primary-700/[0.14] text-white/80'
        : 'border border-[#e6b23c]/30 bg-[#e6b23c]/[0.13] text-[#f0cd78]',
      className,
    )}
  >
    <span className="mt-px flex-none">{icon}</span>
    <span className="min-w-0 [&_b]:font-extrabold [&_b]:text-white [&_strong]:font-extrabold [&_strong]:text-white">
      {children}
    </span>
    {onDismiss && (
      <button
        type="button"
        onClick={onDismiss}
        aria-label={dismissLabel}
        title={dismissLabel}
        className="ml-auto flex-none opacity-55 transition-opacity hover:opacity-100"
      >
        <X className="h-4 w-4" />
      </button>
    )}
  </div>
);

export default VotingCallout;
