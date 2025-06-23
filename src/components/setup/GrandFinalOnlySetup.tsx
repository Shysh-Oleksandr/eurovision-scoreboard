import React from 'react';

import { BaseCountry, CountryAssignmentGroup } from '../../models';

import { CountrySelectionList } from './CountrySelectionList';
import SectionWrapper from './SectionWrapper';

interface GrandFinalOnlySetupProps {
  grandFinalQualifiers: BaseCountry[];
  notQualifiedCountries: BaseCountry[];
  onAssignCountryAssignment: (
    countryCode: string,
    group: CountryAssignmentGroup,
  ) => void;
  getCountryGroupAssignment: (country: BaseCountry) => CountryAssignmentGroup;
}

const GRAND_FINAL_GROUPS = [
  CountryAssignmentGroup.GRAND_FINAL,
  CountryAssignmentGroup.NOT_QUALIFIED,
  CountryAssignmentGroup.NOT_PARTICIPATING,
];

const GrandFinalOnlySetup: React.FC<GrandFinalOnlySetupProps> = ({
  grandFinalQualifiers,
  notQualifiedCountries,
  onAssignCountryAssignment,
  getCountryGroupAssignment,
}) => {
  return (
    <div className="flex flex-col gap-3">
      <SectionWrapper
        title="Grand Final"
        countriesCount={grandFinalQualifiers.length}
      >
        <CountrySelectionList
          countries={grandFinalQualifiers}
          onAssignCountryAssignment={onAssignCountryAssignment}
          getCountryGroupAssignment={getCountryGroupAssignment}
          availableGroups={GRAND_FINAL_GROUPS}
        />
      </SectionWrapper>
      <SectionWrapper
        title="Not Qualified"
        countriesCount={notQualifiedCountries.length}
      >
        <CountrySelectionList
          countries={notQualifiedCountries}
          onAssignCountryAssignment={onAssignCountryAssignment}
          getCountryGroupAssignment={getCountryGroupAssignment}
          availableGroups={GRAND_FINAL_GROUPS}
        />
      </SectionWrapper>
    </div>
  );
};

export default GrandFinalOnlySetup;
