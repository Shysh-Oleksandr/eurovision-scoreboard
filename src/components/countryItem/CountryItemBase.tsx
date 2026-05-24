'use client';
import React from 'react';

import { BaseCountry, Country } from '../../models';

export interface CountryItemBaseProps {
  country: Country | BaseCountry;
  index?: number;
  className?: string;
  contentClassName?: string;
  containerClassName?: string;
  style?: React.CSSProperties;
  disabled?: boolean;
  onClick?: (countryCode: string) => void;
  onMouseEnter?: React.MouseEventHandler;
  onMouseLeave?: React.MouseEventHandler;

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
  /** When true, flag/name sit in normal flex flow so points reserve width on the right (rounded pill layout). */
  useInlineContentLayout?: boolean;
  /** Applied to the flag/name wrapper; use with `useInlineContentLayout` for theme backgrounds on the name pill. */
  contentStyle?: React.CSSProperties;
}

const CountryItemBase: React.FC<CountryItemBaseProps> = ({
  country,
  index = 0,
  className,
  contentClassName,
  containerClassName,
  style,
  disabled = false,
  onClick,
  onMouseEnter,
  onMouseLeave,
  renderPlaceNumber,
  renderFlag,
  renderName,
  renderPoints,
  renderDouzePointsAnimation,
  as = 'div',
  showPlaceNumber = false,
  useInlineContentLayout = false,
  contentStyle,
  ...props
}) => {
  const Container = as;

  const handleClick = () => {
    if (!disabled && onClick && 'code' in country) {
      onClick(country.code);
    }
  };

  return (
    <div className={`flex relative min-w-0 ${className || ''}`} {...props}>
      {/* Place Number */}
      {showPlaceNumber &&
        renderPlaceNumber &&
        renderPlaceNumber(country, index)}

      {/* Main Container */}
      <Container
        className={`relative ${
          useInlineContentLayout ? 'flex flex-row items-stretch min-h-0 ' : ''
        }${containerClassName}`}
        style={style}
        disabled={disabled}
        onClick={handleClick}
        onMouseEnter={onMouseEnter}
        onMouseLeave={onMouseLeave}
      >
        {/* Douze Points Animation */}
        {renderDouzePointsAnimation && renderDouzePointsAnimation(country)}

        {/* Content */}
        <div
          className={
            useInlineContentLayout
              ? `flex items-center overflow-hidden flex-1 min-w-0 h-full relative ${
                  contentClassName || ''
                }`
              : `flex items-center overflow-hidden flex-1 absolute w-full h-full ${
                  contentClassName || ''
                }`
          }
          style={useInlineContentLayout ? contentStyle : undefined}
        >
          {/* Flag */}
          {renderFlag && renderFlag(country)}

          {/* Name */}
          {renderName && renderName(country)}
        </div>

        {/* Points */}
        <div
          className={`flex h-full flex-shrink-0 ${
            useInlineContentLayout ? '' : 'ml-auto'
          }`}
        >
          {renderPoints && renderPoints(country)}
        </div>
      </Container>
    </div>
  );
};

export default CountryItemBase;
