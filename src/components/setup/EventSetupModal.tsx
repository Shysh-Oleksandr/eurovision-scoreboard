import React, { useCallback, useState, useEffect } from 'react';

import {
  BaseCountry,
  CountryAssignmentGroup,
  EventMode,
  EventStage,
  StageId,
  StageVotingMode,
} from '../../models';
import { useCountriesStore } from '../../state/countriesStore';
import { useScoreboardStore } from '../../state/scoreboardStore';
import Button from '../common/Button';
import Modal from '../common/Modal/Modal';
import Tabs from '../common/Tabs';
import { SettingsModal } from '../settings';

import { TABS } from './constants';
import { AvailableGroup } from './CountrySelectionListItem';
import CustomCountryModal from './CustomCountryModal';
import EventStageModal from './EventStageModal';
import GrandFinalOnlySetup from './GrandFinalOnlySetup';
import { useCountryAssignments } from './hooks/useCountryAssignments';
import { useCustomCountryModal } from './hooks/useCustomCountryModal';
import NotParticipatingSection from './NotParticipatingSection';
import SemiFinalsAndGrandFinalSetup from './SemiFinalsAndGrandFinalSetup';
import { SetupHeader } from './SetupHeader';
import { validateEventSetup } from './utils/eventValidation';

import { useDebounce } from '@/hooks/useDebounce';

const EventSetupModal = () => {
  const eventSetupModalOpen = useCountriesStore(
    (state) => state.eventSetupModalOpen,
  );
  const setEventSetupModalOpen = useCountriesStore(
    (state) => state.setEventSetupModalOpen,
  );
  const loadCustomCountries = useCountriesStore(
    (state) => state.loadCustomCountries,
  );
  const allCountriesForYear = useCountriesStore(
    (state) => state.allCountriesForYear,
  );
  const getAllCountries = useCountriesStore((state) => state.getAllCountries);
  const configuredEventStages = useCountriesStore(
    (state) => state.configuredEventStages,
  );
  const setConfiguredEventStages = useCountriesStore(
    (state) => state.setConfiguredEventStages,
  );
  const countryOdds = useCountriesStore((state) => state.countryOdds);
  const currentStageId = useScoreboardStore((state) => state.currentStageId);
  const startEvent = useScoreboardStore((state) => state.startEvent);
  const setEventStages = useScoreboardStore((state) => state.setEventStages);
  const restartCounter = useScoreboardStore((state) => state.restartCounter);

  const [activeTab, setActiveTab] = useState<EventMode>(
    EventMode.SEMI_FINALS_AND_GRAND_FINAL,
  );
  const [isSettingsModalOpen, setIsSettingsModalOpen] = useState(false);

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
  } = useCountryAssignments(activeTab, configuredEventStages);

  const participatingCountries = [
    ...autoQualifiers,
    ...eventStagesWithCountries.flatMap((stage) => stage.countries),
  ].sort((a, b) => a.name.localeCompare(b.name));

  useEffect(() => {
    loadCustomCountries();
  }, [loadCustomCountries]);

  useEffect(() => {
    if (!eventSetupModalOpen) return;
    if (configuredEventStages.length > 0) return;

    const hasSf1 = allCountriesForYear.some((c) => c.semiFinalGroup === 'SF1');
    const hasSf2 = allCountriesForYear.some((c) => c.semiFinalGroup === 'SF2');
    const initialStages: EventStage[] = [];

    if (hasSf1) {
      initialStages.push({
        id: StageId.SF1,
        name: `Semi-Final${hasSf2 ? ' 1' : ''}`,
        votingMode: StageVotingMode.TELEVOTE_ONLY,
        qualifiersAmount: 10,
        countries: [],
        isOver: false,
        isJuryVoting: false,
      });
    }
    if (hasSf2) {
      initialStages.push({
        id: StageId.SF2,
        name: 'Semi-Final 2',
        votingMode: StageVotingMode.TELEVOTE_ONLY,
        qualifiersAmount: 10,
        countries: [],
        isOver: false,
        isJuryVoting: false,
      });
    }
    initialStages.push({
      id: StageId.GF,
      name: 'Grand Final',
      votingMode: StageVotingMode.JURY_AND_TELEVOTE,
      countries: [],
      isOver: false,
      isJuryVoting: false,
    });
    setConfiguredEventStages(initialStages);
  }, [
    eventSetupModalOpen,
    allCountriesForYear,
    configuredEventStages.length,
    setConfiguredEventStages,
  ]);

  const [isEventStageModalOpen, setEventStageModalOpen] = useState(false);
  const [eventStageToEdit, setEventStageToEdit] = useState<
    EventStage | undefined
  >(undefined);

  const handleOpenCreateEventStageModal = () => {
    setEventStageToEdit(undefined);
    setEventStageModalOpen(true);
  };

  const handleOpenEditEventStageModal = (stage: EventStage) => {
    setEventStageToEdit(stage);
    setEventStageModalOpen(true);
  };

  const handleCloseEventStageModal = () => {
    setEventStageModalOpen(false);
  };

  const handleSaveStage = (
    stage: Omit<EventStage, 'countries' | 'isOver' | 'isJuryVoting'>,
  ) => {
    const isEditing = configuredEventStages.some((s) => s.id === stage.id);

    if (isEditing) {
      setConfiguredEventStages(
        configuredEventStages.map((s) =>
          s.id === stage.id ? { ...s, ...stage } : s,
        ),
      );
    } else {
      const newStage: EventStage = {
        ...stage,
        countries: [],
        isOver: false,
        isJuryVoting: false,
      };
      const grandFinalStage = configuredEventStages.find(
        (s) => s.id === StageId.GF,
      );
      const semiFinalStages = configuredEventStages.filter(
        (s) => s.id !== StageId.GF,
      );

      const newStages = [...semiFinalStages, newStage];

      if (grandFinalStage) {
        newStages.push(grandFinalStage);
      }

      setConfiguredEventStages(newStages);
    }
  };

  const handleDeleteStage = (stageId: string) => {
    setConfiguredEventStages(
      configuredEventStages.filter((s) => s.id !== stageId),
    );

    const newAssignments = { ...allAssignments };
    const updatedTabAssignments = { ...newAssignments[activeTab] };

    for (const countryCode in updatedTabAssignments) {
      if (updatedTabAssignments[countryCode] === stageId) {
        updatedTabAssignments[countryCode] =
          CountryAssignmentGroup.NOT_PARTICIPATING;
      }
    }

    newAssignments[activeTab] = updatedTabAssignments;
    setAssignments(newAssignments);
  };

  const isGrandFinalOnly = activeTab === EventMode.GRAND_FINAL_ONLY;
  const canClose = !!currentStageId;

  const debouncedCanClose = useDebounce(canClose, 300);

  const {
    isCustomCountryModalOpen,
    countryToEdit,
    handleOpenCreateModal,
    handleOpenEditModal,
    handleCloseModal,
  } = useCustomCountryModal();

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

  const handleStartEvent = () => {
    const validationError = validateEventSetup(isGrandFinalOnly, {
      stages: eventStagesWithCountries.map((s) => ({
        id: s.id,
        qualifiersAmount: s.qualifiersAmount || 0,
        countriesCount: s.countries.length,
      })),
      autoQualifiersCount: autoQualifiers.length,
      grandFinalQualifiersCount: grandFinalQualifiers.length,
    });

    if (validationError) {
      alert(validationError);

      return;
    }

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
  };

  useEffect(() => {
    if (restartCounter > 0) {
      handleStartEvent();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [restartCounter]);

  return (
    <Modal
      isOpen={eventSetupModalOpen}
      onClose={debouncedCanClose ? onClose : undefined}
      overlayClassName="!z-[1000]"
      bottomContent={
        <div className="flex justify-end xs:gap-4 gap-2 bg-primary-900 p-4 z-30">
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
      <SettingsModal
        isOpen={isSettingsModalOpen}
        onClose={() => setIsSettingsModalOpen(false)}
        participatingCountries={participatingCountries}
      />
      <CustomCountryModal
        isOpen={isCustomCountryModalOpen}
        onClose={handleCloseModal}
        countryToEdit={countryToEdit}
      />
      <EventStageModal
        isOpen={isEventStageModalOpen}
        onClose={handleCloseEventStageModal}
        eventStageToEdit={eventStageToEdit}
        localEventStagesLength={configuredEventStages.length}
        onSave={handleSaveStage}
        onDelete={handleDeleteStage}
      />

      <div className="mt-2 flex flex-col gap-3">
        <Tabs
          tabs={TABS}
          activeTab={activeTab}
          setActiveTab={(tab) => setActiveTab(tab as EventMode)}
        />

        {activeTab === EventMode.SEMI_FINALS_AND_GRAND_FINAL && (
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
        )}

        {isGrandFinalOnly && (
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
  );
};

export default EventSetupModal;
