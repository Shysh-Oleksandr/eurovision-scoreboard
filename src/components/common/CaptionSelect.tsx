'use client';

import { Check, ChevronDown } from 'lucide-react';
import React, { useState } from 'react';

import AnchoredMenu from './AnchoredMenu';

import { playHaptic } from '@/native/haptics';

export interface CaptionSelectOption<T extends string> {
  value: T;
  label: string;
}

interface CaptionSelectProps<T extends string> {
  /** What the select picks, in small type above the value ("Sort by"). */
  caption: string;
  value: T;
  options: CaptionSelectOption<T>[];
  onChange: (value: T) => void;
  className?: string;
}

/**
 * A select drawn as a button with its name as a caption inside (like the
 * setup hub's combos): "Sort by" over "Latest". Opens an anchored menu with
 * the current choice checked.
 */
function CaptionSelect<T extends string>({
  caption,
  value,
  options,
  onChange,
  className = '',
}: CaptionSelectProps<T>) {
  const [open, setOpen] = useState(false);
  // The anchor in state (a callback ref), so the menu never reads a ref
  // during render.
  const [anchor, setAnchor] = useState<HTMLButtonElement | null>(null);
  const current = options.find((option) => option.value === value);

  return (
    <>
      <button
        ref={setAnchor}
        type="button"
        aria-haspopup="menu"
        aria-expanded={open}
        onClick={() => setOpen((v) => !v)}
        className={`dp-capsel text-white ${className}`}
      >
        <small>{caption}</small>
        <b>{current?.label ?? ''}</b>
        <ChevronDown className="size-4" aria-hidden="true" />
      </button>
      <AnchoredMenu
        open={open}
        anchor={anchor}
        onClose={() => setOpen(false)}
        placement="bottom-start"
        minWidth={open ? anchor?.offsetWidth : undefined}
        ariaLabel={caption}
        items={options.map((option) => ({
          label: option.label,
          // Announced as the checked choice; the check mark draws it.
          checked: option.value === value,
          onClick: () => {
            if (option.value === value) return;
            playHaptic({ id: 'selection' });
            onChange(option.value);
          },
          trailing:
            option.value === value ? (
              <Check className="size-4 text-accent" aria-hidden="true" />
            ) : undefined,
        }))}
      />
    </>
  );
}

export default CaptionSelect;
