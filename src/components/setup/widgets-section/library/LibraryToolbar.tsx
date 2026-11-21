'use client';

import React, { useRef } from 'react';

import { LibraryFilter } from './libraryFilters';
import LibraryFilterSheet from './LibraryFilterSheet';
import LibraryMultiSelect from './LibraryMultiSelect';
import LibrarySearchField from './LibrarySearchField';

import CaptionSelect from '@/components/common/CaptionSelect';
import { fitStepAttributes, useFitStep } from '@/hooks/useFitStep';

/** Everything on one row; else the selects take a row under the search. */
const TOOLBAR_STEPS = [{ tools: 'row' }, { tools: 'split' }] as const;

export interface LibraryToolbarAction {
  label: string;
  icon: React.ReactNode;
  onClick: () => void;
  disabled?: boolean;
  /** Why it is disabled (offline), as the tooltip. */
  title?: string;
}

interface LibraryToolbarProps {
  search: string;
  onSearchChange: (value: string) => void;
  /** "Search your themes"; phones show the short one. */
  searchPlaceholder: string;
  shortSearchPlaceholder: string;
  filters: LibraryFilter[];
  /** New theme / Save current contest (Yours only). */
  action?: LibraryToolbarAction;
}

/**
 * One row over a library list: search, its sort and filters as caption
 * selects (the setup header's combos), and the place's own action. From
 * `2cols` the row is fitted (`useFitStep`): when it doesn't fit, the selects
 * share a row under the search. Phones keep one row: the search, a Sort
 * button that opens the filters as a sheet, and the action as an icon.
 */
const LibraryToolbar: React.FC<LibraryToolbarProps> = ({
  search,
  onSearchChange,
  searchPlaceholder,
  shortSearchPlaceholder,
  filters,
  action,
}) => {
  const ref = useRef<HTMLDivElement>(null);
  const step = useFitStep(ref, TOOLBAR_STEPS);

  return (
    <>
      {/* Phones */}
      <div className="flex gap-2 2cols:hidden">
        <LibrarySearchField
          value={search}
          onChange={onSearchChange}
          placeholder={shortSearchPlaceholder}
        />
        {filters.length > 0 && <LibraryFilterSheet filters={filters} />}
        {action && (
          <button
            type="button"
            onClick={action.onClick}
            disabled={action.disabled}
            aria-label={action.label}
            title={action.title}
            className="dp-act grid size-11 flex-none place-items-center rounded-xl disabled:cursor-not-allowed disabled:opacity-40"
          >
            {action.icon}
          </button>
        )}
      </div>

      {/* From 2cols */}
      <div
        ref={ref}
        {...fitStepAttributes(TOOLBAR_STEPS[step])}
        className={`dp-lib-tools hidden 2cols:grid ${
          action ? 'has-action' : ''
        }`}
      >
        <div className="dp-lib-tools-search flex min-w-0">
          <LibrarySearchField
            value={search}
            onChange={onSearchChange}
            placeholder={searchPlaceholder}
          />
        </div>
        {filters.length > 0 && (
          <div className="dp-lib-tools-filters">
            {filters.map((filter) =>
              filter.kind === 'select' ? (
                <CaptionSelect
                  key={filter.id}
                  caption={filter.caption}
                  value={filter.value}
                  options={filter.options}
                  onChange={filter.onChange}
                />
              ) : (
                <LibraryMultiSelect key={filter.id} filter={filter} />
              ),
            )}
          </div>
        )}
        {action && (
          <button
            type="button"
            onClick={action.onClick}
            disabled={action.disabled}
            title={action.title}
            className="dp-lib-tools-action dp-act flex h-[46px] items-center justify-center gap-2 whitespace-nowrap rounded-xl px-4 text-[13.5px] font-extrabold disabled:cursor-not-allowed disabled:opacity-40"
          >
            {action.icon}
            {action.label}
          </button>
        )}
      </div>
    </>
  );
};

export default LibraryToolbar;
