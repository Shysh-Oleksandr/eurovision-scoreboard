import React from 'react';

import { BaseCountry, CountryAssignmentGroup } from '../../models';

const ASSIGNMENT_GROUP_LABELS: Record<CountryAssignmentGroup, string> = {
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
}

export const CountrySelectionListItem: React.FC<
  CountrySelectionListItemProps
> = ({
  country,
  onAssignCountryAssignment,
  countryGroupAssignment,
  availableGroups = Object.values(CountryAssignmentGroup),
}) => {
  const handleAssignmentChange = (
    event: React.ChangeEvent<HTMLSelectElement>,
  ) => {
    const newAssignment = event.target.value as CountryAssignmentGroup;

    onAssignCountryAssignment?.(country.code, newAssignment);
  };

  return (
    <div
      className={`flex items-center bg-primary-800 bg-gradient-to-bl from-[10%] from-primary-800 to-primary-700/60 hover:!bg-primary-700 gap-2 p-2 rounded-md transition-colors duration-300 relative ${
        countryGroupAssignment ? '' : 'pointer-events-none'
      }`}
    >
      <div>
        <img
          src={country.flag}
          alt={`${country.name} flag`}
          className="w-8 h-6 object-cover flex-none rounded-sm"
        />
      </div>

      <span className="text-sm text-white flex-1 truncate" title={country.name}>
        {country.name}
      </span>

      {countryGroupAssignment && onAssignCountryAssignment && (
        <>
          <div className="w-6 h-6 bg-[url(https://upload.wikimedia.org/wikipedia/commons/9/9d/Caret_down_font_awesome_whitevariation.svg)] bg-no-repeat bg-center bg-[length:18px_18px]"></div>
          <select
            value={countryGroupAssignment}
            onChange={handleAssignmentChange}
            className="absolute inset-0 opacity-0 cursor-pointer"
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
