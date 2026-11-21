'use client';

import { useTranslations } from 'next-intl';
import React, { useLayoutEffect, useRef } from 'react';

import Button from '@/components/common/Button';
import SignInButtons from '@/components/common/SignInButtons';

interface LibraryPlaceLayoutProps {
  /** Search, sort, filters, action. */
  toolbar: React.ReactNode;
  /** The user's groups, under the toolbar. */
  rail?: React.ReactNode;
  children: React.ReactNode;
  /**
   * The list's identity (page, search, sort, filters): a new one scrolls the
   * place back to its top, so Next starts the new page at its first item.
   */
  scrollKey: string;
}

/**
 * One place of a library (Yours, Saved, Community): the toolbar and groups
 * on top of the list, scrolling away with it so the list gets the height
 * (the header with the places stays).
 */
export const LibraryPlaceLayout: React.FC<LibraryPlaceLayoutProps> = ({
  toolbar,
  rail,
  children,
  scrollKey,
}) => {
  const scrollRef = useRef<HTMLDivElement>(null);

  useLayoutEffect(() => {
    if (scrollRef.current) scrollRef.current.scrollTop = 0;
  }, [scrollKey]);

  return (
    <div
      ref={scrollRef}
      className="narrow-scrollbar min-h-0 flex-1 overflow-y-auto px-3 pb-6 2cols:px-5"
    >
      <div className="flex flex-col gap-2.5 pt-1">
        {toolbar}
        {rail}
      </div>
      {children}
    </div>
  );
};

interface LibraryListHeaderProps {
  /** "47 themes"; none while the list loads. */
  label?: React.ReactNode;
  /** Shown while a filter is set: puts every filter back. */
  onClearFilters?: () => void;
  /** At the line's end: a stats link. */
  trailing?: React.ReactNode;
  className?: string;
}

/**
 * Counts come grouped by the locale ("21 903" in Ukrainian), with a
 * no-break space the 2026 theme's Gotham draws 25em wide: plain spaces
 * instead (the line doesn't wrap).
 */
const withPlainSpaces = (text: string) => text.replace(/[\u00a0\u202f]/g, ' ');

/** A quiet line over a list or a section of it: what it holds, then tools. */
export const LibraryListHeader: React.FC<LibraryListHeaderProps> = ({
  label,
  onClearFilters,
  trailing,
  className = '',
}) => {
  const t = useTranslations('widgets.library');

  return (
    <div
      className={`flex min-h-[22px] flex-wrap items-center gap-x-3 gap-y-1 pb-2.5 pt-3.5 ${className}`}
    >
      {label && (
        <h3 className="whitespace-nowrap text-[13px] font-bold text-white/70">
          {typeof label === 'string' ? withPlainSpaces(label) : label}
        </h3>
      )}
      {onClearFilters && (
        <button
          type="button"
          onClick={onClearFilters}
          className="dp-lib-link -my-1 rounded-md py-1 text-[13px]"
        >
          {t('clearFilters')}
        </button>
      )}
      {trailing && <div className="ml-auto">{trailing}</div>}
    </div>
  );
};

/** An accent text link with an icon (Country leaderboard, Your entry stats). */
export const LibraryLink: React.FC<{
  icon: React.ReactNode;
  label: string;
  onClick: () => void;
}> = ({ icon, label, onClick }) => (
  <button
    type="button"
    onClick={onClick}
    className="dp-lib-link -my-1.5 inline-flex items-center gap-1.5 rounded-md py-1.5 text-[13px]"
  >
    {icon}
    {label}
  </button>
);

interface LibraryEmptyProps {
  message: string;
  action?: {
    label: string;
    onClick: () => void;
    icon?: React.ReactNode;
    disabled?: boolean;
  };
}

/** What the list would hold, and the one thing to do about it. */
export const LibraryEmpty: React.FC<LibraryEmptyProps> = ({
  message,
  action,
}) => (
  <div className="flex flex-col items-center gap-4 px-4 py-12 text-center">
    <p className="max-w-[34ch] text-[14px] font-semibold leading-[1.5] text-white/70 text-balance">
      {message}
    </p>
    {action && (
      <Button
        variant="surface"
        size="lg"
        onClick={action.onClick}
        disabled={action.disabled}
        Icon={action.icon}
      >
        {action.label}
      </Button>
    )}
  </div>
);

/** Yours and Saved without an account. */
export const LibrarySignIn: React.FC<{ message: string }> = ({ message }) => (
  <div className="narrow-scrollbar flex min-h-0 flex-1 flex-col items-center gap-5 overflow-y-auto px-4 py-10 text-center">
    <p className="max-w-[36ch] text-[14px] font-semibold leading-[1.5] text-white/75 text-balance">
      {message}
    </p>
    <SignInButtons />
  </div>
);
