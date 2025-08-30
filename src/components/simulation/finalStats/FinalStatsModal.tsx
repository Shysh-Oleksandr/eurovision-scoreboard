import React, { useEffect, useMemo, useState } from 'react';

import Button from '../../common/Button';
import Modal from '../../common/Modal/Modal';
import Tabs, { TabContent } from '../../common/tabs/Tabs';

import SplitStats from './SplitStats';
import StatsHeader from './StatsHeader';
import StatsTable from './StatsTable';
import SummaryStats from './SummaryStats';
import { useFinalStats } from './useFinalStats';

import { useScoreboardStore } from '@/state/scoreboardStore';

enum FinalStatsTab {
  BREAKDOWN = 'Breakdown',
  SPLIT = 'Split',
  SUMMARY = 'Summary',
}

const tabs = [
  { value: FinalStatsTab.BREAKDOWN, label: 'Breakdown' },
  { value: FinalStatsTab.SPLIT, label: 'Split' },
  { value: FinalStatsTab.SUMMARY, label: 'Summary' },
];

interface FinalStatsModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const FinalStatsModal: React.FC<FinalStatsModalProps> = ({
  isOpen,
  onClose,
}) => {
  const viewedStageId = useScoreboardStore((state) => state.viewedStageId);
  const [activeTab, setActiveTab] = useState(FinalStatsTab.BREAKDOWN);

  const {
    finishedStages,
    selectedStage,
    selectedStageId,
    setSelectedStageId,
    selectedVoteType,
    setSelectedVoteType,
    voteTypeOptions,
    totalBadgeLabel,
    rankedCountries,
    getPoints,
    getCellPoints,
    getCellClassName,
  } = useFinalStats();

  const tabsWithContent = useMemo(
    () => [
      {
        ...tabs[0],
        content: (
          <StatsTable
            rankedCountries={rankedCountries}
            getCellPoints={getCellPoints}
            getCellClassName={getCellClassName}
            getPoints={getPoints}
            selectedStageId={selectedStageId}
            selectedVoteType={selectedVoteType}
          />
        ),
      },
      {
        ...tabs[1],
        content: (
          <SplitStats
            rankedCountries={rankedCountries}
            selectedStage={selectedStage}
            getPoints={getPoints}
          />
        ),
      },
      {
        ...tabs[2],
        content: (
          <SummaryStats
            rankedCountries={rankedCountries}
            selectedStage={selectedStage}
            getPoints={getPoints}
          />
        ),
      },
    ],
    [
      selectedStageId,
      selectedVoteType,
      selectedStage,
      rankedCountries,
      getCellPoints,
      getCellClassName,
      getPoints,
    ],
  );

  useEffect(() => {
    if (!isOpen) return;

    setSelectedStageId(viewedStageId);
  }, [isOpen, viewedStageId, setSelectedStageId]);

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      containerClassName="!w-[min(100%,_95vw)]"
      contentClassName="!py-4 !px-2 text-white h-[75vh] narrow-scrollbar"
      overlayClassName="!z-[1001]"
      topContent={
        <Tabs
          tabs={tabs}
          activeTab={activeTab}
          setActiveTab={(tab) => setActiveTab(tab as FinalStatsTab)}
          containerClassName="!rounded-none"
        />
      }
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
        hideVoteTypeOptions={activeTab !== FinalStatsTab.BREAKDOWN}
      />

      {selectedStage ? (
        <TabContent
          tabs={tabsWithContent}
          activeTab={activeTab}
          preserveContent
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
