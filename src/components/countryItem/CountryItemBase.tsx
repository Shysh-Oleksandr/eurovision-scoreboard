'use client';
import React from 'react';

import { BaseCountry, Country } from '../../models';

export interface CountryItemBaseProps {
  country: Country | BaseCountry;
  index?: number;
  /** Ref to the outermost row element (used by the board's teleport animation registry). */
  rootRef?: React.Ref<HTMLDivElement>;
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
  /**
   * Drawn next to the main container rather than inside it (the container
   * clips): spec-driven douze animations (src/douze/) reach past the row.
   */
  renderOverlay?: () => React.ReactNode;

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
  rootRef,
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
  renderOverlay,
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
    // `dp-scoreboard-font`: the theme's scoreboard font applies to country rows
    // only (board, share image, qualification and preview variants) — never to
    // surrounding UI such as headers or controls.
    <div
      ref={rootRef}
      className={`dp-scoreboard-font flex relative min-w-0 ${className || ''}`}
      {...props}
    >
      {/* Place Number */}
      {showPlaceNumber &&
        renderPlaceNumber &&
        renderPlaceNumber(country, index)}

      {/* Main Container */}
      <Container
        data-douze-anchor="row"
        // Douze specs place some layers by it (douze/model.ts `layout`).
        data-douze-layout={useInlineContentLayout ? 'rounded' : 'square'}
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

        {/* Content: the flag and name's strip */}
        <div
          data-douze-anchor="strip"
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

      {renderOverlay?.()}
    </div>
  );
};

export default CountryItemBase;
