'use client';

import { Check } from 'lucide-react';
import React from 'react';

import { fontSampleText, FontSelection } from './fontPickerTypes';

import { useAuthStore } from '@/state/useAuthStore';
import {
  FONT_ALIAS_ALLOWLIST,
  FONT_OPTION_LABELS,
  getFontFamilyStackCss,
} from '@/theme/fontAliases';

interface BuiltinFontsTabProps {
  value: FontSelection;
  onSelect: (selection: FontSelection) => void;
}

const BuiltinFontsTab: React.FC<BuiltinFontsTabProps> = ({
  value,
  onSelect,
}) => {
  const userCountry = useAuthStore((s) => s.user?.country);
  const sampleText = fontSampleText(userCountry);

  return (
    <div className="grid sm:grid-cols-2 gap-2">
      {FONT_ALIAS_ALLOWLIST.map((alias) => {
        const selected = value.kind === 'builtin' && value.alias === alias;
        const fontFamily = getFontFamilyStackCss(alias);

        return (
          <button
            key={alias}
            type="button"
            onClick={() => onSelect({ kind: 'builtin', alias })}
            aria-pressed={selected}
            className={`text-left rounded-[12px] border px-4 py-3 transition-colors ${
              selected
                ? 'border-white/70 bg-white/[0.1]'
                : 'border-white/10 bg-black/20 hover:bg-white/[0.06]'
            }`}
          >
            <div className="flex items-center justify-between gap-2">
              <span className="text-base font-semibold" style={{ fontFamily }}>
                {FONT_OPTION_LABELS[alias]}
              </span>
              {selected && <Check className="w-4 h-4 shrink-0" />}
            </div>
            <p className="text-sm text-white/70 mt-1" style={{ fontFamily }}>
              {sampleText}
            </p>
          </button>
        );
      })}
    </div>
  );
};

export default BuiltinFontsTab;
