import React, { useEffect, useMemo, useState } from 'react';

import { ALL_COUNTRIES } from '../../data/countries/common-countries';
import {
  BaseCountry,
  CountryAssignmentGroup,
  EventMode,
  EventPhase,
} from '../../models';
import { useCountriesStore } from '../../state/countriesStore';
import { useScoreboardStore } from '../../state/scoreboardStore';
import Button from '../Button';
import Modal from '../Modal';
import { YearSelectBox } from '../SelectBox/YearSelectBox';
import Tabs from '../Tabs';

import { CountrySelectionList } from './CountrySelectionList';
import GrandFinalOnlySetup from './GrandFinalOnlySetup';
import SectionWrapper from './SectionWrapper';
import SemiFinalsAndGrandFinalSetup from './SemiFinalsAndGrandFinalSetup';

const TABS = [
  {
    label: 'Semi-Finals + Grand Final',
    value: EventMode.SEMI_FINALS_AND_GRAND_FINAL,
  },
  {
    label: 'Grand Final Only',
    value: EventMode.GRAND_FINAL_ONLY,
  },
];

const SEMI_FINALS_GROUPS = [
  CountryAssignmentGroup.SF1,
  CountryAssignmentGroup.SF2,
  CountryAssignmentGroup.AUTO_QUALIFIER,
  CountryAssignmentGroup.NOT_PARTICIPATING,
];

const GRAND_FINAL_GROUPS = [
  CountryAssignmentGroup.GRAND_FINAL,
  CountryAssignmentGroup.NOT_QUALIFIED,
  CountryAssignmentGroup.NOT_PARTICIPATING,
];

interface EventSetupModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const EventSetupModal: React.FC<EventSetupModalProps> = ({
  isOpen,
  onClose,
}) => {
  const { allCountriesForYear } = useCountriesStore();
  const { startEvent, setSemiFinalQualifiers, eventPhase } =
    useScoreboardStore();

  const [activeTab, setActiveTab] = useState<EventMode>(
    EventMode.SEMI_FINALS_AND_GRAND_FINAL,
  );
  const [sf1Qualifiers, setSf1Qualifiers] = useState(10);
  const [sf2Qualifiers, setSf2Qualifiers] = useState(10);

  const [countryAssignments, setCountryAssignments] = useState<
    Record<EventMode, Record<string, CountryAssignmentGroup>>
  >({
    [EventMode.SEMI_FINALS_AND_GRAND_FINAL]: {},
    [EventMode.GRAND_FINAL_ONLY]: {},
  });

  const isGrandFinalOnly = activeTab === EventMode.GRAND_FINAL_ONLY;
  const canClose = eventPhase !== EventPhase.COUNTRY_SELECTION;

  // Initialize selected countries based on the current year's data
  useEffect(() => {
    const semiFinalsInitialAssignments: Record<string, CountryAssignmentGroup> =
      {};
    const grandFinalOnlyInitialAssignments: Record<
      string,
      CountryAssignmentGroup
    > = {};

    ALL_COUNTRIES.forEach((country) => {
      const countryData = allCountriesForYear.find(
        (c) => c.code === country.code,
      );

      // SEMI_FINALS_AND_GRAND_FINAL initialization
      if (countryData?.isAutoQualified) {
        semiFinalsInitialAssignments[country.code] =
          CountryAssignmentGroup.AUTO_QUALIFIER;
      } else if (countryData?.semiFinalGroup) {
        semiFinalsInitialAssignments[country.code] =
          countryData.semiFinalGroup as CountryAssignmentGroup;
      } else {
        semiFinalsInitialAssignments[country.code] =
          CountryAssignmentGroup.NOT_PARTICIPATING;
      }

      // GRAND_FINAL_ONLY initialization
      if (countryData) {
        if (countryData.isQualified) {
          grandFinalOnlyInitialAssignments[country.code] =
            CountryAssignmentGroup.GRAND_FINAL;
        } else {
          grandFinalOnlyInitialAssignments[country.code] =
            CountryAssignmentGroup.NOT_QUALIFIED;
        }
      } else {
        grandFinalOnlyInitialAssignments[country.code] =
          CountryAssignmentGroup.NOT_PARTICIPATING;
      }
    });

    setCountryAssignments({
      [EventMode.SEMI_FINALS_AND_GRAND_FINAL]: semiFinalsInitialAssignments,
      [EventMode.GRAND_FINAL_ONLY]: grandFinalOnlyInitialAssignments,
    });
  }, [allCountriesForYear]);

  const handleCountryAssignment = (
    countryCode: string,
    group: CountryAssignmentGroup,
  ) => {
    setCountryAssignments((prev) => ({
      ...prev,
      [activeTab]: {
        ...prev[activeTab],
        [countryCode]: group,
      },
    }));
  };

  const handleStartEvent = () => {
    if (activeTab === EventMode.SEMI_FINALS_AND_GRAND_FINAL) {
      const sf2QualifiersCount = sf2Countries.length > 0 ? sf2Qualifiers : 0;
      const totalQualifiers =
        sf1Qualifiers + sf2QualifiersCount + autoQualifiers.length;

      if (totalQualifiers < 11) {
        alert(
          'The total number of qualifiers for the Grand Final must be at least 11.',
        );

        return;
      }
    } else if (activeTab === EventMode.GRAND_FINAL_ONLY) {
      if (grandFinalQualifiers.length < 11) {
        alert(
          'The number of the Grand Final participants must be at least 11.',
        );

        return;
      }
    }

    const allSelectedCountries: BaseCountry[] = Object.entries(
      countryAssignments[activeTab],
    )
      .filter(([, group]) => group !== CountryAssignmentGroup.NOT_PARTICIPATING)
      .map(([countryCode, group]) => {
        const country = ALL_COUNTRIES.find((c) => c.code === countryCode)!;
        const countryDataForYear = allCountriesForYear.find(
          (c) => c.code === countryCode,
        );

        const isAutoQualifier = group === CountryAssignmentGroup.AUTO_QUALIFIER;
        const isGrandFinalist = group === CountryAssignmentGroup.GRAND_FINAL;
        const isSemiFinalist = group === 'SF1' || group === 'SF2';

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
  };

  const getCountryGroupAssignment = (country: BaseCountry) => {
    return countryAssignments[activeTab]?.[country.code];
  };

  // Group countries by their status
  const {
    autoQualifiers,
    grandFinalQualifiers,
    sf1Countries,
    sf2Countries,
    notParticipatingCountries,
    notQualifiedCountries,
  } = useMemo(() => {
    const currentAssignments = countryAssignments[activeTab] || {};

    const autoQualifiers = ALL_COUNTRIES.filter(
      (c) =>
        currentAssignments[c.code] === CountryAssignmentGroup.AUTO_QUALIFIER,
    );
    const grandFinalQualifiers = ALL_COUNTRIES.filter(
      (c) => currentAssignments[c.code] === CountryAssignmentGroup.GRAND_FINAL,
    );
    const sf1Countries = ALL_COUNTRIES.filter(
      (c) => currentAssignments[c.code] === CountryAssignmentGroup.SF1,
    );

    const sf2Countries = ALL_COUNTRIES.filter(
      (c) => currentAssignments[c.code] === CountryAssignmentGroup.SF2,
    );

    const notQualifiedCountries = ALL_COUNTRIES.filter(
      (c) =>
        currentAssignments[c.code] === CountryAssignmentGroup.NOT_QUALIFIED,
    );

    const notParticipatingCountries = ALL_COUNTRIES.filter(
      (c) =>
        currentAssignments[c.code] === CountryAssignmentGroup.NOT_PARTICIPATING,
    );

    return {
      autoQualifiers,
      grandFinalQualifiers,
      sf1Countries,
      sf2Countries,
      notParticipatingCountries,
      notQualifiedCountries,
    };
  }, [countryAssignments, activeTab]);

  if (!isOpen || Object.keys(countryAssignments[activeTab]).length === 0) {
    return null;
  }

  return (
    <Modal
      isOpen={isOpen}
      onClose={canClose ? onClose : undefined}
      overlayClassName="z-[1000]"
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
      <YearSelectBox />

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
          />
        )}

        {isGrandFinalOnly && (
          <GrandFinalOnlySetup
            grandFinalQualifiers={grandFinalQualifiers}
            notQualifiedCountries={notQualifiedCountries}
            onAssignCountryAssignment={handleCountryAssignment}
            getCountryGroupAssignment={getCountryGroupAssignment}
          />
        )}

        <div className="h-px bg-primary-800 w-full my-1" />

        <SectionWrapper
          title="Not Participating"
          countriesCount={notParticipatingCountries.length}
        >
          <CountrySelectionList
            countries={notParticipatingCountries}
            onAssignCountryAssignment={handleCountryAssignment}
            getCountryGroupAssignment={getCountryGroupAssignment}
            availableGroups={
              isGrandFinalOnly ? GRAND_FINAL_GROUPS : SEMI_FINALS_GROUPS
            }
          />
        </SectionWrapper>
      </div>
    </Modal>
  );
};

export default EventSetupModal;
