'use client';
import React, { ReactNode } from 'react';

import { useGeneralStore } from '../../state/generalStore';
import SnowPileEffect from '../effects/SnowPileEffect';

import IconButtonTooltip from './IconButtonTooltip';

type Props = {
  label?: string;
  className?: string;
  onClick?: (e: React.MouseEvent<HTMLButtonElement>) => void;
  variant?:
    | 'primary'
    | 'secondary'
    | 'tertiary'
    | 'destructive'
    | 'winner'
    | 'cta'
    | 'surface'
    | 'surfaceStrong'
    | 'ghost';
  /**
   * Fixed-height presets from the design system (34 / 40 / 46 / 54px). Omit
   * for the legacy responsive padding.
   */
  size?: 'sm' | 'md' | 'lg' | 'xl';
  title?: string;
  children?: ReactNode;
  disabled?: boolean;
  Icon?: React.ReactNode;
  isLoading?: boolean;
  snowEffect?: 'left' | 'right' | 'middle' | 'none';
  snowEffectClassName?: string;
  style?: React.CSSProperties;
  animatedBorder?: boolean;
  /** `cta` only: a 20% accent glow instead of the default 35%. */
  softGlow?: boolean;
  'aria-label'?: string;
  'aria-pressed'?: boolean;
};

const Button = ({
  label,
  className = '',
  onClick,
  variant = 'primary',
  size,
  children,
  title,
  disabled,
  Icon,
  isLoading,
  snowEffect = 'none',
  snowEffectClassName = '',
  style,
  animatedBorder = false,
  softGlow = true,
  'aria-label': ariaLabel,
  'aria-pressed': ariaPressed,
}: Props) => {
  const baseClasses = 'font-medium uppercase transition-colors relative';

  const legacySizeClasses =
    'lg:text-base md:text-base text-sm lg:px-5 md:px-4 sm:px-3 px-3 lg:py-3 py-[10px] rounded-[10px] shadow-lg lg:leading-5 duration-300';

  // Design-system presets: fixed height, 12px radius, 800 weight.
  const sizeClasses = {
    sm: 'h-[34px] [--dp-btn-h:34px] px-3 text-[12.5px] font-extrabold rounded-[9px] leading-none',
    md: 'h-10 [--dp-btn-h:40px] px-3 text-[13px] font-extrabold rounded-xl leading-none',
    lg: 'h-[46px] [--dp-btn-h:46px] px-3.5 text-[13.5px] font-extrabold rounded-xl leading-none',
    xl: 'h-[50px] [--dp-btn-h:50px] px-5 text-base font-extrabold rounded-xl leading-none',
  };

  const legacyGradient = 'bg-gradient-to-tr from-[20%]';

  const variantClasses = {
    primary: `${legacyGradient} bg-primary-900 from-primary-900 to-primary-800/70 text-white hover:bg-primary-700`,
    secondary: `${legacyGradient} bg-gray-600 from-gray-600 to-gray-900/70 text-white hover:bg-gray-500`,
    tertiary: `${legacyGradient} bg-primary-800 from-primary-800 to-gray-600/70 text-white hover:bg-gray-500`,
    destructive: `${legacyGradient} bg-red-900 from-red-900 to-red-600/40 text-white hover:bg-red-700`,
    winner:
      'bg-white/10 border border-white/[0.22] text-white hover:bg-white/[0.18] !font-bold !tracking-[0.10em] !shadow-none',
    // Hue-derived design-system surfaces (src/styles.css `dp-*`, tokens.css).
    cta: 'dp-cta normal-case',
    surface: 'dp-act text-white normal-case',
    surfaceStrong: 'dp-act dp-act--strong text-white normal-case',
    ghost:
      'bg-white/[0.07] border border-hair text-white hover:bg-white/[0.13] tracking-[.04em] !shadow-none',
  };

  const childrenContent = children || label;
  const hasIconOnlyContent =
    (Icon !== null && Icon !== undefined) ||
    (children !== null &&
      children !== undefined &&
      typeof children !== 'string');
  const enableIconButtonTooltips = useGeneralStore(
    (state) => state.settings.enableIconButtonTooltips,
  );
  const isIconOnly = !label && hasIconOnlyContent;
  const showTooltip = Boolean(title && isIconOnly && enableIconButtonTooltips);

  const button = (
    <button
      className={`${baseClasses} ${
        size ? sizeClasses[size] : legacySizeClasses
      } ${variantClasses[variant]} ${Icon ? 'flex items-center gap-2' : ''} ${
        Icon && !childrenContent
          ? size
            ? 'w-[var(--dp-btn-h)] !px-0 justify-center'
            : '!p-2'
          : ''
      } ${animatedBorder ? 'animated-border' : ''} ${
        softGlow && variant === 'cta' ? 'dp-cta--soft' : ''
      } ${className} ${disabled ? 'opacity-50 cursor-not-allowed' : ''}`}
      onClick={onClick}
      title={showTooltip ? undefined : title}
      aria-label={ariaLabel ?? (isIconOnly ? title : undefined)}
      aria-pressed={ariaPressed}
      aria-busy={isLoading || undefined}
      disabled={disabled || isLoading}
      style={style}
    >
      {animatedBorder && (
        <span className="animated-border-spin" aria-hidden="true" />
      )}
      <SnowPileEffect snowEffect={snowEffect} className={snowEffectClassName} />
      {/* While loading, the content stays in layout (invisible) so the button
          keeps its width and the spinner overlays it — no layout shift. */}
      <span className={isLoading ? 'contents invisible' : 'contents'}>
        {Icon}
        {childrenContent}
      </span>
      {isLoading && (
        <span className="absolute inset-0 flex items-center justify-center">
          <span className="loader small" />
        </span>
      )}
    </button>
  );

  if (showTooltip) {
    return (
      <IconButtonTooltip
        content={title!}
        className={disabled ? 'cursor-not-allowed' : undefined}
      >
        {button}
      </IconButtonTooltip>
    );
  }

  return button;
};

export default Button;
