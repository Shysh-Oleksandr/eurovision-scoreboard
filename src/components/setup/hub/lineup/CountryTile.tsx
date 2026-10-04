'use client';
import { Check, ChevronDown, Globe, Pin } from 'lucide-react';
import React, { memo, useCallback } from 'react';

import { useSetupUiStore } from '../state/setupUiStore';

import { useLineupActions } from './LineupProvider';
import { ListId } from './listIds';

import { useDrawUiStore } from '@/components/setup/allocation-draw/drawUiStore';
import { getFlagPath } from '@/helpers/getFlagPath';
import { BaseCountry } from '@/models';
import { useGeneralStore } from '@/state/generalStore';
import { getHostingCountryLogo } from '@/theme/hosting';

export interface CountryTileProps {
  country: BaseCountry;
  listId: ListId;
  /** Load the flag eagerly (first visible stage). */
  eager?: boolean;
  /** Rendered inside the drag overlay: no interactions, lifted look. */
  overlay?: boolean;
  /**
   * Allocation draw: the tile is pinned (fixed in its semi, or a "Votes in"
   * choice). The string is the accessible description of the pin.
   */
  pinned?: string | null;
  /** Set by the drag-and-drop wrapper. */
  innerRef?: (node: HTMLElement | null) => void;
  dragHandleProps?: React.HTMLAttributes<HTMLElement>;
  isDragging?: boolean;
}

const isCustomEntry = (country: BaseCountry) =>
  country.category === 'Custom' || country.code.startsWith('custom-');

export const TileFlag: React.FC<{
  country: BaseCountry;
  eager?: boolean;
}> = ({ country, eager }) => {
  const shouldShowHeartFlagIcon = useGeneralStore(
    (state) => state.settings.shouldShowHeartFlagIcon,
  );

  if (isCustomEntry(country) && !country.flag) {
    return (
      <span className="dp-flag-gen w-[23px] h-[23px] rounded-[7px] grid place-items-center flex-none">
        <Globe className="size-3.5" />
      </span>
    );
  }

  const { logo, isExisting } = getHostingCountryLogo(
    country,
    shouldShowHeartFlagIcon,
  );

  return (
    <img
      src={logo}
      alt=""
      aria-hidden="true"
      loading={eager ? 'eager' : 'lazy'}
      decoding="async"
      className={`flex-none ${
        isExisting
          ? 'w-[25px] h-[23px] object-contain'
          : 'w-7 h-5 object-cover rounded-[3px]'
      }`}
      width={isExisting ? 25 : 28}
      height={isExisting ? 23 : 20}
      onError={(e) => {
        e.currentTarget.src = getFlagPath('ww');
      }}
    />
  );
};

/**
 * The whole tile is the control: click opens the move menu, click-and-hold
 * drags, and in selection mode the click toggles membership.
 */
const CountryTile: React.FC<CountryTileProps> = ({
  country,
  listId,
  eager = false,
  overlay = false,
  pinned = null,
  innerRef,
  dragHandleProps,
  isDragging = false,
}) => {
  const selectionMode = useSetupUiStore((state) => state.selectionMode);
  const isSelected = useSetupUiStore((state) =>
    state.selected.has(country.code),
  );
  const isFlashing = useDrawUiStore(
    (state) => !!state.flash && state.flash.codes.includes(country.code),
  );
  const { openTileMenu } = useLineupActions();

  const handleClick = useCallback(
    (e: React.MouseEvent<HTMLButtonElement>) => {
      if (overlay) return;

      if (selectionMode) {
        useSetupUiStore.getState().toggleSelected(country.code);

        return;
      }

      openTileMenu(country.code, listId, e.currentTarget);
    },
    [country.code, listId, openTileMenu, overlay, selectionMode],
  );

  return (
    <button
      type="button"
      ref={innerRef}
      onClick={handleClick}
      aria-pressed={selectionMode ? isSelected : undefined}
      aria-haspopup={selectionMode ? undefined : 'menu'}
      aria-label={pinned ? `${country.name}, ${pinned}` : undefined}
      title={country.name}
      className={`dp-tile ${isSelected ? 'is-selected' : ''} ${
        isDragging ? 'is-dragging' : ''
      } ${overlay ? 'dp-tile-overlay' : ''} ${
        pinned ? 'dp-tile--pinned' : ''
      } ${
        isFlashing ? 'dp-tile--flash' : ''
      } flex items-center gap-[9px] px-[9px] py-2 rounded-[10px] min-w-0 text-left text-white select-none touch-manipulation`}
      {...dragHandleProps}
    >
      {selectionMode ? (
        <span className="dp-check w-[17px] h-[17px] rounded-[5px] grid place-items-center flex-none">
          <Check className="size-3" strokeWidth={3} />
        </span>
      ) : (
        <TileFlag country={country} eager={eager} />
      )}
      <span className="flex-1 min-w-0 text-[13px] font-bold tracking-[-.005em] truncate">
        {country.name}
      </span>
      {pinned && !selectionMode && (
        <Pin className="dp-tile-pin size-3.5 flex-none" aria-hidden="true" />
      )}
      {!selectionMode && (
        <ChevronDown className="size-[15px] flex-none text-white/40 group-hover:text-white/70" />
      )}
    </button>
  );
};

export default memo(CountryTile);
