'use client';

import React, { useRef } from 'react';

import { playHaptic } from '@/native/haptics';

export interface SegmentedTab<T extends string> {
  value: T;
  /** Usually a string; a node when a fitted layout swaps a short label in. */
  label: React.ReactNode;
}

interface SegmentedTabsProps<T extends string> {
  tabs: readonly SegmentedTab<T>[];
  value: T;
  onChange: (value: T) => void;
  /** The heading that names the tab list (usually the modal's title). */
  ariaLabelledBy: string;
  /** The header's copy carries the ids the panels point at. */
  tabId?: (value: T) => string;
  panelId?: (value: T) => string;
  /** Phones' bottom bar: 44px segments that share its width. */
  large?: boolean;
  /**
   * Segments share the width by their labels' length (a long label gets
   * more), instead of `large`'s equal split or the default's own widths.
   */
  fill?: boolean;
  className?: string;
}

/**
 * A modal's places as the simulation's segmented well (`dp-sim-seg`): tabs,
 * with the arrow keys, Home and End moving between them. The Settings modal
 * uses it in its header and, on phones, in the bar at the bottom (the
 * libraries' frame).
 */
function SegmentedTabs<T extends string>({
  tabs,
  value,
  onChange,
  ariaLabelledBy,
  tabId,
  panelId,
  large = false,
  fill = false,
  className = '',
}: SegmentedTabsProps<T>) {
  const refs = useRef<(HTMLButtonElement | null)[]>([]);

  const select = (next: T, focus = false) => {
    if (next !== value) {
      playHaptic({ id: 'selection' });
      onChange(next);
    }
    if (focus) {
      refs.current[tabs.findIndex((tab) => tab.value === next)]?.focus();
    }
  };

  const onKeyDown = (e: React.KeyboardEvent) => {
    const index = tabs.findIndex((tab) => tab.value === value);
    const last = tabs.length - 1;
    let target: number | null = null;

    if (e.key === 'ArrowRight') target = index === last ? 0 : index + 1;
    else if (e.key === 'ArrowLeft') target = index === 0 ? last : index - 1;
    else if (e.key === 'Home') target = 0;
    else if (e.key === 'End') target = last;

    if (target === null) return;
    e.preventDefault();
    select(tabs[target].value, true);
  };

  return (
    <div
      role="tablist"
      aria-labelledby={ariaLabelledBy}
      onKeyDown={onKeyDown}
      className={`dp-sim-seg min-w-0 gap-0.5 rounded-xl p-[3px] ${className}`}
    >
      {tabs.map((tab, i) => {
        const on = tab.value === value;

        return (
          <button
            key={tab.value}
            ref={(el) => {
              refs.current[i] = el;
            }}
            type="button"
            role="tab"
            id={tabId?.(tab.value)}
            aria-controls={panelId?.(tab.value)}
            aria-selected={on}
            tabIndex={on ? 0 : -1}
            onClick={() => select(tab.value)}
            className={`${on ? 'is-on' : 'text-white/70 hover:text-white'} ${
              large ? 'h-11 text-[14px]' : 'h-[36px] text-[13.5px]'
            } ${
              fill
                ? 'min-w-0 flex-auto px-2.5'
                : large
                ? 'min-w-0 flex-1 px-2'
                : 'px-4'
            } truncate whitespace-nowrap rounded-[9px] font-bold transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-accent`}
          >
            {tab.label}
          </button>
        );
      })}
    </div>
  );
}

export default SegmentedTabs;
