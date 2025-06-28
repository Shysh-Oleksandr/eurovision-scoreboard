import React, { useEffect, useState } from 'react';

interface SectionWrapperProps {
  title: string;
  countriesCount?: number;
  children: React.ReactNode;
  isExpanded?: boolean;
  onToggle?: () => void;
  defaultExpanded?: boolean;
}

const SectionWrapper: React.FC<SectionWrapperProps> = ({
  children,
  title,
  countriesCount,
  isExpanded: controlledIsExpanded,
  onToggle,
  defaultExpanded = false,
}) => {
  const [internalIsExpanded, setInternalIsExpanded] = useState(defaultExpanded);
  const [hasBeenOpened, setHasBeenOpened] = useState(defaultExpanded);

  const isControlled = controlledIsExpanded !== undefined;
  const isExpanded = isControlled ? controlledIsExpanded! : internalIsExpanded;

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

  return (
    <div className="bg-primary-800 bg-gradient-to-tl from-primary-900 to-primary-800 rounded-lg">
      <div
        className="flex justify-between items-center cursor-pointer sm:p-4 p-3 sm:pl-3 pl-2 gap-1"
        onClick={handleToggle}
      >
        <div className="flex items-center sm:gap-2.5 gap-1.5">
          <span
            className={`transition-transform duration-[400ms] transform ${
              isExpanded ? 'rotate-90' : ''
            }`}
          >
            <ArrowIcon />
          </span>
          <h3 className="text-base sm:text-lg font-semibold text-white">
            {title}
          </h3>
        </div>
        {countriesCount !== undefined && (
          <span className="bg-primary-800 flex-none text-white px-2 py-1 rounded-md shadow text-sm">
            {countriesCount} countries
          </span>
        )}
      </div>

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
    </div>
  );
};

export default SectionWrapper;

const ArrowIcon = () => {
  return (
    <svg
      width="15"
      height="15"
      viewBox="0 0 15 15"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className="text-white w-7 h-7"
    >
      <path d="M6 11L6 4L10.5 7.5L6 11Z" fill="currentColor"></path>
    </svg>
  );
};
