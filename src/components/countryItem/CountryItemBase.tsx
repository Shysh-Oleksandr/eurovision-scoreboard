'use client';
import React from 'react';

import { BaseCountry, Country } from '../../models';

export interface CountryItemBaseProps {
  country: Country | BaseCountry;
  index?: number;
  className?: string;
  containerClassName?: string;
  style?: React.CSSProperties;
  disabled?: boolean;
  onClick?: (countryCode: string) => void;

  // Render props for customization
  renderPlaceNumber?: (
    country: Country | BaseCountry,
    index: number,
  ) => React.ReactNode;
  renderFlag?: (country: Country | BaseCountry) => React.ReactNode;
  renderName?: (country: Country | BaseCountry) => React.ReactNode;
  renderPoints?: (country: Country | BaseCountry) => React.ReactNode;
  renderDouzePointsAnimation?: (
    country: Country | BaseCountry,
  ) => React.ReactNode;

  // Container options
  as?: 'button' | 'div';
  showPlaceNumber?: boolean;
}

const CountryItemBase: React.FC<CountryItemBaseProps> = ({
  country,
  index = 0,
  className,
  containerClassName,
  style,
  disabled = false,
  onClick,
  renderPlaceNumber,
  renderFlag,
  renderName,
  renderPoints,
  renderDouzePointsAnimation,
  as = 'div',
  showPlaceNumber = false,
  ...props
}) => {
  const Container = as;

  const handleClick = () => {
    if (!disabled && onClick && 'code' in country) {
      onClick(country.code);
    }
  };

  return (
    <div className={`flex relative ${className || ''}`} {...props}>
      {/* Place Number */}
      {showPlaceNumber &&
        renderPlaceNumber &&
        renderPlaceNumber(country, index)}

      {/* Main Container */}
      <Container
        className={`relative ${containerClassName}`}
        style={style}
        disabled={disabled}
        onClick={handleClick}
      >
        {/* Douze Points Animation */}
        {renderDouzePointsAnimation && renderDouzePointsAnimation(country)}

        {/* Content */}
        <div className="flex items-center overflow-hidden flex-1 absolute w-full h-full">
          {/* Flag */}
          {renderFlag && renderFlag(country)}

          {/* Name */}
          {renderName && renderName(country)}
        </div>

        {/* Points */}
        <div className="flex h-full flex-shrink-0">
          {renderPoints && renderPoints(country)}
        </div>
      </Container>
    </div>
  );
};

export default CountryItemBase;
