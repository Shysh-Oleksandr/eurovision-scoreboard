import { CopyCheck, Trash2 } from 'lucide-react';
import { useTranslations } from 'next-intl';
import React, { useCallback, useMemo, useState } from 'react';

import { BaseCountry } from '../../models';
import Button from '../common/Button';
import { CollapsibleSection } from '../common/CollapsibleSection';
import Select from '../common/Select';
import {
  ASSIGNMENT_GROUP_LABELS,
  AvailableGroup,
  isStageGroup,
} from '../setup/CountrySelectionListItem';

import {
  SectionMultiselectContext,
  SectionMultiselectContextValue,
} from './SectionMultiselectContext';

import { useConfirmation } from '@/hooks/useConfirmation';

interface SectionWrapperProps {
  title: string;
  category?: string;
  countries?: BaseCountry[];
  countriesCount?: number;
  children?: React.ReactNode;
  isExpanded?: boolean;
  onToggle?: () => void;
  defaultExpanded?: boolean;
  onBulkAssign?: (countries: BaseCountry[], group: string) => void;
  onBulkDelete?: (countries: BaseCountry[]) => void;
  availableGroups?: AvailableGroup[];
  currentGroup?: string;
  getLabel?: (itemsCount: number) => string;
  extraContent?: React.ReactNode;
  isCollapsible?: boolean;
}

const SectionWrapper: React.FC<SectionWrapperProps> = ({
  children,
  title,
  category,
  countries = [],
  countriesCount: countriesCountProp,
  isExpanded: controlledIsExpanded,
  onToggle,
  defaultExpanded = false,
  onBulkAssign,
  onBulkDelete,
  availableGroups,
  currentGroup,
  getLabel,
  extraContent,
  isCollapsible = true,
}) => {
  const t = useTranslations();
  const [internalIsExpanded, setInternalIsExpanded] = useState(defaultExpanded);
  const [isMultiselectEnabled, setIsMultiselectEnabled] = useState(false);
  const [selectedCountryCodes, setSelectedCountryCodes] = useState<Set<string>>(
    () => new Set(),
  );

  const isControlled = controlledIsExpanded !== undefined;
  const isExpanded = isControlled ? controlledIsExpanded! : internalIsExpanded;

  const countriesCount = countriesCountProp ?? countries.length;
  const selectedCount = selectedCountryCodes.size;
  const displayCount = isMultiselectEnabled ? selectedCount : countriesCount;
  const countriesToAssign = useMemo(() => {
    if (isMultiselectEnabled && selectedCount > 0) {
      return countries.filter((c) => selectedCountryCodes.has(c.code));
    }

    return countries;
  }, [countries, isMultiselectEnabled, selectedCount, selectedCountryCodes]);

  const { confirm } = useConfirmation();

  const multiselectContextValue = useMemo<SectionMultiselectContextValue>(
    () => ({
      isMultiselectEnabled,
      isSelected: (code) => selectedCountryCodes.has(code),
      onToggleSelect: (code) => {
        setSelectedCountryCodes((prev) => {
          const next = new Set(prev);

          if (next.has(code)) {
            next.delete(code);
          } else {
            next.add(code);
          }

          return next;
        });
      },
    }),
    [isMultiselectEnabled, selectedCountryCodes],
  );

  const handleBulkDelete = useCallback(
    (e: React.MouseEvent<HTMLButtonElement>) => {
      e.stopPropagation();
      confirm({
        key: 'delete-custom-entries',
        type: 'danger',
        title: t('settings.confirmations.deleteCustomEntries', {
          count: selectedCount,
        }),
        description: t(
          'settings.confirmations.deleteCustomEntriesDescription',
          {
            count: selectedCount,
          },
        ),
        onConfirm: () => {
          onBulkDelete?.(countriesToAssign);
          setSelectedCountryCodes(new Set());
        },
      });
    },
    [confirm, selectedCount, countriesToAssign, onBulkDelete, t],
  );

  const handleToggleMultiselect = useCallback((e: React.MouseEvent) => {
    e.stopPropagation();
    setIsMultiselectEnabled((prev) => {
      if (prev) {
        setSelectedCountryCodes(new Set());

        return false;
      }

      return true;
    });
  }, []);

  const getAmountLabel = (itemsCount: number) => {
    if (getLabel) {
      return getLabel(itemsCount);
    }

    return t('setup.eventSetupModal.countriesAmount', { count: itemsCount });
  };

  const handleToggle = () => {
    if (onToggle) {
      onToggle();
    } else {
      setInternalIsExpanded((prev) => !prev);
    }
  };

  const handleBulkAssign = (e: React.ChangeEvent<HTMLSelectElement>) => {
    e.stopPropagation();
    onBulkAssign?.(countriesToAssign, e.target.value);
    setSelectedCountryCodes(new Set());
  };

  const headerExtraContent = (
    <>
      {onBulkAssign && availableGroups && currentGroup ? (
        <div className="flex items-center gap-1">
          <div
            className="relative min-w-[120px]"
            onClick={(e) => {
              e.stopPropagation();
            }}
          >
            <Select
              value={currentGroup}
              onChange={handleBulkAssign}
              id={`country-assignment-${title}`}
              disabled={isMultiselectEnabled && selectedCount === 0}
              aria-label={
                isMultiselectEnabled
                  ? `Bulk assign ${selectedCount} selected countries in ${title} to a group`
                  : `Bulk assign all countries in ${title} to a group`
              }
              options={availableGroups.map((group) => {
                if (isStageGroup(group)) {
                  return { value: group.id, label: group.name };
                }

                return {
                  value: group,
                  label: ASSIGNMENT_GROUP_LABELS[group],
                };
              })}
              className="gap-1 justify-between pr-2 pl-3 py-1 bg-primary-800 bg-gradient-to-bl from-[10%] from-primary-900/40 to-primary-800/60 hover:bg-primary-700/40 shadow"
              arrowClassName="!w-6 !h-6 mb-0.5"
            >
              {displayCount !== undefined && (
                <span className="text-white text-sm whitespace-nowrap">
                  {displayCount} {getAmountLabel(displayCount)}
                </span>
              )}
            </Select>
          </div>
          <Button
            onClick={handleToggleMultiselect}
            className={`!p-2 ${
              isMultiselectEnabled
                ? 'ring-primary-700/80 ring-2 ring-solid hover:ring-primary-700/80 to-primary-700/80'
                : ''
            }`}
            aria-label={
              isMultiselectEnabled
                ? `Disable multiselect for ${title}`
                : `Enable multiselect for ${title}`
            }
            title={
              isMultiselectEnabled
                ? `Disable multiselect for ${title}`
                : `Enable multiselect for ${title}`
            }
          >
            <CopyCheck className="w-5 h-5" />
          </Button>
          {isMultiselectEnabled && category === 'Custom' && (
            <Button
              onClick={handleBulkDelete}
              variant="tertiary"
              className={`!p-2 ml-2`}
              aria-label={`Delete ${selectedCount} selected custom entries in ${title}`}
              title={`Delete ${selectedCount} selected custom entries in ${title}`}
            >
              <Trash2 className="w-5 h-5" />
            </Button>
          )}
        </div>
      ) : (
        countriesCount !== undefined && (
          <span className="bg-primary-800 flex-none text-white px-2 py-1 rounded-md shadow text-sm">
            {countriesCount} {getAmountLabel(countriesCount)}
          </span>
        )
      )}
      {extraContent}
    </>
  );

  if (isCollapsible) {
    return (
      <SectionMultiselectContext.Provider value={multiselectContextValue}>
        <CollapsibleSection
          title={title}
          isExpanded={isExpanded}
          onToggle={handleToggle}
          defaultExpanded={defaultExpanded}
          extraContent={headerExtraContent}
        >
          {children}
        </CollapsibleSection>
      </SectionMultiselectContext.Provider>
    );
  }

  return (
    <SectionMultiselectContext.Provider value={multiselectContextValue}>
      <div className="bg-primary-800 bg-gradient-to-tl from-primary-900 to-primary-800 rounded-lg">
        <div
          className={`flex flex-wrap justify-between items-center sm:p-4 p-3 sm:pl-3 pl-2 gap-1`}
        >
          <div className="flex items-center sm:gap-2.5 gap-1.5">
            <h3
              className={`text-base sm:text-lg font-semibold text-white ${
                !isCollapsible ? 'pl-2' : ''
              }`}
            >
              {title}
            </h3>
          </div>
          <div className="flex items-center gap-2 ml-auto">
            {headerExtraContent}
          </div>
        </div>
      </div>
    </SectionMultiselectContext.Provider>
  );
};

export default SectionWrapper;
