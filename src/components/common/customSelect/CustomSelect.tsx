import React, { useState, useRef, useEffect, useMemo, Suspense } from 'react';
import { createPortal } from 'react-dom';

import { ArrowIcon } from '../../../assets/icons/ArrowIcon';
import { Year } from '../../../config';
import { themes } from '../../../theme/themes';

import { useDebounce } from '@/hooks/useDebounce';
import { useTouchDevice } from '@/hooks/useTouchDevice';

type Option = {
  label: string;
  value: string;
  imageUrl?: string;
  isExisting?: boolean;
};

type OptionGroup = {
  label: string;
  options: Option[];
};

type CustomSelectProps = {
  options: Option[];
  groups?: { label: string; options: Option[] }[]; // optional grouped options
  value: string;
  onChange: (value: string) => void;
  className?: string;
  id?: string;
  label?: string;
  getImageClassName?: (option: Option) => string;
  selectClassName?: string;
};

const getThemeColor = (year: string) => {
  const theme = themes[year as Year];

  return theme ? theme.colors.primary[700] : '#FFFFFF'; // Default color
};

const SelectDisplay: React.FC<{
  value: string;
  options: Option[];
  getImageClassName?: (option: Option) => string;
  selectClassName?: string;
}> = ({ value, options, getImageClassName, selectClassName }) => {
  const selectedOption = options.find((option) => option.value === value);

  return (
    <div
      className={`select h-12 lg:!text-base !text-sm lg:px-5 sm:px-4 px-3 lg:py-3 !pl-2 py-[10px] w-full flex items-center justify-between cursor-pointer ${selectClassName}`}
    >
      <div className="flex items-center">
        {selectedOption?.imageUrl ? (
          <img
            src={selectedOption.imageUrl}
            alt={selectedOption.label}
            className={`w-6 h-6 mr-2 object-cover ${
              getImageClassName?.(selectedOption) ?? ''
            }`}
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
  groups,
  value,
  onChange,
  className = '',
  id,
  label,
  getImageClassName,
  selectClassName,
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const selectRef = useRef<HTMLDivElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const [dropdownStyle, setDropdownStyle] = useState<React.CSSProperties>({});
  const isTouchDevice = useTouchDevice();
  const [searchText, setSearchText] = useState('');
  const debouncedSearch = useDebounce(searchText, 200);
  const initialSelectedLabelRef = useRef<string>('');
  const selectionChangedRef = useRef<boolean>(false);
  const searchInputRef = useRef<HTMLInputElement>(null);

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

  // Initialize search and focus input when opening
  useEffect(() => {
    if (isOpen) {
      const selectedOption = options.find((option) => option.value === value);
      const label = selectedOption?.label ?? '';

      initialSelectedLabelRef.current = label;
      selectionChangedRef.current = false;
      setSearchText('');

      // Focus the input on open
      requestAnimationFrame(() => {
        searchInputRef.current?.focus();
      });
    } else {
      setSearchText('');
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen]);

  const handleOptionClick = (optionValue: string) => {
    onChange(optionValue);
    selectionChangedRef.current = true;
    setIsOpen(false);
  };

  const filteredOptions = useMemo(() => {
    const q = debouncedSearch.trim().toLowerCase();

    if (groups && groups.length > 0) {
      const mapped: OptionGroup[] = groups.map((g) => ({
        label: g.label,
        options: q
          ? g.options.filter((o) => o.label.toLowerCase().includes(q))
          : g.options,
      }));

      return mapped;
    }

    if (!q) return options;

    return (options || []).filter((o) => o.label.toLowerCase().includes(q));
  }, [options, groups, debouncedSearch]);

  const renderTouchSelect = () => (
    <SelectContainer className={className}>
      <SelectDisplay
        value={value}
        options={groups ? groups.flatMap((g) => g.options) : options}
        getImageClassName={getImageClassName}
        selectClassName={selectClassName}
      />
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="absolute top-0 left-0 w-full h-full opacity-0"
        aria-label={label}
        id={id}
      >
        {groups
          ? groups.map((group) => (
              <optgroup key={group.label} label={group.label}>
                {group.options.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </optgroup>
            ))
          : options.map((option) => (
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

          const target = e.target as HTMLElement;

          if (isOpen && (target.tagName === 'INPUT' || target.closest('input')))
            return;

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
        {isOpen ? (
          // While open, show an input in place of the display so users can search immediately.
          <div className="select h-12 lg:!text-base !text-sm lg:px-5 sm:px-4 px-3 lg:py-3 !pl-2 py-[10px] w-full flex items-center justify-between">
            <div className="flex items-center w-full">
              <input
                ref={searchInputRef}
                value={searchText}
                onChange={(e) => setSearchText(e.target.value)}
                onBlur={() => {
                  // If no selection was made, restore the previous label
                  if (!selectionChangedRef.current) {
                    setSearchText(initialSelectedLabelRef.current);
                  }
                }}
                placeholder="Search..."
                className="w-full bg-transparent outline-none text-white placeholder:text-white/70"
              />
            </div>
            <ArrowIcon
              className={`text-white w-7 h-7 rotate-90 absolute lg:right-2.5 sm:right-2 right-1`}
            />
          </div>
        ) : (
          <SelectDisplay
            value={value}
            options={groups ? groups.flatMap((g) => g.options) : options}
            getImageClassName={getImageClassName}
            selectClassName={selectClassName}
          />
        )}
        {isOpen &&
          createPortal(
            <Suspense fallback={null}>
              <div
                ref={dropdownRef}
                style={dropdownStyle}
                className="bg-primary-900 rounded-md shadow-lg max-h-[300px] overflow-y-auto"
                onMouseDown={(e) => e.stopPropagation()}
              >
                {(() => {
                  const hasGroups = !!(groups && groups.length > 0);

                  if (hasGroups) {
                    const grouped = filteredOptions as OptionGroup[];
                    const nonEmptyGroups = grouped.filter(
                      (g) => g.options.length > 0,
                    );

                    if (nonEmptyGroups.length === 0) {
                      return (
                        <div className="px-3 py-2 text-white/70">
                          No options
                        </div>
                      );
                    }

                    return (
                      <div className="py-1">
                        {nonEmptyGroups.map((group) => (
                          <div key={group.label}>
                            <div className="px-3 py-1 text-xs uppercase tracking-wider text-white/70">
                              {group.label}
                            </div>
                            <ul>
                              {group.options.map((option) => (
                                <li
                                  key={option.value}
                                  className={`px-3 py-2 text-base truncate text-white cursor-pointer transition-colors duration-300 hover:bg-primary-800 flex items-center ${
                                    option.value === value
                                      ? 'bg-primary-800'
                                      : ''
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
                                        getImageClassName?.(option) ?? ''
                                      }`}
                                      width={20}
                                      height={20}
                                      loading="lazy"
                                    />
                                  ) : (
                                    <span
                                      className="w-4 h-4 rounded-full mr-3"
                                      style={{
                                        backgroundColor: getThemeColor(
                                          option.value,
                                        ),
                                      }}
                                    ></span>
                                  )}
                                  {option.label}
                                </li>
                              ))}
                            </ul>
                          </div>
                        ))}
                      </div>
                    );
                  }

                  const flat = filteredOptions as Option[];

                  if (flat.length === 0) {
                    return (
                      <div className="px-3 py-2 text-white/70">No options</div>
                    );
                  }

                  return (
                    <ul className="py-1">
                      {flat.map((option) => (
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
                                getImageClassName?.(option) ?? ''
                              }`}
                              width={20}
                              height={20}
                              loading="lazy"
                            />
                          ) : (
                            <span
                              className="w-4 h-4 rounded-full mr-3"
                              style={{
                                backgroundColor: getThemeColor(option.value),
                              }}
                            ></span>
                          )}
                          {option.label}
                        </li>
                      ))}
                    </ul>
                  );
                })()}
              </div>
            </Suspense>,
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
