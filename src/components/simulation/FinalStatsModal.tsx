import React from 'react';

import Button from '../common/Button';
import Modal from '../common/Modal/Modal';

import StatsHeader from './finalStats/StatsHeader';
import StatsTable from './finalStats/StatsTable';
import { useFinalStats } from './finalStats/useFinalStats';

interface FinalStatsModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const FinalStatsModal: React.FC<FinalStatsModalProps> = ({
  isOpen,
  onClose,
}) => {
  const {
    finishedStages,
    selectedStage,
    selectedStageId,
    setSelectedStageId,
    selectedVoteType,
    setSelectedVoteType,
    voteTypeOptions,
    totalBadgeLabel,
    votingCountries,
    rankedCountries,
    getPoints,
    getCellPoints,
    getCellClassName,
  } = useFinalStats();

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      containerClassName="!w-[min(100%,_95vw)]"
      contentClassName="!py-4 !px-2 text-white h-[85vh] narrow-scrollbar"
      overlayClassName="!z-[1001]"
      bottomContent={
        <div className="bg-primary-900 p-4 z-30">
          <Button className="md:text-base text-sm w-full" onClick={onClose}>
            Close
          </Button>
        </div>
      }
    >
      <StatsHeader
        finishedStages={finishedStages}
        selectedStageId={selectedStageId}
        setSelectedStageId={setSelectedStageId}
        selectedVoteType={selectedVoteType}
        setSelectedVoteType={setSelectedVoteType}
        voteTypeOptions={voteTypeOptions}
        totalBadgeLabel={totalBadgeLabel}
      />

      {selectedStage ? (
        <StatsTable
          rankedCountries={rankedCountries}
          votingCountries={votingCountries}
          getCellPoints={getCellPoints}
          getCellClassName={getCellClassName}
          getPoints={getPoints}
        />
      ) : (
        <div className="text-center p-8 text-gray-400">
          No finished stages to display stats for.
        </div>
      )}
    </Modal>
  );
};

export default FinalStatsModal;
