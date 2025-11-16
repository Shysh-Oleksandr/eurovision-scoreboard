import { useTranslations } from 'next-intl';
import React from 'react';

import { PencilIcon } from '../../assets/icons/PencilIcon';
import {
  BaseCountry,
  CountryAssignmentGroup,
  EventStage,
  StageId,
} from '../../models';
import Button from '../common/Button';

import { CountrySelectionList } from './CountrySelectionList';
import { AvailableGroup } from './CountrySelectionListItem';
import SectionWrapper from './SectionWrapper';

interface GrandFinalOnlySetupProps {
  grandFinalStage?: EventStage;
  notQualifiedCountries: BaseCountry[];
  onAssignCountryAssignment: (countryCode: string, group: string) => void;
  getCountryGroupAssignment: (country: BaseCountry) => string;
  onBulkAssign: (countries: BaseCountry[], group: string) => void;
  onEditStage: (stage: EventStage) => void;
  availableGroups: AvailableGroup[];
}

const GrandFinalOnlySetup: React.FC<GrandFinalOnlySetupProps> = ({
  grandFinalStage,
  notQualifiedCountries,
  onAssignCountryAssignment,
  getCountryGroupAssignment,
  onBulkAssign,
  onEditStage,
  availableGroups,
}) => {
  const t = useTranslations('setup.eventSetupModal');

  if (!grandFinalStage) {
    return null;
  }

  return (
    <div className="flex flex-col gap-3">
      <SectionWrapper
        title={grandFinalStage.name}
        countriesCount={grandFinalStage.countries.length}
        defaultExpanded
        onBulkAssign={(group) => onBulkAssign(grandFinalStage.countries, group)}
        availableGroups={availableGroups}
        currentGroup={StageId.GF}
        extraContent={
          <Button
            onClick={(e) => {
              e.stopPropagation();
              onEditStage(grandFinalStage);
            }}
            className="!p-2"
            aria-label={`Edit ${grandFinalStage.name}`}
            title={`Edit ${grandFinalStage.name}`}
          >
            <PencilIcon className="w-5 h-5" />
          </Button>
        }
      >
        <CountrySelectionList
          countries={grandFinalStage.countries}
          onAssignCountryAssignment={onAssignCountryAssignment}
          getCountryGroupAssignment={getCountryGroupAssignment}
          availableGroups={availableGroups}
        />
      </SectionWrapper>
      <SectionWrapper
        title={t('notQualified')}
        countriesCount={notQualifiedCountries.length}
        defaultExpanded
        onBulkAssign={(group) => onBulkAssign(notQualifiedCountries, group)}
        availableGroups={availableGroups}
        currentGroup={CountryAssignmentGroup.NOT_QUALIFIED}
      >
        <CountrySelectionList
          countries={notQualifiedCountries}
          onAssignCountryAssignment={onAssignCountryAssignment}
          getCountryGroupAssignment={getCountryGroupAssignment}
          availableGroups={availableGroups}
        />
      </SectionWrapper>
    </div>
  );
};

export default GrandFinalOnlySetup;
