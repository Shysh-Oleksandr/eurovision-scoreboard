'use client';

import { Check, ChevronDown } from 'lucide-react';
import React, { useRef, useState } from 'react';

import { LibraryMultiFilter, multiFilterLabel } from './libraryFilters';

import AnchoredMenu from '@/components/common/AnchoredMenu';
import { playHaptic } from '@/native/haptics';

/**
 * A caption select (`CaptionSelect`'s look) for any mix of options:
 * "Includes" over "Audio, Background video". The menu stays open while
 * boxes are ticked.
 */
const LibraryMultiSelect: React.FC<{ filter: LibraryMultiFilter }> = ({
  filter,
}) => {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLButtonElement>(null);

  const toggle = (value: string) => {
    playHaptic({ id: 'selection' });
    filter.onChange(
      filter.values.includes(value)
        ? filter.values.filter((v) => v !== value)
        : [...filter.values, value],
    );
  };

  return (
    <>
      <button
        ref={ref}
        type="button"
        aria-haspopup="menu"
        aria-expanded={open}
        onClick={() => setOpen((v) => !v)}
        className="dp-capsel text-white"
      >
        <small>{filter.caption}</small>
        <b>{multiFilterLabel(filter)}</b>
        <ChevronDown className="size-4" aria-hidden="true" />
      </button>
      <AnchoredMenu
        open={open}
        anchor={ref.current}
        onClose={() => setOpen(false)}
        placement="bottom-start"
        minWidth={ref.current?.offsetWidth}
        ariaLabel={filter.caption}
        items={filter.options.map((option) => {
          const on = filter.values.includes(option.value);

          return {
            label: option.label,
            checked: on,
            keepOpen: true,
            icon: (
              <span className="dp-lib-box" data-on={on || undefined}>
                {on && <Check className="size-3" strokeWidth={3.5} />}
              </span>
            ),
            onClick: () => toggle(option.value),
          };
        })}
      />
    </>
  );
};

export default LibraryMultiSelect;
