import { ChevronRight } from 'lucide-react';
import React from 'react';

export type WidgetTone = 'blue' | 'pink' | 'gold';

// Literal class names: `dp-tone-*` live in styles.css under `@layer components`,
// which Tailwind only emits when the class appears verbatim in the source.
const TONE_CLASS: Record<WidgetTone, string> = {
  blue: 'dp-tone-blue',
  pink: 'dp-tone-pink',
  gold: 'dp-tone-gold',
};

type WidgetContainerProps = {
  onClick: () => void;
  title: string;
  description: string;
  icon: React.ReactNode;
  /** Accent used for the icon chip / card tint (`--accent-2`, `--accent`, gold). */
  tone: WidgetTone;
  /** Live stat line ("128 followers · 64 following"). Hidden when undefined. */
  stat?: React.ReactNode;
  statLoading?: boolean;
  disabled?: boolean;
};

/**
 * Labelled widget card: tone-tinted gradient, 42px icon chip, title,
 * description (hidden on phones) and a stat line that keeps the card alive.
 */
const WidgetContainer = ({
  onClick,
  title,
  description,
  icon,
  tone,
  stat,
  statLoading = false,
  disabled,
}: WidgetContainerProps) => {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className={`dp-widget ${
        TONE_CLASS[tone]
      } relative flex items-center md:gap-3 sm:gap-2 gap-3 w-full min-w-0 px-[13px] py-[8px] sm:px-2.5 md:px-3.5 sm:py-[13px] rounded-[14px] text-left text-white overflow-hidden ${
        disabled ? 'opacity-50 !cursor-not-allowed' : ''
      }`}
    >
      <span className="dp-widget-icon w-[42px] h-[42px] rounded-xl grid place-items-center flex-none">
        {icon}
      </span>
      <span className="min-w-0 flex-1 flex flex-col">
        <span className="text-[15px] font-extrabold tracking-[-.015em] leading-tight">
          {title}
        </span>
        <span
          className={`${
            !stat && !statLoading ? '' : 'hidden sm:block'
          } text-xs truncate font-semibold text-white/55 mt-px leading-[1.3]`}
        >
          {description}
        </span>
        {statLoading ? (
          <span
            className="mt-[5px] h-[11px] w-28 rounded bg-white/10 animate-pulse"
            aria-hidden="true"
          />
        ) : stat !== undefined ? (
          <span className="dp-widget-stat text-[11px] font-extrabold tracking-[.02em] mt-[3px] truncate">
            {stat}
          </span>
        ) : null}
      </span>
      <ChevronRight className="ml-auto block sm:hidden lg:block size-[17px] flex-none text-white/40" />
    </button>
  );
};

export default WidgetContainer;
