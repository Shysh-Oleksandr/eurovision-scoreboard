'use client';
import { useTranslations } from 'next-intl';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { toast } from 'react-toastify';

import dynamic from 'next/dynamic';
import { useShallow } from 'zustand/shallow';

import {
  BaseCountry,
  CountryAssignmentGroup,
  EventStage,
  StageVotingMode,
} from '../../models';
import { useCountriesStore } from '../../state/countriesStore';
import { useScoreboardStore } from '../../state/scoreboardStore';
import Button from '../common/Button';
import Modal from '../common/Modal/Modal';
import { useContinueToNextPhase } from '../simulation/hooks/useContinueToNextPhase';

import { AvailableGroup } from './CountrySelectionListItem';
import { useCountryAssignments } from './hooks/useCountryAssignments';
import { useCustomCountryModal } from './hooks/useCustomCountryModal';
import { useInitialLineup } from './hooks/useInitialLineup';
import { useStageModalActions } from './hooks/useStageModalActions';
import NotParticipatingSection from './NotParticipatingSection';
import { SetupHeader } from './SetupHeader';
import { SyncCustomEntries } from './SyncCustomEntries';
import UnifiedStageSetup from './UnifiedStageSetup';
import { buildEventStagesFromAssignments } from './utils/buildEventStagesFromAssignments';
import { validateEventSetup } from './utils/eventValidation';
import ContestCard from './widgets-section/contests/ContestCard';
import { useApplyContestTheme } from './widgets-section/contests/hooks/useApplyContestTheme';
import WidgetsSection from './widgets-section/WidgetsSection';

import { useApplyContestMutation } from '@/api/contests';
import { PREDEFINED_SYSTEMS_MAP } from '@/data/data';
import {
  applyContestSnapshotToStores,
  LoadContestOptions,
} from '@/helpers/contestSnapshot';
import { useDebounce } from '@/hooks/useDebounce';
import { useGeneralStore } from '@/state/generalStore';
import { StageVotes } from '@/state/scoreboard/types';
import { useAuthStore } from '@/state/useAuthStore';

const EventStageModal = dynamic(() => import('./event-stage/EventStageModal'), {
  ssr: false,
});
const CustomCountryModal = dynamic(() => import('./CustomCountryModal'), {
  ssr: false,
});
const SettingsModal = dynamic(() => import('../settings/SettingsModal'), {
  ssr: false,
});
const VotingPredefinitionModal = dynamic(
  () => import('./voting-predefinition/VotingPredefinitionModal'),
  {
    ssr: false,
  },
);
const PostSetupModal = dynamic(() => import('./post-setup/PostSetupModal'), {
  ssr: false,
});
const StageReorderModal = dynamic(() => import('./StageReorderModal'), {
  ssr: false,
});
const LoadContestModal = dynamic(
  () => import('./widgets-section/contests/LoadContestModal'),
  {
    ssr: false,
  },
);

const EventSetupModal = () => {
  const t = useTranslations();

  const {
    eventSetupModalOpen,
    predefModalOpen,
    postSetupModalOpen,
    setEventSetupModalOpen,
    setPostSetupModalOpen,
    setPredefModalOpen,
    configuredEventStages,
    setConfiguredEventStages,
    currentSetupStageType,
    setCurrentSetupStageType,
  } = useCountriesStore(
    useShallow((state) => ({
      eventSetupModalOpen: state.eventSetupModalOpen,
      predefModalOpen: state.predefModalOpen,
      postSetupModalOpen: state.postSetupModalOpen,
      setEventSetupModalOpen: state.setEventSetupModalOpen,
      setPredefModalOpen: state.setPredefModalOpen,
      setPostSetupModalOpen: state.setPostSetupModalOpen,
      getAllCountries: state.getAllCountries,
      configuredEventStages: state.configuredEventStages,
      setConfiguredEventStages: state.setConfiguredEventStages,
      countryOdds: state.countryOdds,
      currentSetupStageType: state.currentSetupStageType,
      setCurrentSetupStageType: state.setCurrentSetupStageType,
    })),
  );

  const currentStageId = useScoreboardStore((state) => state.currentStageId);
  const startEvent = useScoreboardStore((state) => state.startEvent);
  const continueToNextPhase = useScoreboardStore(
    (state) => state.continueToNextPhase,
  );
  const setEventStages = useScoreboardStore((state) => state.setEventStages);
  const restartCounter = useScoreboardStore((state) => state.restartCounter);
  const winnerCountry = useScoreboardStore((state) => state.winnerCountry);

  const setPredefinedVotesForStage = useScoreboardStore(
    (state) => state.setPredefinedVotesForStage,
  );
  const settingsPointsSystem = useGeneralStore(
    (state) => state.settingsPointsSystem,
  );
  const isGfOnly = useGeneralStore((state) => state.isGfOnly);
  const setPointsSystem = useGeneralStore((state) => state.setPointsSystem);
  const enablePredefined = useGeneralStore(
    (state) => state.settings.enablePredefinedVotes,
  );
  const setIsContestsModalOpen = useGeneralStore(
    (state) => state.setIsContestsModalOpen,
  );

  const contestToLoad = useGeneralStore((state) => state.contestToLoad);
  const setContestToLoad = useGeneralStore((state) => state.setContestToLoad);
  const { clear } = useScoreboardStore.temporal.getState();

  const [isSettingsModalOpen, setIsSettingsModalOpen] = useState(false);
  const [isSettingsModalLoaded, setIsSettingsModalLoaded] = useState(false);
  const [isPredefModalLoaded, setIsPredefModalLoaded] = useState(false);
  const [isPostSetupModalLoaded, setIsPostSetupModalLoaded] = useState(false);
  const [isStageReorderModalOpen, setIsStageReorderModalOpen] = useState(false);
  const [initialSetupStage, setInitialSetupStage] = useState<EventStage | null>(
    null,
  );

  const {
    countryGroups: {
      eventStagesWithCountries,
      notParticipatingCountries,
      notQualifiedCountries,
    },
    handleCountryAssignment,
    handleBulkCountryAssignment,
    getCountryGroupAssignment,
    setAssignments,
    allAssignments,
  } = useCountryAssignments();

  const {
    isEventStageModalOpen,
    eventStageToEdit,
    handleOpenCreateEventStageModal,
    handleOpenEditEventStageModal,
    handleCloseEventStageModal,
    handleSaveStage,
    handleDeleteStage,
  } = useStageModalActions({ allAssignments, setAssignments });

  const {
    isCustomCountryModalOpen,
    countryToEdit,
    handleOpenCreateModal,
    handleOpenEditModal,
    handleCloseModal,
  } = useCustomCountryModal();

  const handleStageOrderChange = useCallback(
    (oldIndex: number, newIndex: number) => {
      // Get sorted stages
      const sortedStages = [...configuredEventStages].sort(
        (a, b) => (a.order ?? 0) - (b.order ?? 0),
      );

      // Calculate new order values based on positions
      // Use a simple incrementing sequence starting from 0
      const updatedStages = sortedStages.map((stage, index) => ({
        ...stage,
        order: index,
      }));

      // Move the item from oldIndex to newIndex
      const [movedStage] = updatedStages.splice(oldIndex, 1);

      updatedStages.splice(newIndex, 0, movedStage);

      // Update orders based on new positions
      const finalStages = updatedStages.map((stage, index) => ({
        ...stage,
        order: index,
      }));

      setConfiguredEventStages(finalStages);
    },
    [configuredEventStages, setConfiguredEventStages],
  );

  const participatingCountries = useMemo(
    () =>
      [...eventStagesWithCountries.flatMap((stage) => stage.countries)].sort(
        (a, b) => a.name.localeCompare(b.name),
      ),
    [eventStagesWithCountries],
  );

  useInitialLineup();

  const { onSaveContinue, nextSetupStage } = useContinueToNextPhase();
  const { mutateAsync: applyContestToProfile } = useApplyContestMutation();
  const user = useAuthStore((state) => state.user);
  const applyTheme = useApplyContestTheme();

  const isInitialSetupStage = currentSetupStageType === 'initial';
  const currentSetupStage = isInitialSetupStage
    ? initialSetupStage
    : nextSetupStage;

  const canClose = !!currentStageId;

  const debouncedCanClose = useDebounce(canClose, 300);

  const onClose = useCallback(() => {
    setEventSetupModalOpen(false);
  }, [setEventSetupModalOpen]);

  const availableGroups: AvailableGroup[] = useMemo(() => {
    const groups = [
      ...configuredEventStages
        .sort((a, b) => (a.order ?? 0) - (b.order ?? 0))
        .map((s) => ({ id: s.id, name: s.name })),
      CountryAssignmentGroup.NOT_PARTICIPATING,
    ];

    if (isGfOnly) {
      groups.splice(groups.length - 1, 0, CountryAssignmentGroup.NOT_QUALIFIED);
    }

    return groups;
  }, [configuredEventStages, isGfOnly]);

  const closeAndStartEvent = () => {
    onClose();

    // Always use the latest configured stages and assignments from the store.
    // This avoids relying on potentially stale hook values when called
    // immediately after updating voting countries in the PostSetupModal.
    const countriesStoreState = useCountriesStore.getState();
    const {
      configuredEventStages: latestConfiguredStages,
      eventAssignments,
      getAllCountries: getAllCountriesFromStore,
    } = countriesStoreState;

    const latestAssignments = eventAssignments || {};
    const allCountries = getAllCountriesFromStore();

    const { eventStagesWithCountries: eventStagesWithCountriesFresh } =
      buildEventStagesFromAssignments(
        allCountries,
        latestConfiguredStages as EventStage[],
        latestAssignments,
      );

    const eventStages = eventStagesWithCountriesFresh.map((stage) => ({
      ...stage,
      isOver: false,
      isJuryVoting: stage.votingMode !== StageVotingMode.TELEVOTE_ONLY,
      countries: stage.countries.map((country) => ({
        ...country,
        juryPoints: 0,
        televotePoints: 0,
        points: 0,
        lastReceivedPoints: null,
      })),
    }));

    setEventStages(eventStages);

    startEvent();

    clear();
  };

  const handleStartEvent = () => {
    setCurrentSetupStageType('initial');

    const validationError = validateEventSetup(
      settingsPointsSystem.length,
      {
        stages: eventStagesWithCountries,
      },
      t,
    );

    if (validationError) {
      toast(validationError, {
        type: 'error',
      });

      return;
    }

    const resolvedPointsSystem =
      settingsPointsSystem.length > 0
        ? settingsPointsSystem
        : PREDEFINED_SYSTEMS_MAP['default'];

    setPointsSystem(resolvedPointsSystem);

    // Compute first stage locally (sorted by order)
    const sortedStages = [...eventStagesWithCountries].sort(
      (a, b) => (a.order ?? 0) - (b.order ?? 0),
    );
    const firstStage = sortedStages.find((s) => s.countries.length > 0) || null;
    const firstStageCountries: BaseCountry[] = firstStage?.countries || [];

    if (firstStage) {
      setInitialSetupStage({
        ...firstStage,
        countries: firstStageCountries.map((c) => ({
          ...c,
          juryPoints: 0,
          televotePoints: 0,
          points: 0,
          lastReceivedPoints: null,
        })),
      });
    }

    setPostSetupModalOpen(true);

    return;
  };

  const onPostSetupSave = () => {
    if (enablePredefined) {
      setPredefModalOpen(true);

      return;
    }

    if (isInitialSetupStage) {
      closeAndStartEvent();
    } else {
      continueToNextPhase();
    }
  };

  const onVotingPredefSaveStart = (votes: Partial<StageVotes>) => {
    // Persist votes for first stage and start
    const firstStageId = initialSetupStage?.id;

    setPredefinedVotesForStage(
      {
        ...(eventStagesWithCountries.find((s) => s.id === firstStageId) as any),
      },
      votes,
      true,
    );

    closeAndStartEvent();
    setPredefModalOpen(false);
  };

  const handleConfirmLoadContest = useCallback(
    async (options: LoadContestOptions) => {
      if (!contestToLoad) return;

      try {
        const { contest, snapshot } = contestToLoad;

        if (options.theme) {
          await applyTheme(contest.themeId, contest.standardThemeId);
        }

        setIsContestsModalOpen(false);

        await applyContestSnapshotToStores(snapshot, contest, false, options);

        // Set as active contest (immediate)
        useGeneralStore.getState().setActiveContest(contest);

        // Save to profile (sync across devices)
        if (user) {
          await applyContestToProfile(contest._id);
        }

        setContestToLoad(null);
        toast.success(t('widgets.contests.contestLoaded'));
      } catch (e: any) {
        toast.error(
          e?.response?.data?.message ||
            t('widgets.contests.failedToLoadContest'),
        );
      }
    },
    [
      contestToLoad,
      setIsContestsModalOpen,
      user,
      setContestToLoad,
      t,
      applyTheme,
      applyContestToProfile,
    ],
  );

  useEffect(() => {
    if (restartCounter > 0) {
      handleStartEvent();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [restartCounter]);

  return (
    <>
      <SyncCustomEntries />
      {(predefModalOpen || isPredefModalLoaded) && currentSetupStage && (
        <VotingPredefinitionModal
          isOpen={predefModalOpen}
          onClose={() => setPredefModalOpen(false)}
          stage={currentSetupStage}
          onSave={
            isInitialSetupStage ? onVotingPredefSaveStart : onSaveContinue
          }
          onLoaded={() => setIsPredefModalLoaded(true)}
        />
      )}

      {(postSetupModalOpen || isPostSetupModalLoaded) && currentSetupStage && (
        <PostSetupModal
          isOpen={postSetupModalOpen}
          onClose={() => setPostSetupModalOpen(false)}
          stage={currentSetupStage}
          onLoaded={() => setIsPostSetupModalLoaded(true)}
          onSave={onPostSetupSave}
        />
      )}

      <Modal
        isOpen={eventSetupModalOpen}
        onClose={debouncedCanClose ? onClose : undefined}
        overlayClassName="!z-[1000]"
        containerClassName="w-[calc(100%-1.5rem)]"
        contentClassName="!pb-4"
        withBlur
        bottomContent={
          <div className="flex justify-end xs:gap-4 gap-2 bg-primary-900 md:p-4 xs:p-3 p-2 z-30">
            {debouncedCanClose && (
              <Button
                variant="secondary"
                className="md:text-base text-sm"
                onClick={onClose}
                snowEffect="middle"
              >
                {winnerCountry ? t('common.close') : t('common.continue')}
              </Button>
            )}
            <Button
              className="w-full !text-base"
              onClick={handleStartEvent}
              snowEffect="right"
            >
              {t('common.start')}
            </Button>
          </div>
        }
      >
        <SetupHeader openSettingsModal={() => setIsSettingsModalOpen(true)} />

        {(isSettingsModalOpen || isSettingsModalLoaded) && (
          <SettingsModal
            isOpen={isSettingsModalOpen}
            onClose={() => setIsSettingsModalOpen(false)}
            participatingCountries={participatingCountries}
            onLoaded={() => setIsSettingsModalLoaded(true)}
          />
        )}

        {isCustomCountryModalOpen && (
          <CustomCountryModal
            isOpen={isCustomCountryModalOpen}
            onClose={handleCloseModal}
            countryToEdit={countryToEdit}
          />
        )}
        {isEventStageModalOpen && (
          <EventStageModal
            isOpen={isEventStageModalOpen}
            onClose={handleCloseEventStageModal}
            eventStageToEdit={eventStageToEdit}
            localEventStagesLength={configuredEventStages.length}
            onSave={handleSaveStage}
            onDelete={handleDeleteStage}
          />
        )}

        {isStageReorderModalOpen && (
          <StageReorderModal
            isOpen={isStageReorderModalOpen}
            onClose={() => setIsStageReorderModalOpen(false)}
            stages={configuredEventStages}
            onReorder={handleStageOrderChange}
            onDelete={handleDeleteStage}
          />
        )}

        <WidgetsSection />
        <div className="mt-2 flex flex-col gap-2">
          <ContestCard
            onReorderClick={() => setIsStageReorderModalOpen(true)}
            onAddStageClick={handleOpenCreateEventStageModal}
          />

          <UnifiedStageSetup
            eventStages={eventStagesWithCountries}
            onAssignCountryAssignment={handleCountryAssignment}
            getCountryGroupAssignment={getCountryGroupAssignment}
            onBulkAssign={handleBulkCountryAssignment}
            onEditStage={handleOpenEditEventStageModal}
            availableGroups={availableGroups}
            notQualifiedCountries={notQualifiedCountries}
          />

          <div className="h-px bg-primary-800 w-full my-1" />

          <NotParticipatingSection
            handleOpenEditModal={handleOpenEditModal}
            handleOpenCreateModal={handleOpenCreateModal}
            notParticipatingCountries={notParticipatingCountries}
            handleBulkCountryAssignment={handleBulkCountryAssignment}
            handleCountryAssignment={handleCountryAssignment}
            getCountryGroupAssignment={getCountryGroupAssignment}
            availableGroups={availableGroups}
          />

          <div className="flex justify-center items-center sm:flex-row flex-col-reverse gap-2 text-white/90 mt-2 font-semibold xs:text-base text-sm text-center">
            <span>
              © Copyright {new Date().getFullYear()} DouzePoints.app | All
              rights reserved
            </span>
          </div>
        </div>
      </Modal>

      {/* Load Contest Modal */}
      {contestToLoad && (
        <LoadContestModal
          isOpen
          isSimulationStarted={contestToLoad.contest.isSimulationStarted}
          themeDescription={
            contestToLoad.contest.themeId
              ? t('common.custom')
              : contestToLoad.contest.standardThemeId?.replace('-', ' ')
          }
          onClose={() => {
            setContestToLoad(null);
          }}
          onLoad={handleConfirmLoadContest}
        />
      )}
    </>
  );
};

export default EventSetupModal;
