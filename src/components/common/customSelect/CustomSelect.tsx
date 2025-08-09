import React, { useState, useRef, useEffect } from 'react';
import { createPortal } from 'react-dom';

import { ArrowIcon } from '../../../assets/icons/ArrowIcon';
import { Year } from '../../../config';
import { themes } from '../../../theme/themes';

import { useTouchDevice } from '@/hooks/useTouchDevice';

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
  imageClassName?: string;
};

const getThemeColor = (year: string) => {
  const theme = themes[year as Year];

  return theme ? theme.colors.primary[700] : '#FFFFFF'; // Default color
};

const SelectDisplay: React.FC<{
  value: string;
  options: Option[];
  imageClassName?: string;
}> = ({ value, options, imageClassName }) => {
  const selectedOption = options.find((option) => option.value === value);

  return (
    <div className="select h-12 lg:!text-base !text-sm lg:px-5 sm:px-4 px-3 lg:py-3 !pl-2 py-[10px] w-full flex items-center justify-between cursor-pointer">
      <div className="flex items-center">
        {selectedOption?.imageUrl ? (
          <img
            src={selectedOption.imageUrl}
            alt={selectedOption.label}
            className={`w-6 h-6 mr-2 object-cover ${imageClassName ?? ''}`}
            width={24}
            height={24}
          />
        ) : (
          <span
            className="w-4 h-4 rounded-full mr-2.5 mb-0.5"
            style={{
              backgroundColor: getThemeColor(selectedOption?.value ?? ''),
            }}
          ></span>
        )}
        {selectedOption?.label}
      </div>
      <ArrowIcon
        className={`text-white w-7 h-7 rotate-90 absolute lg:right-2.5 sm:right-2 right-1`}
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
}> = ({ children, className = '' }) => {
  return (
    <div className={`relative sm:min-w-[130px] min-w-[110px] ${className}`}>
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
  imageClassName,
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const selectRef = useRef<HTMLDivElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const [dropdownStyle, setDropdownStyle] = useState<React.CSSProperties>({});
  const isTouchDevice = useTouchDevice();

  useEffect(() => {
    const handlePointerDownOutside = (event: PointerEvent) => {
      const targetNode = event.target as Node;
      const clickedInsideSelect = !!(
        selectRef.current && selectRef.current.contains(targetNode)
      );
      const clickedInsideDropdown = !!(
        dropdownRef.current && dropdownRef.current.contains(targetNode)
      );

      if (!clickedInsideSelect && !clickedInsideDropdown) {
        setIsOpen(false);
      }
    };

    document.addEventListener('pointerdown', handlePointerDownOutside);

    return () => {
      document.removeEventListener('pointerdown', handlePointerDownOutside);
    };
  }, []);

  // Position the dropdown using a portal so it is not clipped by parent overflow
  useEffect(() => {
    if (!isOpen) return;

    const updatePosition = () => {
      if (!selectRef.current) return;
      const rect = selectRef.current.getBoundingClientRect();

      setDropdownStyle({
        position: 'fixed',
        top: rect.bottom + 4, // mt-1 spacing
        left: rect.left,
        width: rect.width,
        zIndex: 10000,
      });
    };

    updatePosition();
    window.addEventListener('scroll', updatePosition, true);
    window.addEventListener('resize', updatePosition);

    return () => {
      window.removeEventListener('scroll', updatePosition, true);
      window.removeEventListener('resize', updatePosition);
    };
  }, [isOpen]);

  const handleOptionClick = (optionValue: string) => {
    onChange(optionValue);
    setIsOpen(false);
  };

  const renderTouchSelect = () => (
    <SelectContainer className={className}>
      <SelectDisplay
        value={value}
        options={options}
        imageClassName={imageClassName}
      />
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="absolute top-0 left-0 w-full h-full opacity-0"
        aria-label={label}
        id={id}
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
    <SelectContainer className={`z-30 ${className}`}>
      <div
        ref={selectRef}
        onMouseDown={(e) => {
          e.stopPropagation();
          setIsOpen((prev) => !prev);
        }}
        className="relative"
        role="button"
        tabIndex={0}
        onKeyDown={(e) => {
          if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault();
            setIsOpen((prev) => !prev);
          }
        }}
      >
        <SelectDisplay
          value={value}
          options={options}
          imageClassName={imageClassName}
        />
        {isOpen &&
          createPortal(
            <div
              ref={dropdownRef}
              style={dropdownStyle}
              className="bg-primary-900 rounded-md shadow-lg max-h-[300px] overflow-y-auto"
              onMouseDown={(e) => e.stopPropagation()}
            >
              <ul className="py-1">
                {options.map((option) => (
                  <li
                    key={option.value}
                    className={`px-3 py-2 text-base truncate text-white cursor-pointer transition-colors duration-300 hover:bg-primary-800 flex items-center ${
                      option.value === value ? 'bg-primary-800' : ''
                    }`}
                    onMouseDown={(e) => {
                      e.stopPropagation();
                      handleOptionClick(option.value);
                    }}
                  >
                    {option.imageUrl ? (
                      <img
                        src={option.imageUrl}
                        alt={option.label}
                        className={`w-5 h-5 mr-3 object-cover ${
                          imageClassName ?? ''
                        }`}
                        width={20}
                        height={20}
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
            </div>,
            document.body,
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
