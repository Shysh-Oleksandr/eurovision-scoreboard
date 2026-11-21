'use client';

import { Search, X } from 'lucide-react';
import { useTranslations } from 'next-intl';
import React, { useRef } from 'react';

interface LibrarySearchFieldProps {
  value: string;
  onChange: (value: string) => void;
  placeholder: string;
}

/**
 * The libraries' search: a recessed frame (the focus ring goes on it) with
 * the icon inside and a clear button once there is text. 16px text on
 * phones keeps iOS from zooming in.
 */
const LibrarySearchField: React.FC<LibrarySearchFieldProps> = ({
  value,
  onChange,
  placeholder,
}) => {
  const t = useTranslations('widgets.library');
  const inputRef = useRef<HTMLInputElement>(null);

  return (
    <div className="dp-lib-search flex h-11 2cols:h-[46px] min-w-0 flex-1 items-center rounded-xl">
      <Search
        className="ml-3.5 size-[18px] flex-none text-white/55"
        aria-hidden="true"
      />
      <input
        ref={inputRef}
        type="text"
        role="searchbox"
        enterKeyHint="search"
        autoComplete="off"
        spellCheck={false}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        aria-label={placeholder}
        className="h-full min-w-0 flex-1 bg-transparent px-2.5 text-[16px] 2cols:text-[14.5px] font-semibold text-white outline-none placeholder:text-white/50"
      />
      {value && (
        <button
          type="button"
          onClick={() => {
            onChange('');
            inputRef.current?.focus();
          }}
          aria-label={t('clearSearch')}
          className="mr-1 grid size-9 flex-none place-items-center rounded-lg text-white/60 transition-colors hover:bg-white/[0.08] hover:text-white focus-visible:outline focus-visible:outline-2 focus-visible:outline-accent"
        >
          <X className="size-[18px]" aria-hidden="true" />
        </button>
      )}
    </div>
  );
};

export default LibrarySearchField;
