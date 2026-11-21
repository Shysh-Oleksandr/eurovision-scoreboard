'use client';

import { ArrowUpDown, Check } from 'lucide-react';
import { useTranslations } from 'next-intl';
import React, {
  useEffect,
  useId,
  useLayoutEffect,
  useRef,
  useState,
} from 'react';
import { createPortal } from 'react-dom';

import {
  isFilterSet,
  LibraryFilter,
  LibrarySelectFilter,
  resetFilter,
} from './libraryFilters';

import Button from '@/components/common/Button';
import {
  DRAG_THRESHOLD,
  useSheetDrag,
} from '@/components/simulation/columnLayout/useSheetDrag';
import { useBackHandler } from '@/hooks/useBackHandler';
import { playHaptic } from '@/native/haptics';

/** How long the sheet takes to slide away (`dp-sim-sheet-out`). */
const EXIT_MS = 200;

interface LibraryFilterSheetProps {
  filters: LibraryFilter[];
}

/**
 * Phones: one button for the list's sort and filters. It names the current
 * sort, with an accent dot when a filter is also set, and opens them as a
 * bottom sheet: the simulation's ⋯ sheet (slides up over a fading scrim,
 * pulls down to close), each choice a tile, applied as it's tapped.
 */
const LibraryFilterSheet: React.FC<LibraryFilterSheetProps> = ({ filters }) => {
  const t = useTranslations();
  const [open, setOpen] = useState(false);
  const sort = filters.find(
    (filter): filter is LibrarySelectFilter =>
      filter.kind === 'select' && filter.id === 'sort',
  );
  const sortLabel = sort?.options.find((o) => o.value === sort.value)?.label;
  const otherSet = filters.some(
    (filter) => filter !== sort && isFilterSet(filter),
  );

  return (
    <>
      <button
        type="button"
        aria-haspopup="dialog"
        aria-expanded={open}
        onClick={() => setOpen(true)}
        className="dp-lib-sortbtn relative flex h-11 max-w-[46%] flex-none items-center gap-2 rounded-xl pl-3 pr-3.5 text-[13.5px] font-bold text-white"
        aria-label={`${t('widgets.library.sortAndFilter')}: ${sortLabel ?? ''}`}
      >
        <ArrowUpDown
          className="size-[17px] flex-none text-white/70"
          aria-hidden="true"
        />
        <span className="truncate">{sortLabel}</span>
        {otherSet && (
          <span
            className="absolute right-1.5 top-1.5 size-[7px] rounded-full bg-accent"
            aria-hidden="true"
          />
        )}
      </button>
      <FilterSheet
        open={open}
        onClose={() => setOpen(false)}
        filters={filters}
      />
    </>
  );
};

const FilterSheet = ({
  open,
  onClose,
  filters,
}: {
  open: boolean;
  onClose: () => void;
  filters: LibraryFilter[];
}) => {
  const t = useTranslations();
  const titleId = useId();
  const dialogRef = useRef<HTMLDivElement>(null);
  const [mounted, setMounted] = useState(open);
  const [pullY, setPullY] = useState(0);
  const [pulling, setPulling] = useState(false);
  const anySet = filters.some(isFilterSet);

  useBackHandler(open, onClose);

  useLayoutEffect(() => {
    if (open) setPullY(0);
  }, [open]);

  useSheetDrag(dialogRef, {
    enabled: open,
    onDrag: (dy) => {
      setPulling(true);
      setPullY(Math.max(dy, 0));
    },
    onRelease: (dy) => {
      setPulling(false);
      if (dy > DRAG_THRESHOLD) onClose();
      else setPullY(0);
    },
    onCancel: () => {
      setPulling(false);
      setPullY(0);
    },
  });

  useEffect(() => {
    if (open) {
      setMounted(true);

      return undefined;
    }

    const id = window.setTimeout(() => setMounted(false), EXIT_MS);

    return () => window.clearTimeout(id);
  }, [open]);

  useEffect(() => {
    if (!open) return undefined;

    dialogRef.current?.focus();

    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };

    document.addEventListener('keydown', onKeyDown);

    return () => document.removeEventListener('keydown', onKeyDown);
  }, [open, onClose]);

  if (!(open || mounted) || typeof document === 'undefined') return null;

  const sheetHeight = dialogRef.current?.offsetHeight || 1;

  return createPortal(
    <div
      className="dp-sim-menu fixed inset-0 z-[9000]"
      data-closing={open ? undefined : ''}
    >
      <button
        type="button"
        tabIndex={-1}
        aria-label={t('common.close')}
        className="dp-sim-scrim absolute inset-0"
        style={
          pullY ? { opacity: 1 - Math.min(pullY / sheetHeight, 1) } : undefined
        }
        onClick={onClose}
      />
      <div
        ref={dialogRef}
        tabIndex={-1}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        className={`dp-sim-sheet dp-sim-menu-sheet absolute inset-x-0 bottom-0 max-h-[88dvh] overflow-y-auto rounded-t-[22px] px-3.5 pb-[calc(var(--safe-bottom-bar)+12px)] pt-2 text-white outline-none ${
          pulling ? 'select-none' : ''
        }`}
        style={
          pullY
            ? {
                transform: `translateY(${pullY}px)`,
                transition: pulling ? 'none' : undefined,
              }
            : undefined
        }
      >
        <div className="dp-sim-grab mx-auto mb-1.5 h-[5px] w-10 rounded-full" />
        <div className="flex min-h-11 items-center gap-3">
          <h3
            id={titleId}
            className="text-[17px] font-extrabold tracking-[-0.015em]"
          >
            {t('widgets.library.sortAndFilter')}
          </h3>
          <button
            type="button"
            disabled={!anySet}
            onClick={() => filters.forEach(resetFilter)}
            className="dp-lib-link ml-auto -mr-1.5 rounded-lg px-1.5 py-2 text-[14px] disabled:opacity-40"
          >
            {t('common.clear')}
          </button>
        </div>

        {filters.map((filter) => (
          <FilterGroup key={filter.id} filter={filter} />
        ))}

        <Button
          variant="surface"
          size="lg"
          className="mt-5 w-full justify-center !h-12"
          onClick={onClose}
        >
          {t('common.done')}
        </Button>
      </div>
    </div>,
    document.body,
  );
};

const FilterGroup = ({ filter }: { filter: LibraryFilter }) => {
  const labelId = useId();

  return (
    <div className="mt-3.5">
      <p id={labelId} className="mb-2 text-[13px] font-bold text-white/70">
        {filter.caption}
      </p>
      <div
        role={filter.kind === 'select' ? 'radiogroup' : 'group'}
        aria-labelledby={labelId}
        className="grid grid-cols-3 gap-1.5"
      >
        {filter.options.map((option) => {
          const on =
            filter.kind === 'select'
              ? filter.value === option.value
              : filter.values.includes(option.value);

          return (
            <button
              key={option.value}
              type="button"
              {...(filter.kind === 'select'
                ? { role: 'radio', 'aria-checked': on }
                : { 'aria-pressed': on })}
              onClick={() => {
                if (filter.kind === 'select') {
                  if (on) return;
                  playHaptic({ id: 'selection' });
                  filter.onChange(option.value);

                  return;
                }

                playHaptic({ id: 'selection' });
                filter.onChange(
                  on
                    ? filter.values.filter((v) => v !== option.value)
                    : [...filter.values, option.value],
                );
              }}
              className={`dp-lib-tile flex min-h-11 items-center justify-center gap-1.5 rounded-[11px] px-2 py-1.5 text-center text-[13.5px] font-bold leading-[1.15] text-balance ${
                on ? 'is-on' : ''
              }`}
            >
              {filter.kind === 'multi' && on && (
                <Check
                  className="size-[15px] flex-none text-accent"
                  strokeWidth={2.8}
                  aria-hidden="true"
                />
              )}
              {option.label}
            </button>
          );
        })}
      </div>
    </div>
  );
};

export default LibraryFilterSheet;
