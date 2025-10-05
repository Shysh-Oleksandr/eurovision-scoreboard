import React, {
  Suspense,
  useCallback,
  useEffect,
  useMemo,
  useState,
} from 'react';
import { toast } from 'react-toastify';

import { useShallow } from 'zustand/shallow';

import {
  BaseCountry,
  CountryAssignmentGroup,
  EventMode,
  EventStage,
  StageId,
} from '../../models';
import { useCountriesStore } from '../../state/countriesStore';
import { useScoreboardStore } from '../../state/scoreboardStore';
import Button from '../common/Button';
import Modal from '../common/Modal/Modal';
import Tabs, { TabContent } from '../common/tabs/Tabs';
import { useContinueToNextPhase } from '../simulation/hooks/useContinueToNextPhase';

import { TABS } from './constants';
import { AvailableGroup } from './CountrySelectionListItem';
import { useCountryAssignments } from './hooks/useCountryAssignments';
import { useCustomCountryModal } from './hooks/useCustomCountryModal';
import { useInitialLineup } from './hooks/useInitialLineup';
import { useStageModalActions } from './hooks/useStageModalActions';
import NotParticipatingSection from './NotParticipatingSection';
import SemiFinalsAndGrandFinalSetup from './SemiFinalsAndGrandFinalSetup';
import { SetupHeader } from './SetupHeader';
import { validateEventSetup } from './utils/eventValidation';
import WidgetsSection from './widgets-section/WidgetsSection';

import { PREDEFINED_SYSTEMS_MAP } from '@/data/data';
import { useDebounce } from '@/hooks/useDebounce';
import { useGeneralStore } from '@/state/generalStore';
import { StageVotes } from '@/state/scoreboard/types';

const EventStageModal = React.lazy(
  () => import('./event-stage/EventStageModal'),
);
const CustomCountryModal = React.lazy(() => import('./CustomCountryModal'));
const SettingsModal = React.lazy(() => import('../settings/SettingsModal'));
const GrandFinalOnlySetup = React.lazy(() => import('./GrandFinalOnlySetup'));
const VotingPredefinitionModal = React.lazy(
  () => import('./voting-predefinition/VotingPredefinitionModal'),
);

const EventSetupModal = () => {
  const {
    eventSetupModalOpen,
    predefModalOpen,
    setEventSetupModalOpen,
    setPredefModalOpen,
    getAllCountries,
    configuredEventStages,
    activeTab,
    setActiveTab,
    countryOdds,
    predefModalStageType,
    setPredefModalStageType,
  } = useCountriesStore(
    useShallow((state) => ({
      eventSetupModalOpen: state.eventSetupModalOpen,
      predefModalOpen: state.predefModalOpen,
      setEventSetupModalOpen: state.setEventSetupModalOpen,
      setPredefModalOpen: state.setPredefModalOpen,
      getAllCountries: state.getAllCountries,
      configuredEventStages: state.configuredEventStages,
      activeTab: state.activeMode,
      setActiveTab: state.setActiveMode,
      countryOdds: state.countryOdds,
      predefModalStageType: state.predefModalStageType,
      setPredefModalStageType: state.setPredefModalStageType,
    })),
  );

  const currentStageId = useScoreboardStore((state) => state.currentStageId);
  const startEvent = useScoreboardStore((state) => state.startEvent);
  const setEventStages = useScoreboardStore((state) => state.setEventStages);
  const restartCounter = useScoreboardStore((state) => state.restartCounter);
  const setPredefinedVotesForStage = useScoreboardStore(
    (state) => state.setPredefinedVotesForStage,
  );
  const settingsPointsSystem = useGeneralStore(
    (state) => state.settingsPointsSystem,
  );
  const setPointsSystem = useGeneralStore((state) => state.setPointsSystem);
  const enablePredefined = useGeneralStore(
    (state) => state.settings.enablePredefinedVotes,
  );
  const { clear } = useScoreboardStore.temporal.getState();

  const [isSettingsModalOpen, setIsSettingsModalOpen] = useState(false);
  const [isSettingsModalLoaded, setIsSettingsModalLoaded] = useState(false);
  const [isPredefModalLoaded, setIsPredefModalLoaded] = useState(false);
  const [startPredefStage, setStartPredefStage] = useState<
    | (Pick<EventStage, 'id' | 'name' | 'votingMode'> & {
        countries: BaseCountry[];
      })
    | null
  >(null);

  const {
    countryGroups: {
      autoQualifiers,
      grandFinalQualifiers,
      eventStagesWithCountries,
      notParticipatingCountries,
      notQualifiedCountries,
    },
    handleCountryAssignment,
    handleBulkCountryAssignment,
    getCountryGroupAssignment,
    setAssignments,
    allAssignments,
  } = useCountryAssignments(configuredEventStages);

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

  const participatingCountries = [
    ...autoQualifiers,
    ...eventStagesWithCountries.flatMap((stage) => stage.countries),
  ].sort((a, b) => a.name.localeCompare(b.name));

  useInitialLineup();

  const { onSaveContinue, nextStageForPredef } = useContinueToNextPhase();

  const isInitialPredef = predefModalStageType === 'initial';
  const predefStage = isInitialPredef ? startPredefStage : nextStageForPredef;

  const isGrandFinalOnly = activeTab === EventMode.GRAND_FINAL_ONLY;
  const canClose = !!currentStageId;

  const debouncedCanClose = useDebounce(canClose, 300);

  const onClose = useCallback(() => {
    setEventSetupModalOpen(false);
  }, [setEventSetupModalOpen]);

  const semiFinalsAvailableGroups: AvailableGroup[] = [
    CountryAssignmentGroup.AUTO_QUALIFIER,
    ...configuredEventStages
      .filter((s) => s.id !== StageId.GF)
      .map((s) => ({ id: s.id, name: s.name })),
    CountryAssignmentGroup.NOT_PARTICIPATING,
  ];

  const grandFinalStage = configuredEventStages.find(
    (s) => s.id === StageId.GF,
  );
  const grandFinalAvailableGroups: AvailableGroup[] = grandFinalStage
    ? [
        { id: grandFinalStage.id, name: grandFinalStage.name },
        CountryAssignmentGroup.NOT_QUALIFIED,
        CountryAssignmentGroup.NOT_PARTICIPATING,
      ]
    : [];

  const availableGroups =
    activeTab === EventMode.GRAND_FINAL_ONLY
      ? grandFinalAvailableGroups
      : semiFinalsAvailableGroups;

  const closeAndStartEvent = () => {
    onClose();
    setEventStages(eventStagesWithCountries);

    const allCountries = getAllCountries();

    const allSelectedCountries: BaseCountry[] = Object.entries(
      allAssignments[activeTab],
    )
      .filter(([, group]) => group !== CountryAssignmentGroup.NOT_PARTICIPATING)
      .map(([countryCode, group]) => {
        const country = allCountries.find((c) => c.code === countryCode)!;
        const odds = countryOdds[countryCode];

        const isAutoQualifier = group === CountryAssignmentGroup.AUTO_QUALIFIER;
        const isGrandFinalist = group === StageId.GF;
        const isSemiFinalist = eventStagesWithCountries.some(
          (s) => s.id === group,
        );

        return {
          ...country,
          juryOdds: odds?.juryOdds,
          televoteOdds: odds?.televoteOdds,
          semiFinalGroup: isSemiFinalist ? group : undefined,
          isAutoQualified: isAutoQualifier,
          isQualified: isAutoQualifier || isGrandFinalist,
        };
      });

    startEvent(activeTab, allSelectedCountries);

    clear();
  };

  const handleStartEvent = () => {
    const validationError = validateEventSetup(
      isGrandFinalOnly,
      settingsPointsSystem.length,
      {
        stages: eventStagesWithCountries.map((s) => ({
          id: s.id,
          qualifiersAmount: s.qualifiersAmount || 0,
          countriesCount: s.countries.length,
          votingCountries: s.votingCountries || [],
          name: s.name,
          votingMode: s.votingMode,
        })),
        autoQualifiersCount: autoQualifiers.length,
        grandFinalQualifiersCount: grandFinalQualifiers.length,
      },
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

    // Compute first stage locally
    const allStagesFromSetup = eventStagesWithCountries;
    let stagesList: EventStage[] =
      allStagesFromSetup as unknown as EventStage[];

    if (activeTab === EventMode.GRAND_FINAL_ONLY) {
      stagesList = allStagesFromSetup.filter((s) => s.id === StageId.GF) as any;
    } else {
      stagesList = allStagesFromSetup.filter(
        (s) => s.id === StageId.GF || s.countries.length > 0,
      ) as any;
    }
    const firstStage = stagesList[0] || null;

    const isGFWithoutCountries =
      firstStage.id === StageId.GF && firstStage?.countries.length === 0;

    let firstStageCountries: BaseCountry[] = firstStage?.countries;

    if (isGFWithoutCountries) {
      const allCountries = getAllCountries();

      firstStageCountries = Object.entries(allAssignments[activeTab])
        // eslint-disable-next-line @typescript-eslint/no-unused-vars
        .filter(([_, group]) => group === CountryAssignmentGroup.AUTO_QUALIFIER)
        .map(
          ([countryCode]) => allCountries.find((c) => c.code === countryCode)!,
        );
    }

    if (enablePredefined && firstStage) {
      setStartPredefStage({
        id: firstStage.id,
        name: firstStage.name,
        votingMode: firstStage.votingMode,
        countries: firstStageCountries,
      });
      setPredefModalStageType('initial');
      setPredefModalOpen(true);

      return; // Wait for modal Save to proceed
    }

    closeAndStartEvent();
  };

  const onVotingPredefSaveStart = (votes: Partial<StageVotes>) => {
    // Persist votes for first stage and start
    const firstStageId = startPredefStage?.id;

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

  const tabsWithContent = useMemo(
    () => [
      {
        ...TABS[0],
        content: (
          <SemiFinalsAndGrandFinalSetup
            autoQualifiers={autoQualifiers}
            eventStages={eventStagesWithCountries.filter(
              (s) => s.id !== StageId.GF,
            )}
            grandFinalStage={eventStagesWithCountries.find(
              (s) => s.id === StageId.GF,
            )}
            onAssignCountryAssignment={handleCountryAssignment}
            getCountryGroupAssignment={getCountryGroupAssignment}
            onBulkAssign={handleBulkCountryAssignment}
            onEditStage={handleOpenEditEventStageModal}
            onCreateStage={handleOpenCreateEventStageModal}
            availableGroups={availableGroups}
          />
        ),
      },
      {
        ...TABS[1],
        content: (
          <Suspense
            fallback={
              <div className="text-white text-center py-2 font-medium">
                Loading...
              </div>
            }
          >
            {activeTab === EventMode.GRAND_FINAL_ONLY && (
              <GrandFinalOnlySetup
                grandFinalStage={eventStagesWithCountries.find(
                  (s) => s.id === StageId.GF,
                )}
                notQualifiedCountries={notQualifiedCountries}
                onAssignCountryAssignment={handleCountryAssignment}
                getCountryGroupAssignment={getCountryGroupAssignment}
                onBulkAssign={handleBulkCountryAssignment}
                onEditStage={handleOpenEditEventStageModal}
                availableGroups={availableGroups}
              />
            )}
          </Suspense>
        ),
      },
    ],
    [
      activeTab,
      autoQualifiers,
      availableGroups,
      eventStagesWithCountries,
      getCountryGroupAssignment,
      handleBulkCountryAssignment,
      handleCountryAssignment,
      handleOpenCreateEventStageModal,
      handleOpenEditEventStageModal,
      notQualifiedCountries,
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
      <Suspense fallback={null}>
        {(predefModalOpen || isPredefModalLoaded) && predefStage && (
          <VotingPredefinitionModal
            isOpen={predefModalOpen}
            onClose={() => setPredefModalOpen(false)}
            stage={predefStage}
            onSave={isInitialPredef ? onVotingPredefSaveStart : onSaveContinue}
            onLoaded={() => setIsPredefModalLoaded(true)}
          />
        )}
      </Suspense>

      <Modal
        isOpen={eventSetupModalOpen}
        onClose={debouncedCanClose ? onClose : undefined}
        overlayClassName="!z-[1000]"
        bottomContent={
          <div className="flex justify-end xs:gap-4 gap-2 bg-primary-900 md:p-4 xs:p-3 p-2 z-30">
            {debouncedCanClose && (
              <Button
                variant="secondary"
                className="md:text-base text-sm"
                onClick={onClose}
              >
                Close
              </Button>
            )}
            <Button className="w-full !text-base" onClick={handleStartEvent}>
              Start
            </Button>
          </div>
        }
      >
        <SetupHeader openSettingsModal={() => setIsSettingsModalOpen(true)} />

        <Suspense fallback={null}>
          {(isSettingsModalOpen || isSettingsModalLoaded) && (
            <SettingsModal
              isOpen={isSettingsModalOpen}
              onClose={() => setIsSettingsModalOpen(false)}
              participatingCountries={participatingCountries}
              onLoaded={() => setIsSettingsModalLoaded(true)}
            />
          )}
        </Suspense>

        {isCustomCountryModalOpen && (
          <Suspense fallback={null}>
            <CustomCountryModal
              isOpen={isCustomCountryModalOpen}
              onClose={handleCloseModal}
              countryToEdit={countryToEdit}
            />
          </Suspense>
        )}

        {isEventStageModalOpen && (
          <Suspense fallback={null}>
            <EventStageModal
              isOpen={isEventStageModalOpen}
              onClose={handleCloseEventStageModal}
              eventStageToEdit={eventStageToEdit}
              localEventStagesLength={configuredEventStages.length}
              onSave={handleSaveStage}
              onDelete={handleDeleteStage}
            />
          </Suspense>
        )}

        <WidgetsSection />
        <div className="mt-2 flex flex-col gap-3">
          <Tabs
            tabs={TABS}
            activeTab={activeTab}
            setActiveTab={(tab) => setActiveTab(tab as EventMode)}
          />

          <TabContent
            tabs={tabsWithContent}
            activeTab={activeTab}
            preserveContent
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
        </div>
      </Modal>
    </>
  );
};

export default EventSetupModal;
