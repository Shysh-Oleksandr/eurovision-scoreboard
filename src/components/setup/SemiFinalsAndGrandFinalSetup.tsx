import React from 'react';

import { BaseCountry, CountryAssignmentGroup } from '../../models';

import { CountrySelectionList } from './CountrySelectionList';
import SectionWrapper from './SectionWrapper';

interface SemiFinalsAndGrandFinalSetupProps {
  sf1Qualifiers: number;
  sf2Qualifiers: number;
  setSf1Qualifiers: (value: number) => void;
  setSf2Qualifiers: (value: number) => void;
  autoQualifiers: BaseCountry[];
  sf1Countries: BaseCountry[];
  sf2Countries: BaseCountry[];
  onAssignCountryAssignment: (
    countryCode: string,
    group: CountryAssignmentGroup,
  ) => void;
  getCountryGroupAssignment: (country: BaseCountry) => CountryAssignmentGroup;
}

const SEMI_FINALS_GROUPS = [
  CountryAssignmentGroup.SF1,
  CountryAssignmentGroup.SF2,
  CountryAssignmentGroup.AUTO_QUALIFIER,
  CountryAssignmentGroup.NOT_PARTICIPATING,
];

const SemiFinalsAndGrandFinalSetup: React.FC<
  SemiFinalsAndGrandFinalSetupProps
> = ({
  sf1Qualifiers,
  sf2Qualifiers,
  setSf1Qualifiers,
  setSf2Qualifiers,
  autoQualifiers,
  sf1Countries,
  sf2Countries,
  onAssignCountryAssignment,
  getCountryGroupAssignment,
}) => {
  const hasOneSemiFinal = sf2Countries.length === 0;

  const semiFinals = [
    {
      group: 'SF1',
      title: hasOneSemiFinal ? 'Semi-Final' : 'Semi-Final 1',
      countries: sf1Countries,
      qualifiers: sf1Qualifiers,
      setQualifiers: setSf1Qualifiers,
    },
    {
      group: 'SF2',
      title: 'Semi-Final 2',
      countries: sf2Countries,
      qualifiers: sf2Qualifiers,
      setQualifiers: setSf2Qualifiers,
      // TODO: add a note that this year had only one semi-final
    },
  ];

  return (
    <>
      <div className="flex flex-col gap-3">
        {semiFinals.map((semiFinal) => (
          <SectionWrapper
            key={semiFinal.group}
            title={semiFinal.title}
            countriesCount={semiFinal.countries.length}
            defaultExpanded
          >
            <div className="mb-2 flex items-center gap-2">
              <label className="block text-sm text-white">
                Number of qualifiers:
              </label>
              <input
                type="number"
                value={semiFinal.qualifiers || ''}
                onChange={(e) => {
                  semiFinal.setQualifiers(parseInt(e.target.value));
                }}
                className="bg-primary-900 bg-gradient-to-bl from-[10%] from-primary-900 to-primary-800/40 shadow-sm text-white px-3 py-1 rounded w-18 transition-colors duration-300 hover:bg-primary-950 focus:bg-primary-950"
                min={1}
                max={semiFinal.countries.length}
              />
            </div>
            <CountrySelectionList
              countries={semiFinal.countries}
              onAssignCountryAssignment={onAssignCountryAssignment}
              getCountryGroupAssignment={getCountryGroupAssignment}
              availableGroups={SEMI_FINALS_GROUPS}
            />
          </SectionWrapper>
        ))}
      </div>
      <SectionWrapper
        title="Auto-Qualifiers"
        countriesCount={autoQualifiers.length}
        defaultExpanded
      >
        <CountrySelectionList
          countries={autoQualifiers}
          onAssignCountryAssignment={onAssignCountryAssignment}
          getCountryGroupAssignment={getCountryGroupAssignment}
          availableGroups={SEMI_FINALS_GROUPS}
        />
      </SectionWrapper>
    </>
  );
};

export default SemiFinalsAndGrandFinalSetup;
