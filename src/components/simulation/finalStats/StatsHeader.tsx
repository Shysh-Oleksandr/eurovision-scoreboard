import { useTranslations } from 'next-intl';
import React from 'react';

import { EventStage, StageVotingType } from '../../../models';
import Badge from '../../common/Badge';

import { ShareIcon } from '@/assets/icons/ShareIcon';
import Button from '@/components/common/Button';

interface StatsHeaderProps {
  finishedStages: EventStage[];
  selectedStageId: string | null;
  setSelectedStageId: (id: string) => void;
  selectedVoteType: 'Total' | StageVotingType;
  setSelectedVoteType: (type: 'Total' | StageVotingType) => void;
  voteTypeOptions: StageVotingType[];
  totalBadgeLabel: string;
  hideVoteTypeOptions?: boolean;
  handleShareClick: () => void;
}

const StatsHeader: React.FC<StatsHeaderProps> = ({
  finishedStages,
  selectedStageId,
  setSelectedStageId,
  selectedVoteType,
  setSelectedVoteType,
  voteTypeOptions,
  totalBadgeLabel,
  hideVoteTypeOptions = false,
  handleShareClick,
}) => {
  const t = useTranslations('simulation');
  // const isCombinedVoting = finishedStages.some(
  //   (stage) =>
  //     stage.id === selectedStageId &&
  //     stage.votingMode === StageVotingMode.COMBINED,
  // );

  return (
    <div className="flex sm:flex-row items-center flex-col justify-between sm:gap-2.5 gap-2 px-2 relative sm:mb-4 mb-2">
      <Button
        variant="tertiary"
        className="!px-4 z-20 h-fit sm:w-fit w-full justify-center"
        onClick={handleShareClick}
        Icon={<ShareIcon className="w-[20px] h-[20px]" />}
      >
        {t('header.share')}
      </Button>

      {/* TODO: the combined voting is not fully correct now */}
      {/* {isCombinedVoting && (
        <div className="absolute top-1 right-1">
          <Tooltip
            position="right"
            content={
              <div className="space-y-2 font-medium">
                <p>
                  In Combined voting, each country gets jury and televote
                  rankings separately.
                  <br />
                  These rankings are merged 50/50 — converted into points,
                  summed, and re-ranked — to decide the final points given.
                  <br />
                  <br />
                  This means a country’s combined total may differ from the sum
                  of separate jury and televote points, since only rankings —
                  not raw points — are used.
                </p>
              </div>
            }
          />
        </div>
      )} */}
      <div className="flex flex-col sm:gap-2.5 gap-2">
        <div className="flex justify-center sm:gap-3 gap-2 flex-wrap">
          {finishedStages.map((stage) => (
            <Badge
              key={stage.id}
              label={stage.name}
              onClick={() => {
                setSelectedStageId(stage.id);
                setSelectedVoteType('Total');
              }}
              isActive={selectedStageId === stage.id}
            />
          ))}
        </div>
        {!hideVoteTypeOptions && (
          <div className="flex justify-center sm:gap-3 gap-2">
            <Badge
              label={totalBadgeLabel}
              onClick={() => setSelectedVoteType('Total')}
              isActive={selectedVoteType === 'Total'}
            />
            {voteTypeOptions.map((type) => (
              <Badge
                key={type}
                label={
                  type.charAt(0).toUpperCase() + type.slice(1).toLowerCase()
                }
                onClick={() => setSelectedVoteType(type)}
                isActive={selectedVoteType === type}
              />
            ))}
          </div>
        )}
      </div>

      <Button
        variant="tertiary"
        className="!px-4 z-20 h-fit sm:block hidden invisible"
        onClick={() => {}}
        Icon={<ShareIcon className="w-[20px] h-[20px]" />}
      >
        {t('header.share')}
      </Button>
    </div>
  );
};

export default StatsHeader;
