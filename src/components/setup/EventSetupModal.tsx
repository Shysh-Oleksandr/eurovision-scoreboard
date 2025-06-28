import React, { useEffect, useMemo, useRef, useState } from 'react';

import { ALL_COUNTRIES } from '../../data/countries/common-countries';
import { useDebounce } from '../../hooks/useDebounce';
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
import SearchInputIcon from './SearchInputIcon';
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

const categoryOrder = [
  'All-Time Participants',
  'Europe',
  'Asia',
  'Africa',
  'North America',
  'South America',
  'Oceania',
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
  const [countriesSearch, setCountriesSearch] = useState('');

  const debouncedSearch = useDebounce(countriesSearch, 300);

  const [expandedCategories, setExpandedCategories] = useState<
    Record<string, boolean>
  >({});

  const prevDebouncedSearchRef = useRef<string>();

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

  const handleToggleCategory = (category: string) => {
    setExpandedCategories((prev) => ({
      ...prev,
      [category]: !prev[category],
    }));
  };

  const handleCountriesSearch = (e: React.ChangeEvent<HTMLInputElement>) => {
    setCountriesSearch(e.target.value);
  };

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
    ).sort((a, b) => a.name.localeCompare(b.name));

    const grandFinalQualifiers = ALL_COUNTRIES.filter(
      (c) => currentAssignments[c.code] === CountryAssignmentGroup.GRAND_FINAL,
    ).sort((a, b) => a.name.localeCompare(b.name));

    const sf1Countries = ALL_COUNTRIES.filter(
      (c) => currentAssignments[c.code] === CountryAssignmentGroup.SF1,
    ).sort((a, b) => a.name.localeCompare(b.name));

    const sf2Countries = ALL_COUNTRIES.filter(
      (c) => currentAssignments[c.code] === CountryAssignmentGroup.SF2,
    ).sort((a, b) => a.name.localeCompare(b.name));

    const notQualifiedCountries = ALL_COUNTRIES.filter(
      (c) =>
        currentAssignments[c.code] === CountryAssignmentGroup.NOT_QUALIFIED,
    ).sort((a, b) => a.name.localeCompare(b.name));

    const notParticipatingCountries = ALL_COUNTRIES.filter(
      (c) =>
        currentAssignments[c.code] === CountryAssignmentGroup.NOT_PARTICIPATING,
    ).sort((a, b) => a.name.localeCompare(b.name));

    return {
      autoQualifiers,
      grandFinalQualifiers,
      sf1Countries,
      sf2Countries,
      notParticipatingCountries,
      notQualifiedCountries,
    };
  }, [countryAssignments, activeTab]);

  const { groups: groupedNotParticipatingCountries, sortedCategories } =
    useMemo((): {
      groups: Record<string, BaseCountry[]>;
      sortedCategories: string[];
    } => {
      const groups: Record<string, BaseCountry[]> = {};

      const filteredNotParticipatingCountries =
        notParticipatingCountries.filter((country) =>
          country.name
            .toLowerCase()
            .includes(debouncedSearch.trim().toLowerCase()),
        );

      filteredNotParticipatingCountries.forEach((country) => {
        const category = country.category || 'Other';

        if (!groups[category]) {
          groups[category] = [];
        }
        groups[category].push(country);
      });

      // Sort countries within each category alphabetically
      Object.keys(groups).forEach((category) => {
        groups[category].sort((a, b) => a.name.localeCompare(b.name));
      });

      const sortedCategories = Object.keys(groups).sort((a, b) => {
        const aIndex = categoryOrder.indexOf(a);
        const bIndex = categoryOrder.indexOf(b);

        if (aIndex === -1 && bIndex === -1) return a.localeCompare(b);
        if (aIndex === -1) return 1;
        if (bIndex === -1) return -1;

        return aIndex - bIndex;
      });

      return { groups, sortedCategories };
    }, [notParticipatingCountries, debouncedSearch]);

  useEffect(() => {
    if (debouncedSearch !== prevDebouncedSearchRef.current) {
      if (debouncedSearch.trim()) {
        const newExpanded: Record<string, boolean> = {};

        sortedCategories.forEach((category) => {
          newExpanded[category] = true;
        });
        setExpandedCategories(newExpanded);
      } else {
        setExpandedCategories({});
      }
    }

    prevDebouncedSearchRef.current = debouncedSearch;
  }, [debouncedSearch, sortedCategories]);

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

        <div className="flex items-center justify-between gap-2">
          <p className="text-white text-base md:text-lg font-semibold">
            Not Participating
          </p>
          <div className="relative">
            <input
              className="sm:max-w-[200px] w-full py-3 pl-3 pr-10 rounded-md bg-primary-900 bg-gradient-to-bl from-[10%] from-primary-900 to-primary-800/60 transition-colors duration-300 placeholder:text-white/55 text-white lg:text-[0.95rem] text-sm border-solid border-transparent border-b-2 hover:bg-primary-800 focus:bg-primary-800 focus:border-white "
              name="countriesSearch"
              id="countriesSearch"
              placeholder="Search countries..."
              value={countriesSearch}
              onChange={handleCountriesSearch}
            />
            <SearchInputIcon
              showClearIcon={countriesSearch.length > 0}
              onClick={() =>
                countriesSearch.length > 0 && setCountriesSearch('')
              }
            />
          </div>
        </div>
        <div className="flex flex-col gap-2">
          {sortedCategories.map((category) => (
            <SectionWrapper
              key={category}
              title={category}
              countriesCount={groupedNotParticipatingCountries[category].length}
              isExpanded={!!expandedCategories[category]}
              onToggle={() => handleToggleCategory(category)}
            >
              <CountrySelectionList
                countries={groupedNotParticipatingCountries[category]}
                onAssignCountryAssignment={handleCountryAssignment}
                getCountryGroupAssignment={getCountryGroupAssignment}
                availableGroups={
                  isGrandFinalOnly ? GRAND_FINAL_GROUPS : SEMI_FINALS_GROUPS
                }
              />
            </SectionWrapper>
          ))}
        </div>
      </div>
    </Modal>
  );
};

export default EventSetupModal;
