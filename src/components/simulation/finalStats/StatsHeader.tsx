import React from 'react';

import { EventStage, StageVotingType } from '../../../models';
import Badge from '../../common/Badge';

interface StatsHeaderProps {
  finishedStages: EventStage[];
  selectedStageId: string | null;
  setSelectedStageId: (id: string) => void;
  selectedVoteType: 'Total' | StageVotingType;
  setSelectedVoteType: (type: 'Total' | StageVotingType) => void;
  voteTypeOptions: StageVotingType[];
  totalBadgeLabel: string;
}

const StatsHeader: React.FC<StatsHeaderProps> = ({
  finishedStages,
  selectedStageId,
  setSelectedStageId,
  selectedVoteType,
  setSelectedVoteType,
  voteTypeOptions,
  totalBadgeLabel,
}) => {
  return (
    <div className="flex flex-col gap-3 px-2">
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

      <div className="flex justify-center sm:gap-3 gap-2">
        <Badge
          label={totalBadgeLabel}
          onClick={() => setSelectedVoteType('Total')}
          isActive={selectedVoteType === 'Total'}
        />
        {voteTypeOptions.map((type) => (
          <Badge
            key={type}
            label={type.charAt(0).toUpperCase() + type.slice(1).toLowerCase()}
            onClick={() => setSelectedVoteType(type)}
            isActive={selectedVoteType === type}
          />
        ))}
      </div>
    </div>
  );
};

export default StatsHeader;
