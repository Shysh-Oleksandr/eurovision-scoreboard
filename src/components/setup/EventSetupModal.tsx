import React, { useCallback, useState } from 'react';

import {
  BaseCountry,
  CountryAssignmentGroup,
  EventMode,
  EventPhase,
} from '../../models';
import { useCountriesStore } from '../../state/countriesStore';
import { useScoreboardStore } from '../../state/scoreboardStore';
import Button from '../common/Button';
import Modal from '../common/Modal';
import Tabs from '../common/Tabs';

import { TABS } from './constants';
import CustomCountryModal from './CustomCountryModal';
import GrandFinalOnlySetup from './GrandFinalOnlySetup';
import { useCountryAssignments } from './hooks/useCountryAssignments';
import { useCustomCountryModal } from './hooks/useCustomCountryModal';
import NotParticipatingSection from './NotParticipatingSection';
import SemiFinalsAndGrandFinalSetup from './SemiFinalsAndGrandFinalSetup';
import { SetupHeader } from './SetupHeader';
import { validateEventSetup } from './utils/eventValidation';

const EventSetupModal = () => {
  const { eventSetupModalOpen, setEventSetupModalOpen } = useCountriesStore();
  const { allCountriesForYear, getAllCountries } = useCountriesStore();
  const { startEvent, setSemiFinalQualifiers, eventPhase } =
    useScoreboardStore();

  const [activeTab, setActiveTab] = useState<EventMode>(
    EventMode.SEMI_FINALS_AND_GRAND_FINAL,
  );
  const [sf1Qualifiers, setSf1Qualifiers] = useState(10);
  const [sf2Qualifiers, setSf2Qualifiers] = useState(10);

  const isGrandFinalOnly = activeTab === EventMode.GRAND_FINAL_ONLY;
  const canClose = eventPhase !== EventPhase.COUNTRY_SELECTION;

  const {
    countryGroups: {
      autoQualifiers,
      grandFinalQualifiers,
      sf1Countries,
      sf2Countries,
      notParticipatingCountries,
      notQualifiedCountries,
      assignments,
    },
    handleCountryAssignment,
    handleBulkCountryAssignment,
    getCountryGroupAssignment,
    areAssignmentsLoaded,
  } = useCountryAssignments(activeTab);

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

  const handleStartEvent = useCallback(() => {
    const validationError = validateEventSetup(isGrandFinalOnly, {
      sf1Qualifiers,
      sf2Qualifiers,
      sf1CountriesCount: sf1Countries.length,
      sf2CountriesCount: sf2Countries.length,
      autoQualifiersCount: autoQualifiers.length,
      grandFinalQualifiersCount: grandFinalQualifiers.length,
    });

    if (validationError) {
      alert(validationError);

      return;
    }

    const allCountries = getAllCountries();
    const allSelectedCountries: BaseCountry[] = Object.entries(assignments)
      .filter(([, group]) => group !== CountryAssignmentGroup.NOT_PARTICIPATING)
      .map(([countryCode, group]) => {
        const country = allCountries.find((c) => c.code === countryCode)!;
        const countryDataForYear = allCountriesForYear.find(
          (c) => c.code === countryCode,
        );

        const isAutoQualifier = group === CountryAssignmentGroup.AUTO_QUALIFIER;
        const isGrandFinalist = group === CountryAssignmentGroup.GRAND_FINAL;
        const isSemiFinalist =
          group === CountryAssignmentGroup.SF1 ||
          group === CountryAssignmentGroup.SF2;

        const isCompetitor =
          isAutoQualifier || isGrandFinalist || isSemiFinalist;

        return {
          ...country,
          ...(countryDataForYear ?? {}),
          isSelected: isCompetitor,
          semiFinalGroup: isSemiFinalist ? group : undefined,
          isAutoQualified: isAutoQualifier,
          isQualified: isAutoQualifier || isGrandFinalist,
        };
      });

    setSemiFinalQualifiers({
      SF1: sf1Qualifiers,
      SF2: sf2Qualifiers,
    });
    startEvent(activeTab, allSelectedCountries);
    onClose();
  }, [
    isGrandFinalOnly,
    sf1Qualifiers,
    sf2Qualifiers,
    sf1Countries.length,
    sf2Countries.length,
    autoQualifiers.length,
    grandFinalQualifiers.length,
    getAllCountries,
    assignments,
    setSemiFinalQualifiers,
    startEvent,
    activeTab,
    onClose,
    allCountriesForYear,
  ]);

  if (!eventSetupModalOpen || !areAssignmentsLoaded) {
    return null;
  }

  return (
    <Modal
      isOpen={eventSetupModalOpen}
      onClose={canClose ? onClose : undefined}
      overlayClassName="!z-[1000]"
      bottomContent={
        <div className="flex justify-end xs:gap-4 gap-2 bg-primary-900 p-4 z-30">
          {canClose && (
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
      <SetupHeader />
      <CustomCountryModal
        isOpen={isCustomCountryModalOpen}
        onClose={handleCloseModal}
        countryToEdit={countryToEdit}
      />

      <div className="mt-4 flex flex-col gap-3">
        <Tabs
          tabs={TABS}
          activeTab={activeTab}
          setActiveTab={(tab) => setActiveTab(tab as EventMode)}
        />

        {activeTab === EventMode.SEMI_FINALS_AND_GRAND_FINAL && (
          <SemiFinalsAndGrandFinalSetup
            sf1Qualifiers={sf1Qualifiers}
            sf2Qualifiers={sf2Qualifiers}
            setSf1Qualifiers={setSf1Qualifiers}
            setSf2Qualifiers={setSf2Qualifiers}
            autoQualifiers={autoQualifiers}
            sf1Countries={sf1Countries}
            sf2Countries={sf2Countries}
            onAssignCountryAssignment={handleCountryAssignment}
            getCountryGroupAssignment={getCountryGroupAssignment}
            onBulkAssign={handleBulkCountryAssignment}
          />
        )}

        {isGrandFinalOnly && (
          <GrandFinalOnlySetup
            grandFinalQualifiers={grandFinalQualifiers}
            notQualifiedCountries={notQualifiedCountries}
            onAssignCountryAssignment={handleCountryAssignment}
            getCountryGroupAssignment={getCountryGroupAssignment}
            onBulkAssign={handleBulkCountryAssignment}
          />
        )}

        <div className="h-px bg-primary-800 w-full my-1" />

        <NotParticipatingSection
          handleOpenEditModal={handleOpenEditModal}
          handleOpenCreateModal={handleOpenCreateModal}
          notParticipatingCountries={notParticipatingCountries}
          activeTab={activeTab}
          handleBulkCountryAssignment={handleBulkCountryAssignment}
          handleCountryAssignment={handleCountryAssignment}
          getCountryGroupAssignment={getCountryGroupAssignment}
        />
      </div>
    </Modal>
  );
};

export default EventSetupModal;
