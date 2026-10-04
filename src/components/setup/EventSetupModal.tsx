'use client';
import { useTranslations } from 'next-intl';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { toast } from 'react-toastify';

import dynamic from 'next/dynamic';
import { useShallow } from 'zustand/shallow';

import { BaseCountry, EventStage, StageVotingMode } from '../../models';
import { useCountriesStore } from '../../state/countriesStore';
import { useScoreboardStore } from '../../state/scoreboardStore';
import Modal from '../common/Modal/Modal';
import { useContinueToNextPhase } from '../simulation/hooks/useContinueToNextPhase';

import { AllocationDrawProvider } from './allocation-draw/AllocationDrawContext';
import DrawModeDialogs from './allocation-draw/DrawModeDialogs';
import { useDrawUiStore } from './allocation-draw/drawUiStore';
import { useAllocationDraw } from './allocation-draw/useAllocationDraw';
import { useContestDirtyState } from './hooks/useContestDirtyState';
import { useCountryAssignments } from './hooks/useCountryAssignments';
import { useCustomCountryModal } from './hooks/useCustomCountryModal';
import { useInitialLineup } from './hooks/useInitialLineup';
import { useLoadContest } from './hooks/useLoadContest';
import { useStageModalActions } from './hooks/useStageModalActions';
import CountryPool from './hub/lineup/CountryPool';
import LineupDndBoundary from './hub/lineup/dnd/LineupDndBoundary';
import LineupMenus from './hub/lineup/LineupMenus';
import LineupProvider from './hub/lineup/LineupProvider';
import SelectionTray from './hub/lineup/SelectionTray';
import StageList from './hub/lineup/StageList';
import { useLineupModel } from './hub/lineup/useLineupModel';
import SetupFooter from './hub/SetupFooter';
import SetupHubHeader from './hub/SetupHubHeader';
import { useSetupUiStore } from './hub/state/setupUiStore';
import { SyncCustomEntries } from './SyncCustomEntries';
import { buildEventStagesFromAssignments } from './utils/buildEventStagesFromAssignments';
import { validateEventSetup } from './utils/eventValidation';
import ContestCard from './widgets-section/contests/ContestCard';
import { useApplyContestTheme } from './widgets-section/contests/hooks/useApplyContestTheme';
import WidgetsSection from './widgets-section/WidgetsSection';

import { useApplyContestMutation } from '@/api/contests';
import { useCustomEntryGroupsQuery } from '@/api/customEntries';
import { PREDEFINED_SYSTEMS_MAP } from '@/data/data';
import { markContestSetupClean } from '@/helpers/contestFingerprint';
import {
  applyContestSnapshotToStores,
  LoadContestOptions,
} from '@/helpers/contestSnapshot';
import { importPostSetupModal } from '@/hooks/simulationChunkImports';
import { useConfirmation } from '@/hooks/useConfirmation';
import { useDebounce } from '@/hooks/useDebounce';
import {
  isDrawnInfoCurrent,
  useAllocationDrawStore,
} from '@/state/allocationDrawStore';
import { useGeneralStore } from '@/state/generalStore';
import { StageVotes } from '@/state/scoreboard/types';
import { useAuthStore } from '@/state/useAuthStore';
import { stripCopySuffix } from '@/theme/themeFingerprint';

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
const PostSetupModal = dynamic(importPostSetupModal, {
  ssr: false,
});
const StageReorderModal = dynamic(() => import('./StageReorderModal'), {
  ssr: false,
});
const AllocationDrawModal = dynamic(
  () => import('./allocation-draw/AllocationDrawModal'),
  { ssr: false },
);
const LoadContestModal = dynamic(
  () => import('./widgets-section/contests/LoadContestModal'),
  {
    ssr: false,
  },
);
const UserProfileModal = dynamic(
  () => import('./widgets-section/user-profile/UserProfileModal'),
  { ssr: false },
);
const ThemeShareModal = dynamic(
  () => import('./widgets-section/custom-themes/ThemeShareModal'),
  { ssr: false },
);
const ContestShareModal = dynamic(
  () => import('./widgets-section/contests/ContestShareModal'),
  { ssr: false },
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
  const settingsTelevotePointsSystem = useGeneralStore(
    (state) => state.settingsTelevotePointsSystem,
  );
  const settings = useGeneralStore((state) => state.settings);
  const { splitPointsSystem } = settings;
  const isGfOnly = useGeneralStore((state) => state.isGfOnly);
  const setPointsSystem = useGeneralStore((state) => state.setPointsSystem);
  const setTelevotePointsSystem = useGeneralStore(
    (state) => state.setTelevotePointsSystem,
  );
  const enablePredefined = useGeneralStore(
    (state) => state.settings.enablePredefinedVotes,
  );
  const setIsContestsModalOpen = useGeneralStore(
    (state) => state.setIsContestsModalOpen,
  );

  const contestToLoad = useGeneralStore((state) => state.contestToLoad);
  const setContestToLoad = useGeneralStore((state) => state.setContestToLoad);
  const selectedProfileUser = useGeneralStore(
    (state) => state.selectedProfileUser,
  );
  const setSelectedProfileUser = useGeneralStore(
    (state) => state.setSelectedProfileUser,
  );
  const setIsThemesModalOpen = useGeneralStore(
    (state) => state.setIsThemesModalOpen,
  );
  const setThemeToEdit = useGeneralStore((state) => state.setThemeToEdit);
  const setThemeToDuplicate = useGeneralStore(
    (state) => state.setThemeToDuplicate,
  );
  const setContestToEdit = useGeneralStore((state) => state.setContestToEdit);
  const selectedShareTheme = useGeneralStore(
    (state) => state.selectedShareTheme,
  );
  const setSelectedShareTheme = useGeneralStore(
    (state) => state.setSelectedShareTheme,
  );
  const selectedShareContest = useGeneralStore(
    (state) => state.selectedShareContest,
  );
  const setSelectedShareContest = useGeneralStore(
    (state) => state.setSelectedShareContest,
  );
  const { clear } = useScoreboardStore.temporal.getState();
  const user = useAuthStore((state) => state.user);

  const [isSettingsModalOpen, setIsSettingsModalOpen] = useState(false);
  const [isSettingsModalLoaded, setIsSettingsModalLoaded] = useState(false);
  const [isPredefModalLoaded, setIsPredefModalLoaded] = useState(false);
  const [isPostSetupModalLoaded, setIsPostSetupModalLoaded] = useState(false);
  const [isStageReorderModalOpen, setIsStageReorderModalOpen] = useState(false);
  const [initialSetupStage, setInitialSetupStage] = useState<EventStage | null>(
    null,
  );
  const drawWindowOpen = useDrawUiStore((state) => state.windowOpen);
  const [isDrawWindowLoaded, setIsDrawWindowLoaded] = useState(false);

  const {
    countryGroups: {
      eventStagesWithCountries,
      notParticipatingCountries,
      notQualifiedCountries,
      toBeDrawnCountries,
    },
    handleBulkCountryAssignmentByCodes,
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

  const { data: customEntryGroups = [] } = useCustomEntryGroupsQuery(!!user);
  const drawModel = useAllocationDraw(eventSetupModalOpen);
  const drawnByStage = useAllocationDrawStore((state) => state.drawn);
  const lineupModel = useLineupModel({
    eventStagesWithCountries,
    notParticipatingCountries,
    notQualifiedCountries,
    toBeDrawnCountries,
    customEntryGroups,
    isGfOnly,
    drawEnabled: drawModel.enabled,
    isSignedIn: !!user,
  });
  const isDrawn = useMemo(
    () =>
      drawModel.semis.length > 0 &&
      drawModel.semis.every((semi) =>
        isDrawnInfoCurrent(
          drawnByStage[semi.id],
          lineupModel.lists.get(`stage:${semi.id}`) ?? [],
        ),
      ),
    [drawModel.semis, drawnByStage, lineupModel.lists],
  );

  const hasUnsavedChanges = useContestDirtyState();

  useInitialLineup();

  const { onSaveContinue, nextSetupStage } = useContinueToNextPhase();
  const { confirm } = useConfirmation();
  const { mutateAsync: applyContestToProfile } = useApplyContestMutation();
  const applyTheme = useApplyContestTheme();

  const handleProfileLoadContest = useLoadContest();

  const isInitialSetupStage = currentSetupStageType === 'initial';
  const currentSetupStage = isInitialSetupStage
    ? initialSetupStage
    : nextSetupStage;

  const canClose = !!currentStageId;

  const debouncedCanClose = useDebounce(canClose, 300);

  const onClose = useCallback(() => {
    setEventSetupModalOpen(false);
    useSetupUiStore.getState().resetUi();
    useDrawUiStore.getState().reset();
  }, [setEventSetupModalOpen]);

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

    // startEvent awaits the lazily-installed engine, so the history wipe must
    // wait for its state writes — clearing first would leave the whole stage
    // start undoable, walking the board back to a pre-start state.
    void startEvent().then(() => clear());
  };

  const proceedToPostSetup = useCallback(() => {
    setCurrentSetupStageType('initial');

    const resolvedPointsSystem =
      settingsPointsSystem.length > 0
        ? settingsPointsSystem
        : PREDEFINED_SYSTEMS_MAP['default'];

    setPointsSystem(resolvedPointsSystem);

    const resolvedTelevotePointsSystem =
      splitPointsSystem && settingsTelevotePointsSystem.length > 0
        ? settingsTelevotePointsSystem
        : resolvedPointsSystem;

    setTelevotePointsSystem(resolvedTelevotePointsSystem);

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
  }, [
    eventStagesWithCountries,
    setCurrentSetupStageType,
    setPointsSystem,
    setPostSetupModalOpen,
    setTelevotePointsSystem,
    settingsPointsSystem,
    settingsTelevotePointsSystem,
    splitPointsSystem,
  ]);

  const handleStartEvent = () => {
    const validationResult = validateEventSetup(
      {
        settings,
        settingsPointsSystem,
        settingsTelevotePointsSystem,
      },
      {
        stages: eventStagesWithCountries,
        toBeDrawnCount: toBeDrawnCountries.length,
      },
      t,
    );

    if (validationResult?.kind === 'error') {
      toast(validationResult.message, {
        type: 'error',
      });

      return;
    }

    if (validationResult?.kind === 'warning') {
      confirm({
        key: 'setup-low-participants-warning',
        type: 'alert',
        title: validationResult.title,
        description: validationResult.description,
        onConfirm: proceedToPostSetup,
      });

      return;
    }

    proceedToPostSetup();
  };

  const onPostSetupSave = () => {
    const stageId = currentSetupStage?.id;
    const stageOverrides = stageId
      ? useCountriesStore
          .getState()
          .configuredEventStages.find((s) => s.id === stageId)?.overrides
      : undefined;
    const effectiveEnablePredefined =
      stageOverrides?.enablePredefinedVotes ?? enablePredefined;

    if (effectiveEnablePredefined) {
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
        markContestSetupClean();

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
    <AllocationDrawProvider value={drawModel}>
      <SyncCustomEntries />
      <DrawModeDialogs />
      {(drawWindowOpen || isDrawWindowLoaded) && (
        <AllocationDrawModal
          isOpen={drawWindowOpen}
          onClose={() => useDrawUiStore.getState().setWindowOpen(false)}
          onLoaded={() => setIsDrawWindowLoaded(true)}
        />
      )}
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
        containerClassName="dp-hub dp-surface-modal 2cols:w-[calc(100%-1.5rem)] !rounded-2xl md:max-w-6xl lg:max-w-6xl"
        contentClassName="!p-3.5 2cols:!p-5 flex flex-col gap-3.5 2cols:gap-4 [&>*]:flex-none"
        unstyledSurface
        fullScreenOnPhone
        withBlur
        bottomContent={
          <SetupFooter
            canClose={debouncedCanClose}
            closeLabel={
              winnerCountry ? t('common.close') : t('common.continue')
            }
            onClose={onClose}
            onStart={handleStartEvent}
            waitingCount={toBeDrawnCountries.length}
            onOpenDraw={() => useDrawUiStore.getState().setWindowOpen(true)}
          />
        }
      >
        <SetupHubHeader
          openSettingsModal={() => setIsSettingsModalOpen(true)}
        />

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
        <div className="flex flex-col gap-3.5 2cols:gap-4">
          <ContestCard
            onReorderClick={() => setIsStageReorderModalOpen(true)}
            onAddStageClick={handleOpenCreateEventStageModal}
            participantsCount={lineupModel.counts.participating}
            stagesCount={lineupModel.counts.stages}
            isGfOnly={isGfOnly}
            hasUnsavedChanges={hasUnsavedChanges}
            isDrawn={isDrawn}
          />

          <LineupProvider
            model={lineupModel}
            isSignedIn={!!user}
            assignMany={handleBulkCountryAssignmentByCodes}
            onEditCustomEntry={handleOpenEditModal}
            onEditStage={handleOpenEditEventStageModal}
            onCreateCustomEntry={handleOpenCreateModal}
          >
            <LineupDndBoundary>
              <StageList isGfOnly={isGfOnly} />
              <CountryPool isSignedIn={!!user} />
              <SelectionTray />
            </LineupDndBoundary>
            <LineupMenus isSignedIn={!!user} />
          </LineupProvider>
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

      {/* User Profile Modal (global so LoadContestModal can show when loading from profile) */}
      {selectedProfileUser && (
        <UserProfileModal
          isOpen
          onClose={() => setSelectedProfileUser(null)}
          user={selectedProfileUser}
          onDuplicate={(theme) => {
            setSelectedProfileUser(null);
            setThemeToDuplicate({
              ...theme,
              name: stripCopySuffix(theme.name),
            });
            setIsThemesModalOpen(true);
          }}
          onEditTheme={(theme) => {
            setSelectedProfileUser(null);
            setThemeToEdit(theme);
            setIsThemesModalOpen(true);
          }}
          onEditContest={(contest) => {
            setSelectedProfileUser(null);
            setContestToEdit(contest);
            setIsContestsModalOpen(true);
          }}
          onLoadContest={handleProfileLoadContest}
        />
      )}

      {/* Theme Share Modal (from share link) */}
      {selectedShareTheme && (
        <ThemeShareModal
          theme={selectedShareTheme}
          onClose={() => setSelectedShareTheme(null)}
          onDuplicate={(theme) => {
            setSelectedShareTheme(null);
            setThemeToDuplicate({
              ...theme,
              name: stripCopySuffix(theme.name),
            });
            setIsThemesModalOpen(true);
          }}
          onEdit={(theme) => {
            setSelectedShareTheme(null);
            setThemeToEdit(theme);
            setIsThemesModalOpen(true);
          }}
        />
      )}

      {/* Contest Share Modal (from share link) */}
      {selectedShareContest && (
        <ContestShareModal
          contest={selectedShareContest}
          onClose={() => setSelectedShareContest(null)}
          onEdit={(contest) => {
            setSelectedShareContest(null);
            setContestToEdit(contest);
            setIsContestsModalOpen(true);
          }}
        />
      )}
    </AllocationDrawProvider>
  );
};

export default EventSetupModal;
