import React from 'react';

import { ArrowIcon } from '../../assets/icons/ArrowIcon';
import { PencilIcon } from '../../assets/icons/PencilIcon';
import { getFlagPath } from '../../helpers/getFlagPath';
import { BaseCountry, CountryAssignmentGroup } from '../../models';

import { useGeneralStore } from '@/state/generalStore';
import { getHostingCountryLogo } from '@/theme/hosting';

export const ASSIGNMENT_GROUP_LABELS: Record<string, string> = {
  [CountryAssignmentGroup.AUTO_QUALIFIER]: 'Auto-Qualifier',
  [CountryAssignmentGroup.SF1]: 'Semi-Final 1',
  [CountryAssignmentGroup.SF2]: 'Semi-Final 2',
  [CountryAssignmentGroup.NOT_PARTICIPATING]: 'Not Participating',
  [CountryAssignmentGroup.NOT_QUALIFIED]: 'Not Qualified',
};

export type AvailableGroup =
  | { id: string; name: string }
  | CountryAssignmentGroup;

export const isStageGroup = (
  group: AvailableGroup,
): group is { id: string; name: string } => {
  return (group as { id: string; name: string }).id !== undefined;
};

interface CountrySelectionListItemProps {
  country: BaseCountry;
  onAssignCountryAssignment?: (countryCode: string, group: string) => void;
  countryGroupAssignment?: string;
  availableGroups?: AvailableGroup[];
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
  const shouldShowHeartFlagIcon = useGeneralStore(
    (state) => state.settings.shouldShowHeartFlagIcon,
  );
  const shouldLazyLoad =
    countryGroupAssignment !== CountryAssignmentGroup.SF1 &&
    countryGroupAssignment !== CountryAssignmentGroup.SF2;

  const handleAssignmentChange = (
    event: React.ChangeEvent<HTMLSelectElement>,
  ) => {
    const newAssignment = event.target.value;

    onAssignCountryAssignment?.(country.code, newAssignment);
  };

  const { logo, isExisting } = getHostingCountryLogo(
    country,
    shouldShowHeartFlagIcon,
  );

  return (
    <div
      className={`flex items-center bg-primary-800 bg-gradient-to-bl from-[10%] from-primary-800 to-primary-700/60 hover:!bg-primary-700 p-2 rounded-md transition-colors duration-300 relative ${
        countryGroupAssignment ? '' : 'pointer-events-none'
      }`}
    >
      <img
        loading={shouldLazyLoad ? 'lazy' : 'eager'}
        src={logo}
        onError={(e) => {
          e.currentTarget.src = getFlagPath('ww');
        }}
        alt={`${country.name} flag`}
        className={`flex-none rounded-sm ${
          isExisting ? 'w-7 h-7' : 'w-8 h-6 object-cover'
        }`}
        width={32}
        height={28}
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
            className="absolute inset-0 opacity-0 cursor-pointer select"
            id={`country-assignment-${country.code}`}
            aria-label={`Assign ${country.name} to a group`}
          >
            {availableGroups.map((group) => {
              const value = isStageGroup(group) ? group.id : group;
              const label = isStageGroup(group)
                ? group.name
                : ASSIGNMENT_GROUP_LABELS[group];

              return (
                <option key={value} value={value}>
                  {label}
                </option>
              );
            })}
          </select>
        </>
      )}
    </div>
  );
};
