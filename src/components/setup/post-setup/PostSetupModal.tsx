'use client';
import { useTranslations } from 'next-intl';
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { FormProvider } from 'react-hook-form';
import { toast } from 'react-toastify';

import Modal from '../../common/Modal/Modal';
import ModalBottomContent from '../../common/Modal/ModalBottomContent';
import Tabs, { TabContent } from '../../common/tabs/Tabs';

import EventStageVoters from './EventStageVoters';
import { usePostSetupStageForm } from './hooks/usePostSetupStageForm';
import { useStagePointsOverrideDraft } from './hooks/useStagePointsOverrideDraft';
import { RunningOrderTab, useRunningOrder } from './running-order';
import StageGeneralTab from './StageGeneralTab';

import { PlayIcon } from '@/assets/icons/PlayIcon';
import ShareResultsModal from '@/components/simulation/share/ShareResultsModal';
import { useEffectOnce } from '@/hooks/useEffectOnce';
import { useHotKey } from '@/hooks/useHotKey';
import { EventStage, StageOverrides, StageVotingMode } from '@/models';
import { useCountriesStore } from '@/state/countriesStore';
import { useGeneralStore } from '@/state/generalStore';
import { createCountriesComparator } from '@/state/scoreboard/helpers';
import { useScoreboardStore } from '@/state/scoreboardStore';

enum PostSetupModalTab {
  RUNNING_ORDER = 'Running Order',
  VOTERS = 'Voters',
  GENERAL = 'General',
}

interface PostSetupModalProps {
  isOpen: boolean;
  onClose: () => void;
  stage: EventStage;
  onLoaded?: () => void;
  onSave: () => void;
}

const PostSetupModal: React.FC<PostSetupModalProps> = ({
  isOpen,
  onClose,
  stage,
  onLoaded,
  onSave,
}) => {
  const t = useTranslations('setup.eventStageModal');
  const [activeTab, setActiveTab] = useState(PostSetupModalTab.RUNNING_ORDER);
  const [isShareModalOpen, setIsShareModalOpen] = useState(false);

  const [isVotersLoaded, setIsVotersLoaded] = useState(false);

  const [selectedLayout, setSelectedLayout] = useState<'list' | 'grid'>('grid');

  const [localVotingMode, setLocalVotingMode] = useState<StageVotingMode>(
    stage.votingMode,
  );
  const [localEnablePredefined, setLocalEnablePredefined] = useState<
    boolean | undefined
  >(stage.overrides?.enablePredefinedVotes);

  useEffect(() => {
    if (!isOpen) return;
    setLocalVotingMode(stage.votingMode);
    setLocalEnablePredefined(stage.overrides?.enablePredefinedVotes);
  }, [isOpen]); // eslint-disable-line react-hooks/exhaustive-deps

  const configuredEventStages = useCountriesStore(
    (state) => state.configuredEventStages,
  );
  const setConfiguredEventStages = useCountriesStore(
    (state) => state.setConfiguredEventStages,
  );
  const eventStages = useScoreboardStore((state) => state.eventStages);
  const setEventStages = useScoreboardStore((state) => state.setEventStages);
  const contestName = useGeneralStore((state) => state.settings.contestName);
  const contestYear = useGeneralStore((state) => state.settings.contestYear);
  const globalEnablePredefined = useGeneralStore(
    (state) => state.settings.enablePredefinedVotes,
  );

  const configuredStage = useMemo(
    () => configuredEventStages.find((s) => s.id === stage.id),
    [configuredEventStages, stage.id],
  );

  const {
    orderedCodes,
    orderedCountries,
    handleRunningOrderSortEnd,
    handleQuickSort,
  } = useRunningOrder({
    isOpen,
    stageId: stage.id,
    stageCountries: stage.countries,
    savedRunningOrder: configuredStage?.runningOrder,
  });

  const form = usePostSetupStageForm({
    stage,
    isOpen,
  });

  const { controller, getOverride } = useStagePointsOverrideDraft(
    stage,
    isOpen,
  );

  const tabs = useMemo(
    () => [
      { value: PostSetupModalTab.RUNNING_ORDER, label: t('runningOrder') },
      { value: PostSetupModalTab.VOTERS, label: t('voters') },
      { value: PostSetupModalTab.GENERAL, label: t('general') },
    ],
    [t],
  );

  const handleSave = useCallback(() => {
    form.handleSubmit((data) => {
      if (data.votingCountries.length === 0) {
        toast.error('Please add at least one voter');

        return;
      }

      onClose();

      setTimeout(() => {
        const runningOrder = orderedCodes;
        const pointsOverride = getOverride();

        const enablePredefinedOverride =
          localEnablePredefined !== undefined &&
          localEnablePredefined !== globalEnablePredefined
            ? localEnablePredefined
            : undefined;

        const buildOverrides = (): StageOverrides | undefined => {
          const result: StageOverrides = {};

          if (pointsOverride) result.pointsSystem = pointsOverride;

          if (enablePredefinedOverride !== undefined)
            result.enablePredefinedVotes = enablePredefinedOverride;

          return Object.keys(result).length > 0 ? result : undefined;
        };
        const stageOverrides = buildOverrides();

        const updatedStages = configuredEventStages.map((s) =>
          s.id === stage.id
            ? {
                ...s,
                votingCountries: data.votingCountries,
                runningOrder,
                votingMode: localVotingMode,
                overrides: stageOverrides,
              }
            : s,
        );
        const updatedEventStages = eventStages.map((s) =>
          s.id === stage.id
            ? {
                ...s,
                votingCountries: data.votingCountries,
                runningOrder,
                votingMode: localVotingMode,
                isJuryVoting: localVotingMode !== StageVotingMode.TELEVOTE_ONLY,
                countries: s.countries
                  .slice()
                  .sort(createCountriesComparator(runningOrder)),
                overrides: stageOverrides,
              }
            : s,
        );

        setConfiguredEventStages(updatedStages);
        setEventStages(updatedEventStages);

        onSave();
      }, 300);
    })();
  }, [
    form,
    onClose,
    orderedCodes,
    getOverride,
    localEnablePredefined,
    globalEnablePredefined,
    configuredEventStages,
    eventStages,
    setConfiguredEventStages,
    setEventStages,
    onSave,
    stage.id,
    localVotingMode,
  ]);

  const shareTitleOverride = `${contestName} ${contestYear} - ${stage.name}`;
  const shareSubtitleOverride = t('runningOrder');

  const renderContent = () => {
    const tabsWithContent = [
      {
        ...tabs[0],
        content: (
          <RunningOrderTab
            stageId={stage.id}
            orderedCountries={orderedCountries}
            selectedLayout={selectedLayout}
            setSelectedLayout={setSelectedLayout}
            onSortEnd={handleRunningOrderSortEnd}
            onQuickSort={handleQuickSort}
            onShare={() => setIsShareModalOpen(true)}
          />
        ),
      },
      {
        ...tabs[1],
        content: (
          <>
            {(activeTab === PostSetupModalTab.VOTERS || isVotersLoaded) && (
              <EventStageVoters
                stage={stage}
                onLoaded={() => setIsVotersLoaded(true)}
              />
            )}
          </>
        ),
      },
      {
        ...tabs[2],
        content: (
          <StageGeneralTab
            controller={controller}
            votingMode={localVotingMode}
            onVotingModeChange={setLocalVotingMode}
            enablePredefinedVotes={localEnablePredefined}
            globalEnablePredefinedVotes={globalEnablePredefined}
            onEnablePredefinedVotesChange={setLocalEnablePredefined}
          />
        ),
      },
    ];

    return (
      <TabContent
        tabs={tabsWithContent}
        activeTab={activeTab}
        preserveContent
      />
    );
  };

  useEffectOnce(onLoaded);

  useHotKey('s', handleSave);

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      onClosed={onClose}
      overlayClassName="!z-[1002]"
      containerClassName="!w-[min(100%,800px)]"
      contentClassName="h-[70vh] narrow-scrollbar !pt-2"
      topContent={
        <Tabs
          tabs={tabs}
          activeTab={activeTab}
          setActiveTab={(tab) => setActiveTab(tab as PostSetupModalTab)}
          containerClassName="!rounded-none"
        />
      }
      bottomContent={
        <ModalBottomContent
          onClose={onClose}
          onSave={handleSave}
          saveButtonIcon={<PlayIcon className="size-4" />}
          saveButtonText={t('startStage', { stageName: stage.name })}
        />
      }
    >
      <h3 className="text-xl font-semibold text-white middle-line after:bg-primary-800 before:bg-primary-800">
        {stage.name}
      </h3>
      <FormProvider {...(form as any)}>{renderContent()}</FormProvider>
      <ShareResultsModal
        isOpen={isShareModalOpen}
        onClose={() => setIsShareModalOpen(false)}
        onLoaded={() => {}}
        countriesOverride={orderedCountries}
        titleOverride={shareTitleOverride}
        subtitleOverride={shareSubtitleOverride}
        isRunningOrder
      />
    </Modal>
  );
};

export default PostSetupModal;
