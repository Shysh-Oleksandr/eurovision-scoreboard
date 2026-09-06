'use client';

import { useTranslations } from 'next-intl';
import React, { useState } from 'react';

import dynamic from 'next/dynamic';

import {
  FontSelection,
  selectionFamilyCss,
  selectionLabel,
} from './fontPickerTypes';

import { ArrowIcon } from '@/assets/icons/ArrowIcon';
import { useCustomFontFaces } from '@/theme/useCustomFontFaces';

const FontPickerModal = dynamic(() => import('./FontPickerModal'), {
  ssr: false,
});

interface FontPickerFieldProps {
  id: string;
  label: string;
  slot: 'ui' | 'scoreboard';
  value: FontSelection;
  onChange: (selection: FontSelection) => void;
  className?: string;
}

/**
 * Select-like trigger that shows the chosen font rendered in itself and opens
 * the font picker (built-in / my fonts / public fonts / upload).
 */
const FontPickerField: React.FC<FontPickerFieldProps> = ({
  id,
  label,
  slot,
  value,
  onChange,
  className = '',
}) => {
  const t = useTranslations('widgets.themes.fonts');
  const [isOpen, setIsOpen] = useState(false);

  useCustomFontFaces(value.kind === 'custom' ? value.font : null);

  return (
    // Same wrapper/label rhythm as CustomSelect (no extra gap between them).
    <div className={`flex flex-col ${className}`}>
      <label htmlFor={id} className="text-white text-base font-medium mb-1">
        {label}
      </label>
      <button
        id={id}
        type="button"
        onClick={() => setIsOpen(true)}
        className="select h-12 lg:!text-base !text-sm lg:px-5 sm:px-4 px-3 lg:py-3 !pl-3 py-[10px] w-full flex items-center justify-between cursor-pointer text-left"
        aria-haspopup="dialog"
      >
        <span className="flex items-center gap-2 min-w-0">
          <span
            className="truncate"
            style={{
              fontFamily: selectionFamilyCss(value),
              fontSynthesis: 'none',
            }}
          >
            {selectionLabel(value)}
          </span>
          {value.kind === 'custom' && (
            <span className="text-[10px] font-bold uppercase tracking-wider text-white/70 bg-white/10 rounded-full px-2 py-0.5 shrink-0">
              {t('customChip')}
            </span>
          )}
        </span>
        <ArrowIcon className="w-5 h-5 shrink-0 text-white/80" />
      </button>

      {isOpen && (
        <FontPickerModal
          isOpen={isOpen}
          onClose={() => setIsOpen(false)}
          slot={slot}
          value={value}
          onSelect={(selection) => {
            onChange(selection);
            setIsOpen(false);
          }}
        />
      )}
    </div>
  );
};

export default FontPickerField;
