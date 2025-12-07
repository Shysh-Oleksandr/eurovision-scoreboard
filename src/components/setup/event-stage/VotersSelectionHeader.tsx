import { useTranslations } from 'next-intl';
import React from 'react';

import { ListRestartIcon } from '@/assets/icons/ListRestartIcon';
import { RestartIcon } from '@/assets/icons/RestartIcon';
import ShuffleIcon from '@/assets/icons/ShuffleIcon';
import SortAZIcon from '@/assets/icons/SortAZIcon';
import SortZAIcon from '@/assets/icons/SortZAIcon';
import Button from '@/components/common/Button';

interface VotersSelectionHeaderProps {
  onReset: () => void;
  onClearAll: () => void;
  onSort: (sort: 'az' | 'za' | 'shuffle') => void;
  handleFilter: (
    action: 'inStage' | 'otherStage' | 'allParticipants' | 'yearData',
  ) => void;
  votersAmount: number;
  disableLoadYearData: boolean;
}

const VotersSelectionHeader: React.FC<VotersSelectionHeaderProps> = ({
  onReset,
  onClearAll,
  onSort,
  votersAmount,
  handleFilter,
  disableLoadYearData,
}) => {
  const t = useTranslations();

  return (
    <div className="flex flex-col sm:gap-0 gap-1">
      <div className="flex justify-between flex-wrap items-center">
        <div>
          <h3 className="text-base sm:text-lg font-semibold text-white">
            {t('setup.eventStageModal.votingCountries', {
              count: votersAmount,
            })}
          </h3>
          <p className="text-sm text-white/50 mb-2">
            {t('setup.eventStageModal.dragAndDropToReorder')}
          </p>
        </div>

        <div className="flex items-center sm:gap-2 gap-1">
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
            title="Reset list"
            icon={<ListRestartIcon className="w-5 h-5" />}
          />
          <ActionButton
            onClick={onClearAll}
            title="Clear all"
            icon={<RestartIcon className="w-5 h-5" />}
          />
        </div>
      </div>
      <div className="flex items-center sm:gap-2 gap-1 flex-wrap">
        <Button
          className="!py-2 normal-case"
          variant="tertiary"
          onClick={() => handleFilter('yearData')}
          disabled={disableLoadYearData}
          label={t('common.loadYearData')}
        />
        <Button
          className="!py-2 normal-case"
          variant="tertiary"
          onClick={() => handleFilter('inStage')}
          label={t('setup.eventStageModal.inStageOnly')}
        />
        <Button
          className="!py-2 normal-case"
          variant="tertiary"
          onClick={() => handleFilter('otherStage')}
          label={t('setup.eventStageModal.otherStageOnly')}
        />
        <Button
          className="!py-2 normal-case"
          variant="tertiary"
          onClick={() => handleFilter('allParticipants')}
          label={t('setup.eventStageModal.allParticipants')}
        />
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
