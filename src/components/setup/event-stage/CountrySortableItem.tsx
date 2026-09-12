import React from 'react';

import { VoterChannelBadge } from './VoterChannelBadge';
import { VoterChannelToggles } from './VoterChannelToggles';
import { VoterGroupLabel } from './VoterGroupLabel';

import { CustomSortableItem } from '@/components/common/CustomSortableItem';
import { getFlagPath } from '@/helpers/getFlagPath';
import { BaseCountry, VoterChannelMode } from '@/models';
import { useGeneralStore } from '@/state/generalStore';
import { ROTW_CODE } from '@/state/scoreboard/voterChannels';
import { getHostingCountryLogo } from '@/theme/hosting';

interface CountrySortableItemProps {
  id: string;
  country: BaseCountry;
  stageId: string;
  label?: string;
  withGroupLabel?: boolean;
  onRemove?: () => void;
  index?: number;
  /** Voter channel mode; renders the non-default badge when provided. */
  channelMode?: VoterChannelMode;
  /** Show the J / T toggles (voter channels editing mode). */
  showChannelControls?: boolean;
  onChannelModeChange?: (mode: VoterChannelMode) => void;
}

export const CountrySortableItem: React.FC<CountrySortableItemProps> = ({
  id,
  country,
  stageId,
  label,
  withGroupLabel = true,
  onRemove,
  index,
  channelMode,
  showChannelControls = false,
  onChannelModeChange,
}) => {
  const shouldShowHeartFlagIcon = useGeneralStore(
    (state) => state.settings.shouldShowHeartFlagIcon,
  );

  const { logo, isExisting } = getHostingCountryLogo(
    country,
    shouldShowHeartFlagIcon,
  );

  const showBadgeRow =
    withGroupLabel || (channelMode && channelMode !== 'both');

  return (
    <CustomSortableItem
      id={id}
      key={id}
      onRemove={onRemove}
      // Rest of the World is not a competing country: calmer chip.
      className={
        country.code === ROTW_CODE
          ? '!bg-primary-900 !from-primary-900 !to-primary-800/70'
          : ''
      }
    >
      {showBadgeRow && (
        // Overhanging badge row: status badge first (truncates first), channel
        // badge second (never shrinks); clipped to the chip's width.
        <div className="voter-badge-row absolute -top-[8px] -left-1 right-1.5 z-10 flex items-center gap-1 overflow-hidden pointer-events-none">
          {withGroupLabel && (
            <VoterGroupLabel country={country} stageId={stageId} inline />
          )}
          {channelMode && <VoterChannelBadge mode={channelMode} />}
        </div>
      )}
      <div className="relative flex items-center gap-2 flex-1 min-w-0 h-8">
        {index !== undefined && (
          <h4 className="text-white text-lg font-medium tabular-nums">
            {(index + 1).toString().padStart(2, '0')}
          </h4>
        )}

        <img
          loading="lazy"
          src={logo}
          alt={`${country.name} flag`}
          className={`flex-none rounded-sm pointer-events-none ${
            isExisting ? 'w-7 h-7' : 'w-7 h-5 object-cover'
          }`}
          width={28}
          height={28}
          onError={(e) => {
            e.currentTarget.src = getFlagPath('ww');
          }}
        />
        <span
          className="text-white text-[0.94rem] font-medium truncate"
          title={country.name}
        >
          {label || country.name}
        </span>
      </div>
      {showChannelControls && channelMode && onChannelModeChange && (
        <VoterChannelToggles
          mode={channelMode}
          onChange={onChannelModeChange}
        />
      )}
    </CustomSortableItem>
  );
};
