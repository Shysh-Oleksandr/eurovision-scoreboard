import React, { useState } from 'react';

import { ArrowIcon } from '../../assets/icons/ArrowIcon';
import { CollapsibleSection } from '../common/CollapsibleSection';
import {
  ASSIGNMENT_GROUP_LABELS,
  AvailableGroup,
  isStageGroup,
} from '../setup/CountrySelectionListItem';

interface SectionWrapperProps {
  title: string;
  countriesCount?: number;
  children?: React.ReactNode;
  isExpanded?: boolean;
  onToggle?: () => void;
  defaultExpanded?: boolean;
  onBulkAssign?: (group: string) => void;
  availableGroups?: AvailableGroup[];
  currentGroup?: string;
  getLabel?: (itemsCount: number) => string;
  extraContent?: React.ReactNode;
  isCollapsible?: boolean;
}

const SectionWrapper: React.FC<SectionWrapperProps> = ({
  children,
  title,
  countriesCount,
  isExpanded: controlledIsExpanded,
  onToggle,
  defaultExpanded = false,
  onBulkAssign,
  availableGroups,
  currentGroup,
  getLabel,
  extraContent,
  isCollapsible = true,
}) => {
  const [internalIsExpanded, setInternalIsExpanded] = useState(defaultExpanded);

  const isControlled = controlledIsExpanded !== undefined;
  const isExpanded = isControlled ? controlledIsExpanded! : internalIsExpanded;

  const getAmountLabel = (itemsCount: number) => {
    if (getLabel) {
      return getLabel(itemsCount);
    }
    if (itemsCount === 1) {
      return 'country';
    }

    return 'countries';
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
    onBulkAssign?.(e.target.value);
  };

  const headerExtraContent = (
    <>
      {onBulkAssign && availableGroups && currentGroup ? (
        <div
          className="relative min-w-[120px]"
          onClick={(e) => {
            e.stopPropagation();
          }}
        >
          <div className="flex items-center gap-1 justify-between cursor-pointer pr-2 pl-3 py-1 flex-none rounded-md bg-primary-800 bg-gradient-to-bl from-[10%] from-primary-900/40 to-primary-800/60 hover:bg-primary-700/40 shadow transition-colors duration-300">
            {countriesCount !== undefined && (
              <span className="text-white text-sm whitespace-nowrap">
                {countriesCount} {getAmountLabel(countriesCount)}
              </span>
            )}
            <ArrowIcon className="text-white w-6 h-6 rotate-90 mb-0.5" />
            <select
              value={currentGroup}
              onChange={handleBulkAssign}
              className="absolute inset-0 opacity-0 cursor-pointer select"
              id={`country-assignment-${title}`}
              aria-label={`Bulk assign all countries in ${title} to a group`}
            >
              {availableGroups.map((group) => {
                if (isStageGroup(group)) {
                  return (
                    <option key={group.id} value={group.id}>
                      {group.name}
                    </option>
                  );
                }

                return (
                  <option key={group} value={group}>
                    {ASSIGNMENT_GROUP_LABELS[group]}
                  </option>
                );
              })}
            </select>
          </div>
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
      <CollapsibleSection
        title={title}
        isExpanded={isExpanded}
        onToggle={handleToggle}
        defaultExpanded={defaultExpanded}
        extraContent={headerExtraContent}
      >
        {children}
      </CollapsibleSection>
    );
  }

  return (
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
  );
};

export default SectionWrapper;
