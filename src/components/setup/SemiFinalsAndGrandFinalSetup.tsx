import { useTranslations } from 'next-intl';
import React from 'react';

import {
  BaseCountry,
  CountryAssignmentGroup,
  EventStage,
  StageId,
} from '../../models';
import Button from '../common/Button';

import AddEventStageButton from './AddEventStageButton';
import { CountrySelectionList } from './CountrySelectionList';
import { AvailableGroup } from './CountrySelectionListItem';
import SectionWrapper from './SectionWrapper';

import { PencilIcon } from '@/assets/icons/PencilIcon';

type SetupEventStage = Omit<EventStage, 'countries'> & {
  countries: BaseCountry[];
};

interface SemiFinalsAndGrandFinalSetupProps {
  eventStages: SetupEventStage[];
  grandFinalStage?: SetupEventStage;
  autoQualifiers: BaseCountry[];
  onAssignCountryAssignment: (countryCode: string, group: string) => void;
  getCountryGroupAssignment: (country: BaseCountry) => string;
  onBulkAssign: (countries: BaseCountry[], group: string) => void;
  onEditStage: (stage: EventStage) => void;
  onCreateStage: () => void;
  availableGroups: AvailableGroup[];
}

const SemiFinalsAndGrandFinalSetup: React.FC<
  SemiFinalsAndGrandFinalSetupProps
> = ({
  eventStages,
  autoQualifiers,
  grandFinalStage,
  onAssignCountryAssignment,
  getCountryGroupAssignment,
  onBulkAssign,
  onEditStage,
  onCreateStage,
  availableGroups,
}) => {
  const t = useTranslations('setup.eventSetupModal');

  return (
    <div className="flex flex-col gap-3">
      <SectionWrapper
        title={t('autoQualifiers')}
        countriesCount={autoQualifiers.length}
        defaultExpanded
        onBulkAssign={(group) => onBulkAssign(autoQualifiers, group)}
        availableGroups={availableGroups}
        currentGroup={CountryAssignmentGroup.AUTO_QUALIFIER}
      >
        <CountrySelectionList
          countries={autoQualifiers}
          onAssignCountryAssignment={onAssignCountryAssignment}
          getCountryGroupAssignment={getCountryGroupAssignment}
          availableGroups={availableGroups}
        />
      </SectionWrapper>
      {eventStages
        .filter((stage) => stage.id !== StageId.GF)
        .map((stage) => (
          <SectionWrapper
            key={stage.id}
            title={stage.name}
            countriesCount={stage.countries.length}
            defaultExpanded
            onBulkAssign={(group) => onBulkAssign(stage.countries, group)}
            availableGroups={availableGroups}
            currentGroup={stage.id}
            extraContent={
              <Button
                onClick={(e) => {
                  e.stopPropagation();
                  onEditStage(stage as EventStage);
                }}
                className="!p-2"
                aria-label={`Edit ${stage.name}`}
                title={`Edit ${stage.name}`}
              >
                <PencilIcon className="w-5 h-5" />
              </Button>
            }
          >
            <CountrySelectionList
              countries={stage.countries}
              onAssignCountryAssignment={onAssignCountryAssignment}
              getCountryGroupAssignment={getCountryGroupAssignment}
              availableGroups={availableGroups}
            />
          </SectionWrapper>
        ))}
      {grandFinalStage && (
        <SectionWrapper
          title={grandFinalStage.name}
          defaultExpanded
          isCollapsible={false}
          extraContent={
            <Button
              onClick={(e) => {
                e.stopPropagation();
                onEditStage(grandFinalStage as EventStage);
              }}
              className="!p-2"
              aria-label={`Edit ${grandFinalStage.name}`}
              title={`Edit ${grandFinalStage.name}`}
            >
              <PencilIcon className="w-5 h-5" />
            </Button>
          }
        />
      )}
      <AddEventStageButton onClick={onCreateStage} />
    </div>
  );
};

export default SemiFinalsAndGrandFinalSetup;
