import React, { useEffect, useState } from 'react';

import { ArrowIcon } from '../../assets/icons/ArrowIcon';
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
  const [hasBeenOpened, setHasBeenOpened] = useState(defaultExpanded);

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

  useEffect(() => {
    // Needed for lazy loading of children
    if (isExpanded) {
      setHasBeenOpened(true);
    }
  }, [isExpanded]);

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

  return (
    <div className="bg-primary-800 bg-gradient-to-tl from-primary-900 to-primary-800 rounded-lg">
      <div
        className={`flex flex-wrap justify-between items-center ${
          isCollapsible ? 'cursor-pointer' : ''
        } sm:p-4 p-3 sm:pl-3 pl-2 gap-1`}
        onClick={isCollapsible ? handleToggle : undefined}
      >
        <div className="flex items-center sm:gap-2.5 gap-1.5">
          {isCollapsible && (
            <span
              className={`transition-transform duration-[400ms] transform ${
                isExpanded ? 'rotate-90' : ''
              }`}
            >
              <ArrowIcon className="text-white w-7 h-7" />
            </span>
          )}
          <h3
            className={`text-base sm:text-lg font-semibold text-white ${
              !isCollapsible ? 'pl-2' : ''
            }`}
          >
            {title}
          </h3>
        </div>
        <div className="flex items-center gap-2 ml-auto">
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
        </div>
      </div>

      {isCollapsible && (
        <div
          className={`grid transition-all duration-[400ms] ${
            isExpanded
              ? 'grid-rows-[1fr] opacity-100'
              : 'grid-rows-[0fr] opacity-0'
          }`}
        >
          <div className="overflow-hidden">
            <div className="p-4 pt-3 border-t border-primary-800 border-solid">
              {hasBeenOpened && children}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default SectionWrapper;
