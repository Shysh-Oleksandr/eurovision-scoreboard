import { LucideIcon } from 'lucide-react';
import React from 'react';

import { cn } from '@/helpers/utils';

export interface RelSegmentedOption<T extends string> {
  value: T;
  label: string;
  Icon?: LucideIcon;
}

interface RelSegmentedProps<T extends string> {
  options: RelSegmentedOption<T>[];
  value: T;
  onChange: (value: T) => void;
  className?: string;
}

/**
 * Compact inline segmented control (the lens switch, the votes given/got
 * toggle). The active segment gets a raised primary fill; inactive segments are
 * muted. Kept local to the Relations tab — the shared Tabs is a full-width bar.
 */
export function RelSegmented<T extends string>({
  options,
  value,
  onChange,
  className,
}: RelSegmentedProps<T>) {
  return (
    <div
      className={cn(
        'inline-flex gap-0.5 rounded-lg border border-white/10 bg-black/25 p-[3px]',
        className,
      )}
    >
      {options.map((o) => {
        const active = o.value === value;

        return (
          <button
            key={o.value}
            type="button"
            onClick={() => onChange(o.value)}
            className={cn(
              'inline-flex items-center justify-center gap-1.5 whitespace-nowrap rounded-md px-3 py-1.5 text-[12.5px] font-bold transition-colors',
              active
                ? 'bg-gradient-to-b from-primary-700 to-primary-800 text-white shadow-[inset_0_1px_0_rgba(255,255,255,0.1),0_1px_2px_rgba(0,0,0,0.2)]'
                : 'text-white/50 hover:text-white/80',
            )}
          >
            {o.Icon && <o.Icon size={15} />}
            {o.label}
          </button>
        );
      })}
    </div>
  );
}
