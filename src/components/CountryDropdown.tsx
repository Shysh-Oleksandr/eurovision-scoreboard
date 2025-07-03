import React, { useState, useRef, useEffect } from 'react';

import { BaseCountry } from '../models';

type Props = {
  countries: BaseCountry[];
  selectedCountryCode: string | null;
  onSelect: (countryCode: string) => void;
  placeholder?: string;
  className?: string;
};

const CountryDropdown = ({
  countries,
  selectedCountryCode,
  onSelect,
  placeholder = 'Select country',
  className = '',
}: Props) => {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const selectedCountry = countries.find(
    (country) => country.code === selectedCountryCode,
  );

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(event.target as Node)
      ) {
        setIsOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  return (
    <div className={`relative ${className}`} ref={dropdownRef}>
      <button
        type="button"
        className="w-full lg:py-2 py-[6px] px-3 bg-primary-900 border border-gray-600 rounded-md text-left text-white lg:text-base text-sm hover:bg-primary-800 transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-primary-500"
        onClick={() => setIsOpen(!isOpen)}
      >
        <span className="block truncate">
          {selectedCountry ? selectedCountry.name : placeholder}
        </span>
        <span className="absolute inset-y-0 right-0 flex items-center pr-2 pointer-events-none">
          <svg
            className={`w-5 h-5 text-gray-400 transition-transform duration-200 ${
              isOpen ? 'transform rotate-180' : ''
            }`}
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M19 9l-7 7-7-7"
            />
          </svg>
        </span>
      </button>

      {isOpen && (
        <div className="absolute z-50 w-full mt-1 bg-primary-900 border border-gray-600 rounded-md shadow-lg max-h-60 overflow-auto">
          {countries.map((country) => (
            <button
              key={country.code}
              type="button"
              className={`w-full px-3 lg:py-2 py-[6px] text-left lg:text-base text-sm hover:bg-primary-800 transition-colors duration-200 ${
                selectedCountryCode === country.code
                  ? 'bg-primary-700 text-white'
                  : 'text-gray-200'
              }`}
              onClick={() => {
                onSelect(country.code);
                setIsOpen(false);
              }}
            >
              {country.name}
            </button>
          ))}
        </div>
      )}
    </div>
  );
};

export default CountryDropdown;
