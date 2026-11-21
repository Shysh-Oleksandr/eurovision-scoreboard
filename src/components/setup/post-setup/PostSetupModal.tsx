'use client';
import { useTranslations } from 'next-intl';
import React, {
  useCallback,
  useEffect,
  useId,
  useMemo,
  useRef,
  useState,
} from 'react';

import Modal from '../../common/Modal/Modal';

import {
  PostSetupFormContext,
  usePostSetupStageForm,
  useWatchVoterChannels,
  useWatchVotingCountries,
} from './hooks/usePostSetupStageForm';
import { useStageOddsOverrideDraft } from './hooks/useStageOddsOverrideDraft';
import { useStagePointsOverrideDraft } from './hooks/useStagePointsOverrideDraft';
import { RunningOrderTab, useRunningOrder } from './running-order';
import StageGeneralTab, { VOTING_MODE_LABEL_KEYS } from './StageGeneralTab';
import StageOddsTab from './StageOddsTab';
import StageSetupFooter from './StageSetupFooter';
import StageSetupHeader from './StageSetupHeader';
import { VoterChannelsErrorBar } from './VoterChannelsErrorBar';
import VotersTab from './voters/VotersTab';

import { PointsSystemController } from '@/components/settings/pointsSystem/useGlobalPointsSystemController';
import { OddsController } from '@/components/settings/useGlobalOddsController';
import ShareResultsModal from '@/components/simulation/share/ShareResultsModal';
import { toast } from '@/helpers/toast';
import { useConfirmation } from '@/hooks/useConfirmation';
import { useEffectOnce } from '@/hooks/useEffectOnce';
import { EventStage, StageOverrides, StageVotingMode } from '@/models';
import { useShortcut } from '@/shortcuts/registry';
import { useCountriesStore } from '@/state/countriesStore';
import { useGeneralStore } from '@/state/generalStore';
import { createCountriesComparator } from '@/state/scoreboard/helpers';
import {
  filterVotersByChannel,
  normalizeVoterChannels,
} from '@/state/scoreboard/voterChannels';
import { useScoreboardStore } from '@/state/scoreboardStore';

const TABS = ['runningOrder', 'voters', 'odds', 'general'] as const;

type StageTab = (typeof TABS)[number];

interface PostSetupModalProps {
  isOpen: boolean;
  onClose: () => void;
  stage: EventStage;
  onLoaded?: () => void;
  onSave: () => void;
}

/**
 * Stage setup, opened by Start before each stage: the libraries' frame (the
 * stage's name, Running order / Voters / Odds / General as a segmented
 * well, ×) and a footer that reads the stage back beside Start. Every tab
 * edits a draft; Start saves them all, and closing asks first only when
 * something changed.
 */
const PostSetupModal: React.FC<PostSetupModalProps> = ({
  isOpen,
  onClose,
  stage,
  onLoaded,
  onSave,
}) => {
  const t = useTranslations('setup.eventStageModal');
  const tSetup = useTranslations('setup.stageSetup');
  const { confirm } = useConfirmation();
  const baseId = useId();
  const titleId = `${baseId}-title`;

  const [activeTab, setActiveTab] = useState<StageTab>('runningOrder');
  const [visited, setVisited] = useState<StageTab[]>([activeTab]);

  if (!visited.includes(activeTab)) setVisited([...visited, activeTab]);

  const [isShareModalOpen, setIsShareModalOpen] = useState(false);
  // Each open starts the tabs' own state afresh (lines, menus, channels).
  const [openCount, setOpenCount] = useState(0);

  useEffect(() => {
    if (isOpen) setOpenCount((count) => count + 1);
  }, [isOpen]);

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

  const ro = useRunningOrder({
    isOpen,
    stageId: stage.id,
    stageCountries: stage.countries,
    savedRunningOrder: configuredStage?.runningOrder,
    savedFirstHalfSize: configuredStage?.firstHalfSize,
  });
  const { orderedCodes, orderedCountries, firstHalfSize } = ro;

  const form = usePostSetupStageForm({
    stage,
    isOpen,
  });
  const watchedVotingCountries = useWatchVotingCountries(form);
  const watchedVoterChannels = useWatchVoterChannels(form);

  // Live validation: a Jury and Televote stage needs at least one voter per
  // channel. Never raised in other modes, where per-voter channels are paused.
  const channelError = useMemo<'jury' | 'televote' | null>(() => {
    if (localVotingMode !== StageVotingMode.JURY_AND_TELEVOTE) return null;
    if (watchedVotingCountries.length === 0) return null;

    const hasVoterIn = (channel: 'jury' | 'televote') =>
      filterVotersByChannel(
        watchedVotingCountries,
        channel,
        watchedVoterChannels,
      ).length > 0;

    if (!hasVoterIn('jury')) return 'jury';
    if (!hasVoterIn('televote')) return 'televote';

    return null;
  }, [localVotingMode, watchedVotingCountries, watchedVoterChannels]);

  const {
    controller: pointsController,
    getOverride,
    isOverridden: isPointsOverridden,
    resetToGlobal: resetPointsToGlobal,
  } = useStagePointsOverrideDraft(stage, isOpen);

  const {
    controller: oddsController,
    getOddsOverride,
    isOverridden: isOddsOverridden,
    resetToGlobal: resetOddsToGlobal,
  } = useStageOddsOverrideDraft(stage, isOpen);

  // ----- what changed since opening -----

  // Taken just before the first change of an open, so closing can tell
  // whether anything is different (Undo back to the start counts as none).
  const openedFingerprintRef = useRef<string | null>(null);

  useEffect(() => {
    if (isOpen) openedFingerprintRef.current = null;
  }, [isOpen]);

  const fingerprint = () => {
    const voters = form.getVotingCountries();

    return JSON.stringify([
      orderedCodes,
      firstHalfSize,
      voters.map((voter) => voter.code),
      normalizeVoterChannels(voters, form.getVoterChannels()) ?? null,
      localVotingMode,
      localEnablePredefined ?? null,
      getOverride() ?? null,
      getOddsOverride() ?? null,
    ]);
  };

  const touch = () => {
    if (openedFingerprintRef.current === null) {
      openedFingerprintRef.current = fingerprint();
    }
  };

  const isDirty = () =>
    openedFingerprintRef.current !== null &&
    openedFingerprintRef.current !== fingerprint();

  const requestClose = () => {
    if (!isDirty()) {
      onClose();

      return;
    }
    confirm({
      key: 'close-post-setup',
      type: 'alert',
      title: t('confirmCloseTitle'),
      description: t('confirmCloseDescription'),
      onConfirm: onClose,
    });
  };

  // The tabs' controllers, touching before each change.
  const touchedPoints: PointsSystemController = {
    ...pointsController,
    setPointsSystem: (points) => {
      touch();
      pointsController.setPointsSystem(points);
    },
    setTelevotePointsSystem: (points) => {
      touch();
      pointsController.setTelevotePointsSystem(points);
    },
    setSplitPointsSystem: (value) => {
      touch();
      pointsController.setSplitPointsSystem(value);
    },
    setAllowMultiplePointsToSameEntry: (value) => {
      touch();
      pointsController.setAllowMultiplePointsToSameEntry(value);
    },
  };

  const touchedOdds: OddsController = {
    ...oddsController,
    updateCountryOdds: (...args) => {
      touch();
      oddsController.updateCountryOdds(...args);
    },
    setBulkCountryOdds: (...args) => {
      touch();
      oddsController.setBulkCountryOdds(...args);
    },
    setRandomnessLevel: (...args) => {
      touch();
      oddsController.setRandomnessLevel(...args);
    },
    setPointsSpread: (...args) => {
      touch();
      oddsController.setPointsSpread(...args);
    },
    loadYearOdds: (...args) => {
      touch();
      oddsController.loadYearOdds(...args);
    },
  };

  const changeVotingMode = (mode: StageVotingMode) => {
    touch();
    setLocalVotingMode(mode);
  };

  // ----- start -----

  const handleSave = useCallback(() => {
    const votingCountries = form.getVotingCountries();
    const voterChannels = normalizeVoterChannels(
      votingCountries,
      form.getVoterChannels(),
    );
    const data = { votingCountries, voterChannels };

    if (votingCountries.length === 0) {
      toast.error(t('pleaseSelectAtLeastOneVotingCountry'));

      return;
    }

    // Start is disabled while the error bar is up; this guards the ⌘S path.
    if (channelError) {
      toast.error(
        tSetup(channelError === 'jury' ? 'noJuryVoter' : 'noTelevoteVoter'),
      );

      return;
    }

    onClose();

    setTimeout(() => {
      const runningOrder = orderedCodes;
      const pointsOverride = getOverride();
      const oddsOverride = getOddsOverride();

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

        if (oddsOverride) result.odds = oddsOverride;

        return Object.keys(result).length > 0 ? result : undefined;
      };
      const stageOverrides = buildOverrides();

      const halves = firstHalfSize === null ? undefined : { firstHalfSize };
      const updatedStages = configuredEventStages.map((s) =>
        s.id === stage.id
          ? {
              ...s,
              votingCountries: data.votingCountries,
              voterChannels: data.voterChannels,
              runningOrder,
              firstHalfSize: halves?.firstHalfSize,
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
              voterChannels: data.voterChannels,
              runningOrder,
              firstHalfSize: halves?.firstHalfSize,
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
  }, [
    t,
    tSetup,
    form,
    channelError,
    onClose,
    orderedCodes,
    firstHalfSize,
    getOverride,
    getOddsOverride,
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

  useEffectOnce(onLoaded);

  // ⌘S / Ctrl+S starts the stage, also while typing (it stays mounted).
  useShortcut('startStage', handleSave, isOpen);

  // ----- layout -----

  const tabs = useMemo(
    () => [
      {
        value: 'runningOrder' as const,
        label: (
          <>
            <span className="dp-ss-tab-long">{t('runningOrder')}</span>
            <span className="dp-ss-tab-short">
              {tSetup('tabRunningOrderShort')}
            </span>
          </>
        ),
      },
      { value: 'voters' as const, label: t('voters') },
      { value: 'odds' as const, label: t('odds') },
      { value: 'general' as const, label: t('general') },
    ],
    [t, tSetup],
  );

  const tabId = (tab: StageTab) => `${baseId}-tab-${tab}`;
  const panelId = (tab: StageTab) => `${baseId}-panel-${tab}`;

  const scrollPanel =
    'min-h-0 flex-1 overflow-y-auto overscroll-contain narrow-scrollbar';

  const renderTab = (tab: StageTab) => {
    switch (tab) {
      case 'runningOrder':
        return (
          <div className={scrollPanel}>
            <div className="px-3.5 pb-6 pt-3 2cols:px-[22px] 2cols:pt-4">
              <RunningOrderTab
                key={openCount}
                ro={ro}
                onTouch={touch}
                onShare={() => setIsShareModalOpen(true)}
              />
            </div>
          </div>
        );
      case 'voters':
        return (
          <VotersTab
            key={openCount}
            stage={stage}
            votingMode={localVotingMode}
            onTouch={touch}
          />
        );
      case 'odds':
        return (
          <div className={scrollPanel}>
            <div className="px-3.5 pb-5 2cols:px-[22px]">
              <StageOddsTab
                controller={touchedOdds}
                stage={stage}
                isOverridden={isOddsOverridden}
                onResetToGlobal={() => {
                  touch();
                  resetOddsToGlobal();
                }}
              />
            </div>
          </div>
        );
      default:
        return (
          <div className={scrollPanel}>
            <div className="px-3.5 pb-6 pt-4 2cols:px-[22px] 2cols:pt-5">
              <StageGeneralTab
                controller={touchedPoints}
                pointsOverridden={isPointsOverridden}
                onUseSettingsPoints={() => {
                  touch();
                  resetPointsToGlobal();
                }}
                votingMode={localVotingMode}
                onVotingModeChange={changeVotingMode}
                enablePredefinedVotes={localEnablePredefined}
                globalEnablePredefinedVotes={globalEnablePredefined}
                onEnablePredefinedVotesChange={(value) => {
                  touch();
                  setLocalEnablePredefined(value);
                }}
              />
            </div>
          </div>
        );
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={requestClose}
      unstyledSurface
      fullScreenOnPhone
      ariaLabelledBy={titleId}
      overlayClassName="!z-[1002]"
      containerClassName="dp-flat dp-ss-surface 2cols:!w-[min(100%,1040px)] 2cols:!max-w-[1040px] 2cols:!rounded-2xl"
      contentClassName="!p-0 !overflow-hidden flex flex-col text-white 2cols:!h-[calc(100dvh-240px)] 2cols:!max-h-[600px] 2cols:!min-h-[360px]"
      topContent={
        <StageSetupHeader
          title={stage.name}
          titleId={titleId}
          tabs={tabs}
          value={activeTab}
          onChange={setActiveTab}
          tabId={tabId}
          panelId={panelId}
          onClose={requestClose}
        />
      }
      bottomContent={
        <>
          {channelError && (
            <VoterChannelsErrorBar
              channel={channelError}
              onGiveAllBoth={() => {
                touch();
                form.setVoterChannels(undefined);
              }}
              onSwitchMode={() =>
                changeVotingMode(
                  channelError === 'jury'
                    ? StageVotingMode.TELEVOTE_ONLY
                    : StageVotingMode.JURY_ONLY,
                )
              }
            />
          )}
          <StageSetupFooter
            stageName={stage.name}
            entries={orderedCountries.length}
            voters={watchedVotingCountries.length}
            votingModeLabel={t(VOTING_MODE_LABEL_KEYS[localVotingMode])}
            onCancel={requestClose}
            onStart={handleSave}
            startDisabled={!!channelError}
          />
        </>
      }
    >
      <PostSetupFormContext.Provider value={form}>
        {TABS.map((tab) => (
          <div
            key={tab}
            id={panelId(tab)}
            role="tabpanel"
            aria-labelledby={tabId(tab)}
            hidden={tab !== activeTab}
            className={
              tab === activeTab ? 'flex min-h-0 flex-1 flex-col' : undefined
            }
          >
            {visited.includes(tab) && renderTab(tab)}
          </div>
        ))}
      </PostSetupFormContext.Provider>
      <ShareResultsModal
        isOpen={isShareModalOpen}
        onClose={() => setIsShareModalOpen(false)}
        onLoaded={() => {}}
        countriesOverride={orderedCountries}
        titleOverride={`${contestName} ${contestYear} - ${stage.name}`}
        subtitleOverride={t('runningOrder')}
        stageName={stage.name}
        isRunningOrder
      />
    </Modal>
  );
};

export default PostSetupModal;
