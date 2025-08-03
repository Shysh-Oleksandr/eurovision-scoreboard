import React from 'react';

import { CustomSortableItem } from '@/components/common/CustomSortableItem';
import { getFlagPath } from '@/helpers/getFlagPath';
import { BaseCountry } from '@/models';

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
  return (
    <CustomSortableItem id={id} key={id} onRemove={onRemove}>
      <div className="flex items-center gap-2 flex-1 min-w-0 h-8">
        <img
          src={country.flag || getFlagPath(country)}
          alt={`${country.name} flag`}
          className="w-7 h-5 object-cover flex-none rounded-sm pointer-events-none"
          width={28}
          height={20}
          loading="lazy"
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
