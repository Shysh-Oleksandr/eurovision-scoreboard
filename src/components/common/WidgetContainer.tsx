import React from 'react';

export type WidgetStatProps = {
  stat?: React.ReactNode;
  /** Phones: a shorter stat (one number). Defaults to `stat`. */
  shortStat?: React.ReactNode;
  statLoading?: boolean;
};

type WidgetContainerProps = WidgetStatProps & {
  onClick: () => void;
  title: string;
  /** Small pill after the title (e.g. a Beta label). */
  badge?: React.ReactNode;
  icon: React.ReactNode;
  disabled?: boolean;
};

/**
 * One library button in the hub's widget row (Themes / Contests / Graphics):
 * accent icon, title and, for signed-in users, a stat line. Without a stat
 * it is just the name. On phones a small icon sits before the title, or
 * above it when a title would not fit beside it ("Wettbewerbe"); the row
 * picks one for all three (`.dp-lib-row`, WidgetsSection).
 */
const WidgetContainer = ({
  onClick,
  title,
  badge,
  icon,
  stat,
  shortStat,
  statLoading = false,
  disabled,
}: WidgetContainerProps) => (
  <button
    type="button"
    onClick={onClick}
    disabled={disabled}
    className={`dp-lib flex items-center gap-3 w-full min-w-0 px-2.5 py-2.5 2cols:px-3.5 2cols:py-3 rounded-xl text-left text-white ${
      disabled ? 'opacity-50 !cursor-not-allowed' : ''
    }`}
  >
    <span className="dp-lib-icon flex-none hidden 2cols:grid">{icon}</span>
    <span className="min-w-0 w-full flex-1 flex flex-col gap-1">
      <span className="dp-lib-icon dp-lib-icon--small dp-lib-icon--top 2cols:hidden">
        {icon}
      </span>
      <span className="dp-lib-head flex items-center gap-[5px] min-w-0 text-sm 2cols:text-[15px] font-extrabold tracking-[-.01em] leading-tight">
        <span className="dp-lib-icon dp-lib-icon--small dp-lib-icon--inline flex-none 2cols:hidden">
          {icon}
        </span>
        <span className="dp-lib-title truncate">{title}</span>
        {badge && <span className="hidden sm:inline-flex">{badge}</span>}
      </span>
      {statLoading ? (
        <span
          className="h-3 w-20 max-w-full rounded bg-white/10 animate-pulse"
          aria-hidden="true"
        />
      ) : (
        stat !== undefined && (
          <>
            <span className="hidden md:block truncate text-[12.5px] font-semibold leading-tight text-white/75">
              {stat}
            </span>
            <span className="md:hidden truncate text-[12px] font-semibold leading-tight text-white/75">
              {shortStat ?? stat}
            </span>
          </>
        )
      )}
    </span>
  </button>
);

export default WidgetContainer;
