import React from 'react';

import { BaseCountry } from '../../models';

import {
  AvailableGroup,
  CountrySelectionListItem,
} from './CountrySelectionListItem';

interface CountrySelectionListProps {
  countries: BaseCountry[];
  onAssignCountryAssignment: (countryCode: string, group: string) => void;
  getCountryGroupAssignment: (country: BaseCountry) => string;
  availableGroups?: AvailableGroup[];
  extraContent?: React.ReactNode;
  onEdit?: (country: BaseCountry) => void;
}

export const CountrySelectionList: React.FC<CountrySelectionListProps> = ({
  countries,
  onAssignCountryAssignment,
  getCountryGroupAssignment,
  availableGroups,
  extraContent,
  onEdit,
}) => {
  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-2">
      {countries.map((country) => (
        <CountrySelectionListItem
          key={country.code}
          country={country}
          countryGroupAssignment={getCountryGroupAssignment(country)}
          onAssignCountryAssignment={onAssignCountryAssignment}
          availableGroups={availableGroups}
          onEdit={onEdit}
        />
      ))}
      {extraContent}
    </div>
  );
};
