import React from 'react';

import Image from 'next/image';

import { CustomSortableItem } from '@/components/common/CustomSortableItem';
import { getFlagPath } from '@/helpers/getFlagPath';
import { BaseCountry } from '@/models';
import { useGeneralStore } from '@/state/generalStore';
import { getHostingCountryLogo } from '@/theme/hosting';

interface VoterItemProps {
  id: string;
  country: BaseCountry;
  onRemove: () => void;
}

export const VoterItem: React.FC<VoterItemProps> = ({
  id,
  country,
  onRemove,
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
      <div className="flex items-center gap-2 flex-1 min-w-0 h-8">
        <Image
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
          {country.name}
        </span>
      </div>
    </CustomSortableItem>
  );
};
