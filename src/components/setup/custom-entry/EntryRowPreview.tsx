'use client';
import React, { useMemo } from 'react';

import { BoardCap, BoardFlag } from '@/components/setup/hub/lineup/CountryTile';
import { useBoardRowLook } from '@/components/setup/hub/lineup/useBoardRowLook';
import { BaseCountry } from '@/models';

interface EntryRowPreviewProps {
  name: string;
  /**
   * The flag to draw: a URL, a `/flags/` path or a staged upload's data URL.
   * Empty with a standard `code`: that country's own flag.
   */
  flag: string;
  /** Stands in for the name while the field is empty. */
  placeholder: string;
  /**
   * A standard country's code (its name and flag being changed for a
   * contest), so its flag is drawn in the theme's own shapes.
   */
  code?: string;
}

/**
 * The entry as the active theme draws it on the scoreboard: its jury-state
 * row (colours, flag shape, case, scoreboard font, points box) with douze
 * points in the box. Visual only: the fields carry the values.
 */
const EntryRowPreview: React.FC<EntryRowPreviewProps> = ({
  name,
  flag,
  placeholder,
  code,
}) => {
  const look = useBoardRowLook();
  const country: BaseCountry = useMemo(
    () =>
      code
        ? { code, name: name || placeholder, ...(flag ? { flag } : {}) }
        : {
            code: 'custom-preview',
            name: name || placeholder,
            category: 'Custom',
            flag,
          },
    [code, flag, name, placeholder],
  );

  return (
    <div
      aria-hidden="true"
      className={`dp-entry-row dp-scoreboard-font bg-countryItem-juryBg text-countryItem-juryCountryText ${
        look.rounded ? 'rounded-full' : 'rounded-[3px]'
      } flex items-center gap-[5px] md:gap-[6px] h-8 md:h-9 ${
        look.rounded ? 'lg:h-9' : 'lg:h-10'
      } min-w-0 overflow-hidden select-none`}
      style={look.rowStyle}
    >
      <BoardFlag country={country} look={look} eager />
      <span
        className={`flex-1 min-w-0 font-bold truncate ${
          look.uppercase
            ? 'uppercase text-[12px] 2cols:text-[12.5px]'
            : 'text-[13px]'
        } ${look.flagShape === 'none' ? 'pl-3' : ''} ${
          name ? '' : 'opacity-55'
        }`}
      >
        {name || placeholder}
      </span>
      <BoardCap look={look}>
        <span className="text-[13px] font-bold">12</span>
      </BoardCap>
    </div>
  );
};

export default EntryRowPreview;
