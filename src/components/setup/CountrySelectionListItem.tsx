import React from 'react';

import { ArrowIcon } from '../../assets/icons/ArrowIcon';
import { PencilIcon } from '../../assets/icons/PencilIcon';
import { getFlagPath } from '../../helpers/getFlagPath';
import { BaseCountry, CountryAssignmentGroup } from '../../models';

export const ASSIGNMENT_GROUP_LABELS: Record<CountryAssignmentGroup, string> = {
  [CountryAssignmentGroup.SF1]: 'Semi-Final 1',
  [CountryAssignmentGroup.SF2]: 'Semi-Final 2',
  [CountryAssignmentGroup.AUTO_QUALIFIER]: 'Auto-Qualifier',
  [CountryAssignmentGroup.NOT_PARTICIPATING]: 'Not Participating',
  [CountryAssignmentGroup.GRAND_FINAL]: 'Grand Final',
  [CountryAssignmentGroup.NOT_QUALIFIED]: 'Not Qualified',
};

interface CountrySelectionListItemProps {
  country: BaseCountry;
  onAssignCountryAssignment?: (
    countryCode: string,
    group: CountryAssignmentGroup,
  ) => void;
  countryGroupAssignment?: CountryAssignmentGroup;
  availableGroups?: CountryAssignmentGroup[];
  onEdit?: (country: BaseCountry) => void;
}

export const CountrySelectionListItem: React.FC<
  CountrySelectionListItemProps
> = ({
  country,
  onAssignCountryAssignment,
  countryGroupAssignment,
  availableGroups = Object.values(CountryAssignmentGroup),
  onEdit,
}) => {
  const handleAssignmentChange = (
    event: React.ChangeEvent<HTMLSelectElement>,
  ) => {
    const newAssignment = event.target.value as CountryAssignmentGroup;

    onAssignCountryAssignment?.(country.code, newAssignment);
  };

  return (
    <div
      className={`flex items-center bg-primary-800 bg-gradient-to-bl from-[10%] from-primary-800 to-primary-700/60 hover:!bg-primary-700 p-2 rounded-md transition-colors duration-300 relative ${
        countryGroupAssignment ? '' : 'pointer-events-none'
      }`}
    >
      <img
        loading="lazy"
        src={country.flag || getFlagPath(country.code)}
        onError={(e) => {
          e.currentTarget.src = getFlagPath('ww');
        }}
        alt={`${country.name} flag`}
        className="w-8 h-6 object-cover flex-none rounded-sm"
      />
      <span
        className="text-sm text-white flex-1 truncate ml-2"
        title={country.name}
      >
        {country.name}
      </span>

      {country.category === 'Custom' && onEdit && (
        <button
          onClick={(e) => {
            e.stopPropagation();
            e.preventDefault();
            onEdit(country);
          }}
          className="ml-2 z-10 relative p-1 rounded-full hover:bg-white/20 double-clickable-area"
          aria-label={`Edit ${country.name}`}
        >
          <PencilIcon className="w-4 h-4 text-white" />
        </button>
      )}

      {countryGroupAssignment && onAssignCountryAssignment && (
        <>
          <ArrowIcon className="text-white w-6 h-6 rotate-90" />
          <select
            value={countryGroupAssignment}
            onChange={handleAssignmentChange}
            className="absolute inset-0 opacity-0 cursor-pointer"
            id={`country-assignment-${country.code}`}
          >
            {availableGroups.map((group) => (
              <option key={group} value={group}>
                {ASSIGNMENT_GROUP_LABELS[group]}
              </option>
            ))}
          </select>
        </>
      )}
    </div>
  );
};
