import React from 'react';

import { InfoIcon } from '@/assets/icons/InfoIcon';
import { RestartIcon } from '@/assets/icons/RestartIcon';
import ShuffleIcon from '@/assets/icons/ShuffleIcon';
import SortAZIcon from '@/assets/icons/SortAZIcon';
import SortZAIcon from '@/assets/icons/SortZAIcon';
import Button from '@/components/common/Button';
import { Checkbox } from '@/components/common/Checkbox';
import { Tooltip } from '@/components/common/Tooltip';

interface VotersSelectionHeaderProps {
  onReset: () => void;
  onSort: (sort: 'az' | 'za' | 'shuffle') => void;
  syncVotersWithParticipants?: boolean;
  onSyncVotersChange: (sync: boolean) => void;
  votersAmount: number;
}

const VotersSelectionHeader: React.FC<VotersSelectionHeaderProps> = ({
  onReset,
  onSort,
  syncVotersWithParticipants = true,
  onSyncVotersChange,
  votersAmount,
}) => {
  return (
    <div className="flex flex-col">
      <div className="flex items-start gap-2">
        <Tooltip
          content={
            <div className="space-y-2 font-medium">
              <p>
                If enabled, when you remove or add a participant country, the
                voting countries will be updated automatically.
              </p>
              <p>
                If disabled, you will need to manually add or remove voting
                countries.
              </p>
            </div>
          }
          position="right"
        >
          <InfoIcon className="w-[20px] h-[20px] mt-[0.18rem] text-white/60 cursor-pointer" />
        </Tooltip>
        <Checkbox
          checked={syncVotersWithParticipants}
          onChange={(e) => onSyncVotersChange(e.target.checked)}
          id="sync-voters-checkbox"
          label="Sync voters with participant countries"
          labelClassName="text-white !px-0 !pt-1 !pb-3"
        />
      </div>
      <div className="flex gap-4 justify-between items-center">
        <div>
          <h3 className="text-base sm:text-lg font-semibold text-white">
            Voting Countries ({votersAmount})
          </h3>
          <p className="text-sm text-white/50 mb-2">Drag and drop to reorder</p>
        </div>

        <div className="flex items-center gap-2">
          <ActionButton
            onClick={() => onSort('az')}
            title="Sort A-Z"
            icon={<SortAZIcon className="w-5 h-5" />}
          />
          <ActionButton
            onClick={() => onSort('za')}
            title="Sort Z-A"
            icon={<SortZAIcon className="w-5 h-5" />}
          />
          <ActionButton
            onClick={() => onSort('shuffle')}
            title="Shuffle"
            icon={<ShuffleIcon className="w-5 h-5" />}
          />
          <ActionButton
            onClick={onReset}
            title="Restart"
            icon={<RestartIcon className="w-5 h-5" />}
          />
        </div>
      </div>
    </div>
  );
};

const ActionButton = ({
  onClick,
  title,
  icon,
}: {
  onClick: () => void;
  title: string;
  icon: React.ReactNode;
}) => {
  return (
    <Button
      onClick={onClick}
      className="!p-2.5"
      aria-label={title}
      title={title}
    >
      {icon}
    </Button>
  );
};

export default VotersSelectionHeader;
