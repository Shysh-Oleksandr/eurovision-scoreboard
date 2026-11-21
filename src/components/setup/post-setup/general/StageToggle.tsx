'use client';
import { Check } from 'lucide-react';
import React from 'react';

import { playHaptic } from '@/native/haptics';

interface StageToggleProps {
  label: string;
  pressed: boolean;
  onChange: (pressed: boolean) => void;
  /** The hint under it. */
  describedBy?: string;
  className?: string;
}

/**
 * An on/off setting as a pressed button with a box that fills with the
 * accent and a check (the share modal's toggles, at a row's width).
 */
const StageToggle: React.FC<StageToggleProps> = ({
  label,
  pressed,
  onChange,
  describedBy,
  className = '',
}) => (
  <button
    type="button"
    aria-pressed={pressed}
    aria-describedby={describedBy}
    onClick={() => {
      playHaptic({ id: 'selection' });
      onChange(!pressed);
    }}
    className={`dp-ss-toggle ${
      pressed ? 'is-on' : ''
    } flex min-h-[48px] w-full items-center gap-3 rounded-xl px-3.5 py-2 text-left text-[14px] font-bold leading-[1.25] ${className}`}
  >
    <span
      aria-hidden="true"
      className={`dp-check grid size-[22px] flex-none place-items-center rounded-[7px] ${
        pressed ? 'is-on' : ''
      }`}
    >
      <Check className="size-[14px]" strokeWidth={3} />
    </span>
    <span className="min-w-0 text-balance">{label}</span>
  </button>
);

export default StageToggle;
