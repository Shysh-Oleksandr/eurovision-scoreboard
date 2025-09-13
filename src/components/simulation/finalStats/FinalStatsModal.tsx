import React, { Suspense, useEffect, useMemo, useState } from 'react';

import Modal from '../../common/Modal/Modal';
import Tabs, { TabContent } from '../../common/tabs/Tabs';

import StatsHeader from './StatsHeader';
import StatsTable from './StatsTable';
import { useFinalStats } from './useFinalStats';

import ModalBottomCloseButton from '@/components/common/Modal/ModalBottomCloseButton';
import { StatsTableType } from '@/models';
import { useScoreboardStore } from '@/state/scoreboardStore';

const ShareStatsModal = React.lazy(() => import('../share/ShareStatsModal'));
const SplitStats = React.lazy(() => import('./SplitStats'));
const SummaryStats = React.lazy(() => import('./SummaryStats'));

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

// Map FinalStatsTab to StatsTableType
const getStatsTableType = (tab: FinalStatsTab): StatsTableType => {
  switch (tab) {
    case FinalStatsTab.BREAKDOWN:
      return StatsTableType.BREAKDOWN;
    case FinalStatsTab.SPLIT:
      return StatsTableType.SPLIT;
    case FinalStatsTab.SUMMARY:
      return StatsTableType.SUMMARY;
    default:
      return StatsTableType.BREAKDOWN;
  }
};

interface FinalStatsModalProps {
  isOpen: boolean;
  onClose: () => void;
  onLoaded: () => void;
}

const FinalStatsModal: React.FC<FinalStatsModalProps> = ({
  isOpen,
  onClose,
  onLoaded,
}) => {
  const viewedStageId = useScoreboardStore((state) => state.viewedStageId);
  const [activeTab, setActiveTab] = useState(FinalStatsTab.BREAKDOWN);
  const [isShareModalOpen, setIsShareModalOpen] = useState(false);
  const [isShareModalLoaded, setIsShareModalLoaded] = useState(false);

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

  // Image generation hook
  const statsTableType = getStatsTableType(activeTab);

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
          <Suspense
            fallback={
              <div className="text-white text-center py-2 font-medium">
                Loading...
              </div>
            }
          >
            {activeTab === FinalStatsTab.SPLIT && (
              <SplitStats
                rankedCountries={rankedCountries}
                selectedStage={selectedStage}
                getPoints={getPoints}
              />
            )}
          </Suspense>
        ),
      },
      {
        ...tabs[2],
        content: (
          <Suspense
            fallback={
              <div className="text-white text-center py-2 font-medium">
                Loading...
              </div>
            }
          >
            {activeTab === FinalStatsTab.SUMMARY && (
              <SummaryStats
                rankedCountries={rankedCountries}
                selectedStage={selectedStage}
                getPoints={getPoints}
              />
            )}
          </Suspense>
        ),
      },
    ],
    [
      rankedCountries,
      getCellPoints,
      getCellClassName,
      getPoints,
      selectedStageId,
      selectedVoteType,
      activeTab,
      selectedStage,
    ],
  );

  const handleShareClick = () => {
    setIsShareModalOpen(true);
  };

  useEffect(() => {
    if (!isOpen) return;

    setSelectedStageId(viewedStageId);
    onLoaded();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen, viewedStageId, setSelectedStageId]);

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      containerClassName="!w-[min(100%,_95vw)]"
      contentClassName="!py-4 !px-2 text-white sm:h-[75vh] h-[70vh] narrow-scrollbar relative"
      overlayClassName="!z-[1001]"
      topContent={
        <Tabs
          tabs={tabs}
          activeTab={activeTab}
          setActiveTab={(tab) => setActiveTab(tab as FinalStatsTab)}
          containerClassName="!rounded-none"
        />
      }
      bottomContent={<ModalBottomCloseButton onClose={onClose} />}
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
        handleShareClick={handleShareClick}
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

      {/* Share Stats Modal */}
      {(isShareModalOpen || isShareModalLoaded) && (
        <Suspense fallback={null}>
          <ShareStatsModal
            isOpen={isShareModalOpen}
            onClose={() => setIsShareModalOpen(false)}
            onLoaded={() => setIsShareModalLoaded(true)}
            activeTab={statsTableType}
            rankedCountries={rankedCountries}
            selectedStageId={selectedStageId}
            selectedVoteType={selectedVoteType}
            getCellPoints={getCellPoints}
            getCellClassName={getCellClassName}
            getPoints={getPoints}
            selectedStage={selectedStage}
          />
        </Suspense>
      )}
    </Modal>
  );
};

export default FinalStatsModal;
