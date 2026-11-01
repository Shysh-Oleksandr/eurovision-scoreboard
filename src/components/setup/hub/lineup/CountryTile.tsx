'use client';
import { Check, ChevronDown, Globe, Pin } from 'lucide-react';
import React, { memo, useCallback } from 'react';

import { useSetupUiStore } from '../state/setupUiStore';

import { useLineupActions } from './LineupProvider';
import { ListId } from './listIds';
import { BoardRowLook } from './useBoardRowLook';

import useFlagClassName from '@/components/countryItem/hooks/useFlagClassName';
import RoundedTriangle from '@/components/RoundedTriangle';
import { useDrawUiStore } from '@/components/setup/allocation-draw/drawUiStore';
import { getFlagPath, handleFlagError } from '@/helpers/getFlagPath';
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
  /** Stage lists: draw the tile as the theme's jury-state board row. */
  boardRow?: BoardRowLook | null;
}

/** The points box keeps the transparent shape's look (no fill, row text colour). */
const BOARD_CAP_CLASS = {
  triangle: '',
  square: '',
  transparent: 'dp-board-cap--transparent',
};

const isCustomEntry = (country: BaseCountry) =>
  country.category === 'Custom' || country.code.startsWith('custom-');

export const TileFlag: React.FC<{
  country: BaseCountry;
  eager?: boolean;
}> = ({ country, eager }) => {
  const shouldShowHeartFlagIcon = useGeneralStore(
    (state) => state.settings.shouldShowHeartFlagIcon,
  );
  const shouldUse2026WhiteHeartFlags = useGeneralStore(
    (state) => state.settings.shouldUse2026WhiteHeartFlags,
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
    shouldUse2026WhiteHeartFlags,
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

/** A stage tile's flag: the theme's scoreboard flag, sized like the board's. */
const BoardFlag: React.FC<{
  country: BaseCountry;
  look: BoardRowLook;
  eager?: boolean;
}> = ({ country, look, eager }) => {
  const flagClassName = useFlagClassName(look.flagShape, false, look.rounded);

  if (look.flagShape === 'none') return null;

  return (
    <img
      src={getFlagPath(country, look.flagShape, look.minimalisticFlags)}
      alt=""
      aria-hidden="true"
      loading={eager ? 'eager' : 'lazy'}
      decoding="async"
      width={48}
      height={36}
      className={`flex-none object-cover bg-countryItem-juryBg ${flagClassName}`}
      onError={(e) => handleFlagError(e.currentTarget, country, look.flagShape)}
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
  boardRow = null,
}) => {
  const selectionMode = useSetupUiStore((state) => state.selectionMode);
  const isSelected = useSetupUiStore((state) =>
    state.selected.has(country.code),
  );
  const isFlashing = useDrawUiStore(
    (state) => !!state.flash && state.flash.codes.includes(country.code),
  );
  const { openTileMenu } = useLineupActions();
  const wedge =
    !!boardRow && boardRow.pointsShape === 'triangle' && !boardRow.rounded;

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

  if (boardRow) {
    return (
      <button
        type="button"
        ref={innerRef}
        onClick={handleClick}
        aria-pressed={selectionMode ? isSelected : undefined}
        aria-haspopup={selectionMode ? undefined : 'menu'}
        aria-label={pinned ? `${country.name}, ${pinned}` : undefined}
        title={country.name}
        data-code={country.code}
        className={`dp-board-tile dp-scoreboard-font bg-countryItem-juryBg text-countryItem-juryCountryText ${
          boardRow.rounded ? 'rounded-full' : 'rounded-[3px]'
        } ${isSelected ? 'is-selected' : ''} ${
          isDragging ? 'is-dragging' : ''
        } ${overlay ? 'dp-tile-overlay' : ''} ${
          isFlashing ? 'dp-tile--flash' : ''
        } flex items-center gap-[5px] md:gap-[6px] h-8 md:h-9 ${
          // The board row's own heights (useItemState).
          boardRow.rounded ? 'lg:h-9' : 'lg:h-10'
        } min-w-0 overflow-hidden text-left select-none touch-manipulation`}
        style={boardRow.rowStyle}
        {...dragHandleProps}
      >
        <BoardFlag country={country} look={boardRow} eager={eager} />
        <span
          className={`flex-1 min-w-0 font-bold truncate ${
            boardRow.uppercase
              ? 'uppercase text-[12px] 2cols:text-[12.5px]'
              : 'text-[13px]'
          } ${boardRow.flagShape === 'none' ? 'pl-3' : ''}`}
        >
          {country.name}
        </span>
        {pinned && !selectionMode && (
          <Pin className="size-3.5 flex-none opacity-70" aria-hidden="true" />
        )}
        {/* The points box holds the menu chevron, or the checkbox while
            selecting; the triangle is the board's rounded wedge in front of it
            (room kept by the margin). */}
        <span
          className={`${
            BOARD_CAP_CLASS[boardRow.pointsShape]
          } relative bg-countryItem-juryPointsBg text-countryItem-juryPointsText ${
            boardRow.rounded ? 'rounded-r-full' : ''
          } ${
            wedge ? 'ml-[8px]' : ''
          } self-stretch w-[28px] md:w-[32px] lg:w-[34px] flex-none grid place-items-center`}
          aria-hidden="true"
        >
          {wedge && (
            <RoundedTriangle
              className="text-countryItem-juryPointsBg !z-[1]"
              withTransition={false}
            />
          )}
          {selectionMode ? (
            <span className="dp-board-check w-[17px] h-[17px] rounded-[5px] grid place-items-center">
              {isSelected && <Check className="size-3" strokeWidth={3} />}
            </span>
          ) : (
            <ChevronDown className="size-[15px]" />
          )}
        </span>
      </button>
    );
  }

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
