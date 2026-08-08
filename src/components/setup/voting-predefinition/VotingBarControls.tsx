'use client';

import React, { useRef } from 'react';

import IconButtonTooltip from '@/components/common/IconButtonTooltip';
import { cn } from '@/helpers/utils';
import { useGeneralStore } from '@/state/generalStore';
import { useReadableForegroundFromCssVar } from '@/theme/useReadableForegroundFromCssVar';

type BarButtonProps = {
  children?: React.ReactNode;
  icon?: React.ReactNode;
  onClick?: () => void;
  variant?: 'default' | 'primary' | 'ghost';
  disabled?: boolean;
  title?: string;
  className?: string;
};

/**
 * The command-bar button. Three flavours from the design: a neutral hairline
 * button, a ghost (borderless) one for secondary/destructive triggers, and the
 * accent-filled primary that drives each tab's generate action.
 */
export const VotingBarButton = React.forwardRef<
  HTMLButtonElement,
  BarButtonProps
>(
  (
    {
      children,
      icon,
      onClick,
      variant = 'default',
      disabled,
      title,
      className,
    },
    ref,
  ) => {
    const localRef = useRef<HTMLButtonElement>(null);
    // The primary fill is primary-700 → primary-800; flip the label dark on
    // light themes so it stays readable.
    const primaryColor = useReadableForegroundFromCssVar(
      localRef,
      '--twc-primary-700',
    );

    return (
      <button
        type="button"
        ref={(node) => {
          localRef.current = node;
          if (typeof ref === 'function') ref(node);
          else if (ref) ref.current = node;
        }}
        onClick={onClick}
        disabled={disabled}
        title={title}
        className={cn(
          'inline-flex h-[38px] flex-none items-center gap-[7px] whitespace-nowrap rounded-lg px-3',
          'text-[12.5px] font-extrabold tracking-[-0.01em] transition-colors duration-200',
          variant === 'primary' &&
            'bg-gradient-to-b from-primary-700 to-primary-800 uppercase tracking-[0.02em] shadow-sm shadow-black/20 hover:brightness-110',
          variant === 'ghost' &&
            'font-bold text-white/55 hover:bg-white/[0.06] hover:text-white',
          variant === 'default' &&
            'border border-white/10 bg-white/[0.06] text-white hover:bg-white/[0.12]',
          disabled && 'pointer-events-none opacity-40',
          className,
        )}
        style={variant === 'primary' ? { color: primaryColor } : undefined}
      >
        {icon}
        {children}
      </button>
    );
  },
);

VotingBarButton.displayName = 'VotingBarButton';

type BarIconButtonProps = {
  icon: React.ReactNode;
  /** Used as the accessible name and the tooltip copy. */
  label: string;
  onClick?: () => void;
  isActive?: boolean;
  disabled?: boolean;
  className?: string;
};

/**
 * Square icon-only command-bar button. Honours the user's
 * "icon button tooltips" preference the same way the shared `Button` does.
 */
export const VotingBarIconButton = React.forwardRef<
  HTMLButtonElement,
  BarIconButtonProps
>(({ icon, label, onClick, isActive, disabled, className }, ref) => {
  const enableIconButtonTooltips = useGeneralStore(
    (state) => state.settings.enableIconButtonTooltips,
  );

  const button = (
    <button
      type="button"
      ref={ref}
      onClick={onClick}
      disabled={disabled}
      aria-label={label}
      aria-pressed={isActive}
      title={enableIconButtonTooltips ? undefined : label}
      className={cn(
        'inline-flex h-[38px] w-[38px] flex-none items-center justify-center rounded-[9px]',
        'border border-white/10 transition-colors duration-200',
        isActive
          ? 'bg-gradient-to-b from-primary-700 to-primary-800 text-white'
          : 'bg-white/[0.05] text-white/70 hover:bg-white/[0.12] hover:text-white',
        disabled && 'pointer-events-none opacity-40',
        className,
      )}
    >
      {icon}
    </button>
  );

  if (!enableIconButtonTooltips) return button;

  return <IconButtonTooltip content={label}>{button}</IconButtonTooltip>;
});

VotingBarIconButton.displayName = 'VotingBarIconButton';

type SegmentedControlProps<T extends string> = {
  options: Array<{ value: T; label: string }>;
  value: T;
  onChange: (value: T) => void;
  ariaLabel: string;
};

/**
 * Compact segmented control used for the Detailed tab's channel switch
 * (Total / Jury / Televote).
 */
export const VotingSegmentedControl = <T extends string>({
  options,
  value,
  onChange,
  ariaLabel,
}: SegmentedControlProps<T>) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const activeColor = useReadableForegroundFromCssVar(
    containerRef,
    '--twc-primary-700',
  );

  return (
    <div
      ref={containerRef}
      role="tablist"
      aria-label={ariaLabel}
      className="inline-flex flex-none rounded-[9px] border border-white/10 bg-black/25 p-[3px]"
    >
      {options.map((option) => {
        const isActive = option.value === value;

        return (
          <button
            key={option.value}
            type="button"
            role="tab"
            aria-selected={isActive}
            onClick={() => onChange(option.value)}
            className={cn(
              'rounded-md px-[13px] py-1.5 text-[12.5px] font-bold transition-colors duration-200',
              isActive
                ? 'bg-gradient-to-b from-primary-700 to-primary-800 shadow-[inset_0_1px_0_rgba(255,255,255,0.25)]'
                : 'text-white/55 hover:text-white/80',
            )}
            style={isActive ? { color: activeColor } : undefined}
          >
            {option.label}
          </button>
        );
      })}
    </div>
  );
};
