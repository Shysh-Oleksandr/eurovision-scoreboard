import { useTranslations } from 'next-intl';
import React from 'react';

import { ArrowDown10 } from '@/assets/icons/ArrowDown10';
import { RestartIcon } from '@/assets/icons/RestartIcon';
import SortAZIcon from '@/assets/icons/SortAZIcon';
import Badge from '@/components/common/Badge';
import Button from '@/components/common/Button';
import { PREDEFINED_SYSTEMS_MAP } from '@/data/data';
import { StageVotingType } from '@/models';

type Props = {
  stageName: string;
  totalBadgeLabel: string;
  pointsSystem: Array<{ id: number; value: number }>;
  selectedType: 'Total' | StageVotingType;
  setSelectedType: (t: 'Total' | StageVotingType) => void;
  voteTypeOptions: StageVotingType[];
  isSorting: boolean;
  setIsSorting: (v: boolean) => void;
  onReset: () => void;
  onRandomize: () => void;
};

export const VotingPredefinitionHeader: React.FC<Props> = ({
  stageName,
  totalBadgeLabel,
  pointsSystem,
  selectedType,
  setSelectedType,
  voteTypeOptions,
  isSorting,
  setIsSorting,
  onReset,
  onRandomize,
}) => {
  const t = useTranslations();

  return (
    <div className="sm:mb-1 gap-1 px-2">
      <div className="flex items-center justify-between md:gap-4 gap-2 flex-wrap">
        <div className="md:w-auto w-full">
          <div className="flex gap-4 items-center sm:justify-start justify-between">
            <h3 className="text-lg font-bold">{stageName}</h3>

            <div className="flex flex-wrap sm:gap-2 gap-1.5 items-center justify-end">
              <Badge
                label={totalBadgeLabel}
                onClick={() => setSelectedType('Total')}
                isActive={selectedType === 'Total'}
              />
              {voteTypeOptions.map((type) => (
                <Badge
                  key={type}
                  label={
                    type.charAt(0).toUpperCase() + type.slice(1).toLowerCase()
                  }
                  onClick={() => setSelectedType(type)}
                  isActive={selectedType === type}
                />
              ))}
            </div>
          </div>
          <p className="text-sm text-white/60 mt-1">
            {t(
              'setup.eventSetupModal.enterThePointsEachVotingCountryAwardsToParticipants',
            )}{' '}
            (
            {pointsSystem.every(
              (p, index) =>
                PREDEFINED_SYSTEMS_MAP['default'][index].value === p.value,
            )
              ? '1-8, 10, 12'
              : pointsSystem.map((p) => p.value).join(', ')}
            )
          </p>
        </div>

        <div className="flex gap-2 ml-auto">
          <Button
            onClick={() => setIsSorting(!isSorting)}
            className="!p-3"
            aria-label={isSorting ? 'Sort by name' : 'Sort by points'}
            title={isSorting ? 'Sort by name' : 'Sort by points'}
            Icon={
              isSorting ? (
                <SortAZIcon className="w-5 h-5" />
              ) : (
                <ArrowDown10 className="w-5 h-5" />
              )
            }
          />
          <Button
            variant="primary"
            onClick={onReset}
            className="!p-3"
            aria-label="Restart"
            title="Restart"
            Icon={<RestartIcon className="w-5 h-5" />}
          />
          <Button variant="primary" onClick={onRandomize} className="!px-4">
            {t('settings.odds.randomize')}
          </Button>
        </div>
      </div>
    </div>
  );
};

export default VotingPredefinitionHeader;
