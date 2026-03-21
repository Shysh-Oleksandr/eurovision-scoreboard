import React from 'react';

import { VoterGroupLabel } from './VoterGroupLabel';

import { CustomSortableItem } from '@/components/common/CustomSortableItem';
import { getFlagPath } from '@/helpers/getFlagPath';
import { BaseCountry } from '@/models';
import { useGeneralStore } from '@/state/generalStore';
import { getHostingCountryLogo } from '@/theme/hosting';

interface CountrySortableItemProps {
  id: string;
  country: BaseCountry;
  stageId: string;
  label?: string;
  withGroupLabel?: boolean;
  onRemove?: () => void;
  index?: number;
}

export const CountrySortableItem: React.FC<CountrySortableItemProps> = ({
  id,
  country,
  stageId,
  label,
  withGroupLabel = true,
  onRemove,
  index,
}) => {
  const shouldShowHeartFlagIcon = useGeneralStore(
    (state) => state.settings.shouldShowHeartFlagIcon,
  );

  const { logo, isExisting } = getHostingCountryLogo(
    country,
    shouldShowHeartFlagIcon,
  );

  return (
    <CustomSortableItem id={id} key={id} onRemove={onRemove}>
      {withGroupLabel && (
        <VoterGroupLabel country={country} stageId={stageId} />
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
    </CustomSortableItem>
  );
};
