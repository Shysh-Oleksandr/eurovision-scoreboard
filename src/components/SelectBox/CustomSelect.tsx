import React, { useState, useRef, useEffect } from 'react';

import { ArrowIcon } from '../../assets/icons/ArrowIcon';
import { Year } from '../../config';
import { themes } from '../../theme/themes';

type Option = {
  label: string;
  value: string;
  imageUrl?: string;
};

type CustomSelectProps = {
  options: Option[];
  value: string;
  onChange: (value: string) => void;
  className?: string;
  id?: string;
  label?: string;
};

const getThemeColor = (year: string) => {
  const theme = themes[year as Year];

  return theme ? theme.colors.primary[700] : '#FFFFFF'; // Default color
};

const SelectDisplay: React.FC<{
  value: string;
  options: Option[];
}> = ({ value, options }) => {
  const selectedOption = options.find((option) => option.value === value);

  return (
    <div className="select md:h-12 h-10 lg:!text-base !text-sm lg:px-5 md:px-4 sm:px-3 px-3 lg:py-3 !pl-2 py-[10px] w-full flex items-center justify-between cursor-pointer">
      <div className="flex items-center">
        {selectedOption?.imageUrl ? (
          <img
            src={selectedOption.imageUrl}
            alt={selectedOption.label}
            className="w-6 h-6 mr-2"
          />
        ) : (
          <span
            className="w-4 h-4 rounded-full mr-2.5 mb-0.5"
            style={{
              backgroundColor: getThemeColor(selectedOption!.value),
            }}
          ></span>
        )}
        {selectedOption?.label}
      </div>
      <ArrowIcon
        className={`text-white w-7 h-7 rotate-90 absolute lg:right-2.5 md:right-2 right-1`}
      />
    </div>
  );
};

const SelectLabel: React.FC<{ label?: string; id?: string }> = ({
  label,
  id,
}) => {
  if (!label) return null;

  return (
    <label htmlFor={id} className="text-xs text-white">
      {label}
    </label>
  );
};

const SelectContainer: React.FC<{
  children: React.ReactNode;
  className?: string;
  id?: string;
}> = ({ children, className = '', id }) => {
  return (
    <div
      className={`relative sm:min-w-[130px] min-w-[110px] ${className}`}
      id={id}
    >
      {children}
    </div>
  );
};

const CustomSelect: React.FC<CustomSelectProps> = ({
  options,
  value,
  onChange,
  className = '',
  id,
  label,
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [isTouchDevice, setIsTouchDevice] = useState(false);
  const selectRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setIsTouchDevice('ontouchstart' in window || navigator.maxTouchPoints > 0);
  }, []);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        selectRef.current &&
        !selectRef.current.contains(event.target as Node)
      ) {
        setIsOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  const handleOptionClick = (optionValue: string) => {
    onChange(optionValue);
    setIsOpen(false);
  };

  const renderTouchSelect = () => (
    <SelectContainer className={className} id={id}>
      <SelectDisplay value={value} options={options} />
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="absolute top-0 left-0 w-full h-full opacity-0"
      >
        {options.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
    </SelectContainer>
  );

  const renderDesktopSelect = () => (
    <SelectContainer className={`z-30 ${className}`} id={id}>
      <div
        ref={selectRef}
        onClick={() => setIsOpen(!isOpen)}
        className="relative"
      >
        <SelectDisplay value={value} options={options} />
        {isOpen && (
          <div className="absolute z-10 w-full mt-1 bg-primary-900 rounded-md shadow-lg md:max-h-[300px] max-h-[200px] overflow-y-auto">
            <ul className="py-1">
              {options.map((option) => (
                <li
                  key={option.value}
                  className={`px-3 py-2 text-base text-white cursor-pointer transition-colors duration-300 hover:bg-primary-800 flex items-center ${
                    option.value === value ? 'bg-primary-800' : ''
                  }`}
                  onClick={() => handleOptionClick(option.value)}
                >
                  {option.imageUrl ? (
                    <img
                      src={option.imageUrl}
                      alt={option.label}
                      className="w-5 h-5 mr-3"
                    />
                  ) : (
                    <span
                      className="w-4 h-4 rounded-full mr-3"
                      style={{ backgroundColor: getThemeColor(option.value) }}
                    ></span>
                  )}
                  {option.label}
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>
    </SelectContainer>
  );

  return (
    <div className="flex flex-col">
      <SelectLabel label={label} id={id} />
      {isTouchDevice ? renderTouchSelect() : renderDesktopSelect()}
    </div>
  );
};

export default CustomSelect;
