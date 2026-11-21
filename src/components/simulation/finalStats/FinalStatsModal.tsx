'use client';
import { X } from 'lucide-react';
import { useTranslations } from 'next-intl';
import React, {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';

import dynamic from 'next/dynamic';

import Modal from '../../common/Modal/Modal';

import BreakdownView from './BreakdownView';
import SplitView, { SplitList } from './SplitView';
import { buildStageRankings } from './statsRankings';
import StatsSegmented from './StatsSegmented';
import StatsStagePicker from './StatsStagePicker';
import SummaryView from './SummaryView';
import { useFinalStats } from './useFinalStats';

import { ShareIcon } from '@/assets/icons/ShareIcon';
import Button from '@/components/common/Button';
import {
  buildExportSectionsForStageVotes,
  downloadVoteSpreadsheet,
} from '@/components/setup/voting-predefinition/voteSpreadsheet';
import { VoteSpreadsheetButtons } from '@/components/setup/voting-predefinition/VoteSpreadsheetButtons';
import { toast } from '@/helpers/toast';
import { fitStepAttributes, useFitStep } from '@/hooks/useFitStep';
import { Country, StageVotingType, StatsTableType } from '@/models';
import { playHaptic } from '@/native/haptics';
import { IS_NATIVE_APP } from '@/native/platform';
import { useCountriesStore } from '@/state/countriesStore';
import { useScoreboardStore } from '@/state/scoreboardStore';

const ShareStatsModal = dynamic(() => import('../share/ShareStatsModal'), {
  ssr: false,
});

enum FinalStatsTab {
  SUMMARY = 'Summary',
  SPLIT = 'Split',
  BREAKDOWN = 'Breakdown',
}

const TAB_ORDER = [
  FinalStatsTab.SUMMARY,
  FinalStatsTab.SPLIT,
  FinalStatsTab.BREAKDOWN,
];

const TABLE_TYPES: Record<FinalStatsTab, StatsTableType> = {
  [FinalStatsTab.SUMMARY]: StatsTableType.SUMMARY,
  [FinalStatsTab.SPLIT]: StatsTableType.SPLIT,
  [FinalStatsTab.BREAKDOWN]: StatsTableType.BREAKDOWN,
};

/** The controls row: everything on one line, else the switch on its own. */
const CONTROL_STEPS = [{ layout: 'row' }, { layout: 'stack' }] as const;

interface FinalStatsModalProps {
  isOpen: boolean;
  onClose: () => void;
  onLoaded: () => void;
}

/**
 * A finished stage's stats: Summary (the result with its jury and televote
 * split, the view it opens on), Split (the three rankings side by side) and
 * Breakdown (every voter's points to every entry). The views are the
 * modal's own; the share image draws the same data with `SummaryStats`,
 * `SplitStats` and `StatsTable` (graphics `StatsElement`).
 */
const FinalStatsModal: React.FC<FinalStatsModalProps> = ({
  isOpen,
  onClose,
  onLoaded,
}) => {
  const t = useTranslations('simulation.finalStats');
  const tCommon = useTranslations('common');
  const tHeader = useTranslations('simulation.header');

  const viewedStageId = useScoreboardStore((state) => state.viewedStageId);
  const predefinedVotes = useScoreboardStore((state) => state.predefinedVotes);
  const getStageVotingCountries = useCountriesStore(
    (state) => state.getStageVotingCountries,
  );
  const [activeTab, setActiveTab] = useState(FinalStatsTab.SUMMARY);
  // Views mount on their first visit and then stay (hidden), keeping their
  // scroll positions.
  const [visitedTabs, setVisitedTabs] = useState(
    () => new Set([FinalStatsTab.SUMMARY]),
  );
  const [splitList, setSplitList] = useState<SplitList>('total');
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

  const rankings = useMemo(
    () => buildStageRankings(selectedStage, rankedCountries, getPoints),
    [selectedStage, rankedCountries, getPoints],
  );

  const tabLabels: Record<FinalStatsTab, string> = {
    [FinalStatsTab.SUMMARY]: t('summary'),
    [FinalStatsTab.SPLIT]: t('split'),
    [FinalStatsTab.BREAKDOWN]: t('breakdown'),
  };

  const selectTab = (tab: FinalStatsTab) => {
    if (tab !== activeTab) playHaptic({ id: 'selection' });
    setActiveTab(tab);
  };

  // Whatever moves the tab (the tabs, the share modal's table switch), the
  // view it lands on stays mounted from then on.
  useEffect(() => {
    setVisitedTabs((visited) =>
      visited.has(activeTab) ? visited : new Set(visited).add(activeTab),
    );
  }, [activeTab]);

  const isViewMounted = (tab: FinalStatsTab) =>
    tab === activeTab || visitedTabs.has(tab);

  const tabRefs = useRef<(HTMLButtonElement | null)[]>([]);
  const handleTabKeyDown = (event: React.KeyboardEvent) => {
    const step =
      event.key === 'ArrowRight' ? 1 : event.key === 'ArrowLeft' ? -1 : 0;

    if (!step) return;
    event.preventDefault();
    const index =
      (TAB_ORDER.indexOf(activeTab) + step + TAB_ORDER.length) %
      TAB_ORDER.length;

    selectTab(TAB_ORDER[index]);
    tabRefs.current[index]?.focus();
  };

  const controlsRef = useRef<HTMLDivElement>(null);
  const controlStep = useFitStep(controlsRef, CONTROL_STEPS);

  const handleShareClick = () => {
    setIsShareModalOpen(true);
  };

  const handleExportSpreadsheet = useCallback(async () => {
    if (!selectedStage || !selectedStageId) return;

    const voters = getStageVotingCountries(selectedStageId, {
      fromScoreboard: false,
      channel: 'all',
    });
    const votes = predefinedVotes[selectedStageId];

    const getParticipantTotal = (
      code: string,
      source: 'jury' | 'televote' | 'combined',
    ) => {
      const country = rankedCountries.find((entry) => entry.code === code) as
        | Country
        | undefined;

      if (!country) return 0;

      return getPoints(country, source);
    };

    const sections = buildExportSectionsForStageVotes({
      stageName: selectedStage.name,
      votingMode: selectedStage.votingMode,
      participants: rankedCountries.map((country) => ({
        code: country.code,
        name: country.name,
        rank: country.rank,
      })),
      voters: voters.map((voter) => ({ code: voter.code, name: voter.name })),
      votes,
      getParticipantTotal,
    });

    const filename = `${selectedStage.name}-breakdown`
      .replace(/[^\w.-]+/g, '-')
      .replace(/-+/g, '-');

    await downloadVoteSpreadsheet({ filename, sections });
    toast.success(t('spreadsheetExportSuccess'));
  }, [
    getPoints,
    getStageVotingCountries,
    predefinedVotes,
    rankedCountries,
    selectedStage,
    selectedStageId,
    t,
  ]);

  useEffect(() => {
    if (!isOpen) return;

    setSelectedStageId(viewedStageId);
    onLoaded();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen, viewedStageId, setSelectedStageId]);

  const channelOptions = [
    { value: 'Total' as const, label: totalBadgeLabel },
    ...voteTypeOptions.map((type) => ({
      value: type,
      label: type === StageVotingType.JURY ? t('jury') : t('televote'),
    })),
  ];

  const topBar = (
    <header className="dp-stats-head flex items-center gap-2 2cols:gap-3 px-3 py-2.5 2cols:px-4 2cols:py-3">
      <div
        role="tablist"
        aria-label={t('statsViews')}
        onKeyDown={handleTabKeyDown}
        className="dp-sim-seg flex flex-1 2cols:flex-none 2cols:w-[min(100%,440px)] gap-0.5 rounded-xl p-[3px]"
      >
        {TAB_ORDER.map((tab, index) => {
          const isOn = tab === activeTab;

          return (
            <button
              key={tab}
              ref={(el) => {
                tabRefs.current[index] = el;
              }}
              type="button"
              role="tab"
              aria-selected={isOn}
              tabIndex={isOn ? 0 : -1}
              onClick={() => selectTab(tab)}
              className={`${
                isOn ? 'is-on' : 'text-white/70 hover:text-white'
              } h-[40px] 2cols:h-[36px] min-w-0 flex-auto truncate rounded-[9px] px-2.5 2cols:px-3 text-[14px] font-bold transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-accent`}
            >
              {tabLabels[tab]}
            </button>
          );
        })}
      </div>
      <div className="hidden 2cols:flex items-center gap-2 ml-auto">
        <Button
          variant="cta"
          size="md"
          onClick={handleShareClick}
          Icon={<ShareIcon className="size-[17px]" />}
        >
          {tHeader('share')}
        </Button>
        <button
          type="button"
          onClick={onClose}
          aria-label={tCommon('close')}
          title={tCommon('close')}
          className="dp-icon-btn size-10 rounded-xl grid place-items-center flex-none focus-visible:outline focus-visible:outline-2 focus-visible:outline-accent"
        >
          <X className="size-[18px]" />
        </button>
      </div>
    </header>
  );

  // Phones: the actions sit under the thumb.
  const footer = (
    <footer className="dp-stats-foot 2cols:hidden flex items-center gap-2 px-3.5 pt-2.5 pb-[calc(10px+var(--modal-safe-bottom,0px))]">
      <Button variant="surface" size="lg" className="flex-1" onClick={onClose}>
        {tCommon('close')}
      </Button>
      <Button
        variant="cta"
        size="lg"
        className="flex-1 justify-center"
        onClick={handleShareClick}
        Icon={<ShareIcon className="size-[18px]" />}
      >
        {tHeader('share')}
      </Button>
    </footer>
  );

  const viewClass = (tab: FinalStatsTab) =>
    tab === activeTab ? 'h-full' : 'hidden';

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      containerClassName="dp-hub dp-stats-surface 2cols:!w-[calc(100%-2.5rem)] !max-w-[1240px] !mx-0 !rounded-2xl"
      contentClassName="!p-0 !overflow-hidden flex flex-col 2cols:!h-[calc(100dvh-150px)] 2cols:!min-h-[420px] 2cols:!max-h-[880px]"
      overlayClassName="!z-[1001]"
      unstyledSurface
      fullScreenOnPhone
      withBlur
      topContent={topBar}
      bottomContent={footer}
    >
      <div className="dp-stats flex flex-1 min-h-0 flex-col">
        <div className="px-3 2cols:px-4 pt-3 pb-2.5">
          <div
            ref={controlsRef}
            className="dp-stats-controls"
            {...fitStepAttributes(CONTROL_STEPS[controlStep])}
          >
            <StatsStagePicker
              stages={finishedStages}
              selectedStageId={selectedStageId}
              onSelect={(id) => {
                setSelectedStageId(id);
                setSelectedVoteType('Total');
              }}
            />
            {activeTab === FinalStatsTab.BREAKDOWN &&
              voteTypeOptions.length > 0 && (
                <StatsSegmented
                  value={selectedVoteType}
                  options={channelOptions}
                  onChange={setSelectedVoteType}
                  ariaLabel={t('channel')}
                  className="dp-stats-switch"
                />
              )}
            {activeTab === FinalStatsTab.SPLIT && rankings.hasSplit && (
              <StatsSegmented
                value={splitList}
                options={[
                  { value: 'total', label: t('total') },
                  { value: 'jury', label: t('jury') },
                  { value: 'televote', label: t('televote') },
                ]}
                onChange={setSplitList}
                ariaLabel={t('channel')}
                className="dp-stats-switch dp-stats-split-switch"
              />
            )}
            {/* Spreadsheet export is website-only (no native file download). */}
            {activeTab === FinalStatsTab.BREAKDOWN && !IS_NATIVE_APP && (
              <VoteSpreadsheetButtons
                showImport={false}
                onExport={handleExportSpreadsheet}
                className="dp-stats-export"
              />
            )}
          </div>
        </div>

        {selectedStage ? (
          <div className="flex-1 min-h-0">
            {isViewMounted(FinalStatsTab.SUMMARY) && (
              <div className={viewClass(FinalStatsTab.SUMMARY)}>
                <SummaryView rankings={rankings} getPoints={getPoints} />
              </div>
            )}
            {isViewMounted(FinalStatsTab.SPLIT) && (
              <div className={viewClass(FinalStatsTab.SPLIT)}>
                <SplitView
                  rankings={rankings}
                  getPoints={getPoints}
                  show={splitList}
                />
              </div>
            )}
            {isViewMounted(FinalStatsTab.BREAKDOWN) && (
              <div className={viewClass(FinalStatsTab.BREAKDOWN)}>
                <BreakdownView
                  stage={selectedStage}
                  voteType={selectedVoteType}
                  rankedCountries={rankedCountries}
                  getPoints={getPoints}
                  getCellPoints={getCellPoints}
                  votes={
                    selectedStageId ? predefinedVotes[selectedStageId] : null
                  }
                />
              </div>
            )}
          </div>
        ) : (
          <p className="m-0 p-8 text-center text-[13px] font-semibold text-white/60">
            {t('noFinishedStages')}
          </p>
        )}
      </div>

      {(isShareModalOpen || isShareModalLoaded) && (
        <ShareStatsModal
          isOpen={isShareModalOpen}
          onClose={() => setIsShareModalOpen(false)}
          onLoaded={() => setIsShareModalLoaded(true)}
          activeTab={TABLE_TYPES[activeTab]}
          // The share modal's Table switch moves this modal's tab with it.
          tableOptions={TAB_ORDER.map((tab) => TABLE_TYPES[tab])}
          onTableChange={(table) =>
            setActiveTab(
              TAB_ORDER.find((tab) => TABLE_TYPES[tab] === table) ?? activeTab,
            )
          }
          rankedCountries={rankedCountries}
          selectedStageId={selectedStageId}
          selectedVoteType={selectedVoteType}
          getCellPoints={getCellPoints}
          getCellClassName={getCellClassName}
          getPoints={getPoints}
          selectedStage={selectedStage}
        />
      )}
    </Modal>
  );
};

export default FinalStatsModal;
