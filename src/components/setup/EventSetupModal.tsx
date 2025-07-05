import React, { useEffect, useMemo, useRef, useState } from 'react';

import { PlusIcon } from '../../assets/icons/PlusIcon';
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
import CustomCountryModal from './CustomCountryModal';
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
  'Custom',
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

const EventSetupModal = () => {
  const { eventSetupModalOpen, setEventSetupModalOpen } = useCountriesStore();

  const { allCountriesForYear, getAllCountries, customCountries } =
    useCountriesStore();
  const { startEvent, setSemiFinalQualifiers, eventPhase } =
    useScoreboardStore();

  const [activeTab, setActiveTab] = useState<EventMode>(
    EventMode.SEMI_FINALS_AND_GRAND_FINAL,
  );
  const [sf1Qualifiers, setSf1Qualifiers] = useState(10);
  const [sf2Qualifiers, setSf2Qualifiers] = useState(10);
  const [countriesSearch, setCountriesSearch] = useState('');
  const [isCustomCountryModalOpen, setIsCustomCountryModalOpen] =
    useState(false);
  const [countryToEdit, setCountryToEdit] = useState<BaseCountry | undefined>(
    undefined,
  );

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

  const onClose = () => {
    setEventSetupModalOpen(false);
  };

  const handleOpenCreateModal = () => {
    setCountryToEdit(undefined);
    setIsCustomCountryModalOpen(true);
  };

  const handleOpenEditModal = (country: BaseCountry) => {
    setCountryToEdit(country);
    setIsCustomCountryModalOpen(true);
  };

  const handleCloseModal = () => {
    setIsCustomCountryModalOpen(false);
    setCountryToEdit(undefined);
  };

  // Initialize selected countries based on the current year's data
  useEffect(() => {
    const semiFinalsInitialAssignments: Record<string, CountryAssignmentGroup> =
      {};
    const grandFinalOnlyInitialAssignments: Record<
      string,
      CountryAssignmentGroup
    > = {};

    const allCountries = getAllCountries();

    allCountries.forEach((country) => {
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
  }, [allCountriesForYear, getAllCountries, customCountries]);

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

  const handleBulkCountryAssignment = (
    countries: BaseCountry[],
    group: CountryAssignmentGroup,
  ) => {
    const countryCodes = countries.map((c) => c.code);

    setCountryAssignments((prev) => {
      const newAssignments = { ...prev[activeTab] };

      countryCodes.forEach((code) => {
        newAssignments[code] = group;
      });

      return {
        ...prev,
        [activeTab]: newAssignments,
      };
    });
  };

  const handleStartEvent = () => {
    if (activeTab === EventMode.SEMI_FINALS_AND_GRAND_FINAL) {
      const sf2QualifiersCount = sf2Countries.length > 0 ? sf2Qualifiers : 0;
      const totalQualifiers =
        sf1Qualifiers + sf2QualifiersCount + autoQualifiers.length;

      if (
        sf1Qualifiers <= 0 ||
        (sf2Qualifiers <= 0 && sf2Countries.length > 0)
      ) {
        alert('The number of the Semi-Final qualifiers must be at least 1.');

        return;
      }

      if (totalQualifiers < 11) {
        alert(
          'The total number of qualifiers for the Grand Final must be at least 11.',
        );

        return;
      }

      if (sf1Countries.length === 0) {
        alert('There are no countries in the Semi-Final 1.');

        return;
      }

      if (
        sf1Qualifiers >= sf1Countries.length ||
        (sf2Qualifiers >= sf2Countries.length && sf2Countries.length > 0)
      ) {
        alert(
          'The number of the Semi-Final qualifiers must be less than the number of participants.',
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

    const allCountries = getAllCountries();
    const allSelectedCountries: BaseCountry[] = Object.entries(
      countryAssignments[activeTab],
    )
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
    const allCountries = getAllCountries();

    const autoQualifiers = allCountries
      .filter(
        (c) =>
          currentAssignments[c.code] === CountryAssignmentGroup.AUTO_QUALIFIER,
      )
      .sort((a, b) => a.name.localeCompare(b.name));

    const grandFinalQualifiers = allCountries
      .filter(
        (c) =>
          currentAssignments[c.code] === CountryAssignmentGroup.GRAND_FINAL,
      )
      .sort((a, b) => a.name.localeCompare(b.name));

    const sf1Countries = allCountries
      .filter((c) => currentAssignments[c.code] === CountryAssignmentGroup.SF1)
      .sort((a, b) => a.name.localeCompare(b.name));

    const sf2Countries = allCountries
      .filter((c) => currentAssignments[c.code] === CountryAssignmentGroup.SF2)
      .sort((a, b) => a.name.localeCompare(b.name));

    const notQualifiedCountries = allCountries
      .filter(
        (c) =>
          currentAssignments[c.code] === CountryAssignmentGroup.NOT_QUALIFIED,
      )
      .sort((a, b) => a.name.localeCompare(b.name));

    const notParticipatingCountries = allCountries
      .filter(
        (c) =>
          currentAssignments[c.code] ===
          CountryAssignmentGroup.NOT_PARTICIPATING,
      )
      .sort((a, b) => a.name.localeCompare(b.name));

    return {
      autoQualifiers,
      grandFinalQualifiers,
      sf1Countries,
      sf2Countries,
      notParticipatingCountries,
      notQualifiedCountries,
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [countryAssignments, activeTab, customCountries, getAllCountries]);

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

      if (!groups['Custom']) {
        groups['Custom'] = [];
      }

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

  if (
    !eventSetupModalOpen ||
    Object.keys(countryAssignments[activeTab]).length === 0
  ) {
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
      <YearSelectBox />
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
              onBulkAssign={(group) =>
                handleBulkCountryAssignment(
                  groupedNotParticipatingCountries[category],
                  group,
                )
              }
              availableGroups={
                isGrandFinalOnly ? GRAND_FINAL_GROUPS : SEMI_FINALS_GROUPS
              }
              currentGroup={CountryAssignmentGroup.NOT_PARTICIPATING}
              getLabel={
                category === 'Custom'
                  ? (itemsCount) => (itemsCount === 1 ? 'entry' : 'entries')
                  : undefined
              }
            >
              <CountrySelectionList
                countries={groupedNotParticipatingCountries[category]}
                onAssignCountryAssignment={handleCountryAssignment}
                getCountryGroupAssignment={getCountryGroupAssignment}
                availableGroups={
                  isGrandFinalOnly ? GRAND_FINAL_GROUPS : SEMI_FINALS_GROUPS
                }
                onEdit={handleOpenEditModal}
                extraContent={
                  category === 'Custom' && (
                    <Button
                      onClick={handleOpenCreateModal}
                      className="normal-case sm:!text-base !text-sm mr-1 !py-2 w-fit"
                    >
                      <PlusIcon className="w-6 h-6" />
                    </Button>
                  )
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
