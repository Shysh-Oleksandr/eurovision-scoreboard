import React, { useEffect, useState } from 'react';

import { ArrowIcon } from '../../assets/icons/ArrowIcon';

interface CollapsibleSectionProps {
  title: string;
  children?: React.ReactNode;
  isExpanded?: boolean;
  onToggle?: () => void;
  defaultExpanded?: boolean;
  extraContent?: React.ReactNode;
  headerClassName?: string;
  titleClassName?: string;
  contentClassName?: string;
  overflowClassName?: string;
  extraContentClassName?: string;
  isChildSection?: boolean;
}

export const CollapsibleSection: React.FC<CollapsibleSectionProps> = ({
  children,
  title,
  isExpanded: controlledIsExpanded,
  onToggle,
  defaultExpanded = false,
  extraContent,
  headerClassName = '',
  titleClassName = '',
  contentClassName = '',
  overflowClassName = '',
  extraContentClassName = '',
  isChildSection = false,
}) => {
  const [internalIsExpanded, setInternalIsExpanded] = useState(defaultExpanded);
  const [hasBeenOpened, setHasBeenOpened] = useState(defaultExpanded);

  const isControlled = controlledIsExpanded !== undefined;
  const isExpanded = isControlled ? controlledIsExpanded! : internalIsExpanded;

  useEffect(() => {
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

  return (
    <div
      className={`rounded-lg ${
        isChildSection
          ? 'bg-gradient-to-bl bg-primary-900 from-primary-800 to-primary-700/50'
          : 'bg-gradient-to-tl bg-primary-800 from-primary-900 to-primary-800'
      }`}
    >
      <div
        className={`flex flex-wrap justify-between items-center cursor-pointer sm:p-4 p-3 sm:pl-3 pl-2 gap-1 ${
          headerClassName ?? ''
        }`}
        onClick={handleToggle}
      >
        <div className="flex items-center sm:gap-2.5 gap-1.5">
          <span
            className={`transition-transform duration-[400ms] transform ${
              isExpanded ? 'rotate-90' : ''
            }`}
          >
            <ArrowIcon className="text-white w-7 h-7" />
          </span>
          <h3
            className={`text-base sm:text-lg font-semibold text-white ${
              titleClassName ?? ''
            }`}
          >
            {title}
          </h3>
        </div>
        {extraContent && (
          <div
            className={`flex items-center gap-2 ml-auto ${
              extraContentClassName ?? ''
            }`}
          >
            {extraContent}
          </div>
        )}
      </div>

      <div
        className={`grid transition-all duration-[400ms] ${
          isExpanded
            ? 'grid-rows-[1fr] opacity-100'
            : 'grid-rows-[0fr] opacity-0'
        }`}
      >
        <div className={`overflow-hidden ${overflowClassName ?? ''}`}>
          <div
            className={`p-4 pt-3 border-t border-primary-800 border-solid ${contentClassName}`}
          >
            {hasBeenOpened && children}
          </div>
        </div>
      </div>
    </div>
  );
};
