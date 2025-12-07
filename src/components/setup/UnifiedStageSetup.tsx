import { useTranslations } from 'next-intl';
import React from 'react';

import { PencilIcon } from '../../assets/icons/PencilIcon';
import { BaseCountry, CountryAssignmentGroup, EventStage } from '../../models';
import Button from '../common/Button';

import { CountrySelectionList } from './CountrySelectionList';
import { AvailableGroup } from './CountrySelectionListItem';
import SectionWrapper from './SectionWrapper';
import { getQualifiersBreakdown } from './utils/getQualifiersBreakdown';

import { PlusIcon } from '@/assets/icons/PlusIcon';
import { useGeneralStore } from '@/state/generalStore';

interface UnifiedStageSetupProps {
  eventStages: EventStage[];
  onAssignCountryAssignment: (countryCode: string, group: string) => void;
  getCountryGroupAssignment: (country: BaseCountry) => string;
  onBulkAssign: (countries: BaseCountry[], group: string) => void;
  onEditStage: (stage: EventStage) => void;
  availableGroups: AvailableGroup[];
  notQualifiedCountries: BaseCountry[];
}

const UnifiedStageSetup: React.FC<UnifiedStageSetupProps> = ({
  eventStages,
  onAssignCountryAssignment,
  getCountryGroupAssignment,
  onBulkAssign,
  onEditStage,
  availableGroups,
  notQualifiedCountries,
}) => {
  const t = useTranslations();
  const isGfOnly = useGeneralStore((state) => state.isGfOnly);
  // Sort stages by order
  const sortedStages = [...eventStages].sort(
    (a, b) => (a.order ?? 0) - (b.order ?? 0),
  );

  return (
    <div className="flex flex-col gap-2">
      {sortedStages.map((stage) => {
        const qualifiersBreakdown = getQualifiersBreakdown(stage, eventStages);

        return (
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
            <div className="flex flex-col gap-2">
              <CountrySelectionList
                countries={stage.countries}
                onAssignCountryAssignment={onAssignCountryAssignment}
                getCountryGroupAssignment={getCountryGroupAssignment}
                availableGroups={availableGroups}
              />
              {qualifiersBreakdown && qualifiersBreakdown.length > 0 && (
                <div className="text-sm text-white/80 mb-2">
                  <h4 className="middle-line text-sm">
                    {t('setup.eventSetupModal.qualifiers')}
                  </h4>
                  <div className="flex flex-wrap gap-2 mt-1">
                    {qualifiersBreakdown.map((q) => (
                      <div
                        key={q.sourceStageName}
                        className="bg-primary-700 bg-gradient-to-tl from-primary-900 to-primary-900/30 px-3 py-2 rounded-md shadow-sm flex items-center gap-1"
                      >
                        <PlusIcon className="w-5 h-5 text-white" />{' '}
                        {t.rich('setup.eventStageModal.qualifiersFrom', {
                          amount: q.amount,
                          sourceStageName: q.sourceStageName,
                          span: (chunks) => (
                            <span className="font-medium text-white">
                              {chunks}
                            </span>
                          ),
                          span2: (chunks) => (
                            <span className="text-white">{chunks}</span>
                          ),
                        })}
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </SectionWrapper>
        );
      })}

      {isGfOnly && (
        <SectionWrapper
          title={t('setup.eventSetupModal.notQualified')}
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
      )}
    </div>
  );
};

export default UnifiedStageSetup;
