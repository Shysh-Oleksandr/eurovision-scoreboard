'use client';
import { ChevronDown, Search } from 'lucide-react';
import React, {
  useCallback,
  useEffect,
  useId,
  useMemo,
  useRef,
  useState,
} from 'react';

import PickerBody from './PickerBody';
import {
  getInitialTab,
  getLatestEditions,
  getPickerTabs,
  PickerItem,
  PickerTab,
  searchPickerItems,
} from './pickerItems';
import PickerMark from './PickerMark';
import PickerPanel from './PickerPanel';
import PickerSheet from './PickerSheet';

import LibrarySearchField from '@/components/setup/widgets-section/library/LibrarySearchField';
import { ContestType } from '@/data/contestTypes';
import { useMediaQuery } from '@/hooks/useMediaQuery';
import { useTouchDevice } from '@/hooks/useTouchDevice';
import { playHaptic } from '@/native/haptics';

/** Phones, upright or on their side: the picker opens as a bottom sheet. */
const SHEET_QUERY = '(max-width: 575px), (max-height: 520px)';

const TRIGGER_CLASSES =
  'h-[46px] w-full flex items-center gap-2 px-3 text-[14.5px] font-extrabold tracking-[-.01em] text-white transition-colors';

type EditionPickerProps = {
  /** The trigger's id (`year-select-box`, `theme-select-box`). */
  id: string;
  /** The field's name: the sheet's title, the panel's label ("Contest"). */
  title: string;
  /** The small line inside the trigger ("Eurovision", "Theme"). */
  caption: React.ReactNode;
  /** What the trigger shows: the current pick, or the loaded saved one. */
  current?: PickerItem;
  /** The trigger's text for `current` (default: its name). */
  currentLabel?: string;
  value: string;
  editions: PickerItem[];
  /** The account's quick select entries. */
  pinned: PickerItem[];
  onChange: (value: string) => void;
  /** The tab to open on when the current pick is on none. */
  fallbackSeries?: ContestType;
  searchPlaceholder: string;
};

/**
 * The setup header's contest and theme picker: the combo's trigger, and
 * what opens from it (Latest, Quick select and the series as tabs over a
 * grid of years, search). A panel under the combo on desktop and tablets, a
 * bottom sheet on phones. See DESIGN.md, "Header".
 */
const EditionPicker: React.FC<EditionPickerProps> = ({
  id,
  title,
  caption,
  current,
  currentLabel,
  value,
  editions,
  pinned,
  onChange,
  fallbackSeries,
  searchPlaceholder,
}) => {
  // The field in state (a callback ref), so the panel never reads a ref
  // during render.
  const [field, setField] = useState<HTMLDivElement | null>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const bodyRef = useRef<HTMLDivElement>(null);
  const restoreFocusRef = useRef(false);
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [tab, setTab] = useState<PickerTab>();
  const asSheet = useMediaQuery(SHEET_QUERY);
  const isTouch = useTouchDevice();
  const panelId = useId();
  const titleId = useId();

  const latest = useMemo(() => getLatestEditions(editions), [editions]);
  const tabs = useMemo(
    () => getPickerTabs(pinned, editions, latest),
    [pinned, editions, latest],
  );
  const results = useMemo(
    () => searchPickerItems(pinned, editions, query),
    [pinned, editions, query],
  );

  const openPicker = () => {
    setQuery('');
    setTab(getInitialTab(tabs, value, pinned, editions, fallbackSeries));
    setOpen(true);
  };

  const close = useCallback((restoreFocus = false) => {
    restoreFocusRef.current = restoreFocus;
    setOpen(false);
  }, []);
  const closeSheet = useCallback(() => close(true), [close]);

  // Back to the trigger after Esc or a pick, unless something else (the
  // change-contest confirmation) has taken the focus.
  useEffect(() => {
    if (open || !restoreFocusRef.current) return;

    restoreFocusRef.current = false;

    const active = document.activeElement;

    if (!active || active === document.body) {
      triggerRef.current?.focus({ preventScroll: true });
    }
  }, [open]);

  // The panel searches as you type; on touch screens the keyboard waits
  // for a tap on the field.
  useEffect(() => {
    if (open && !asSheet && !isTouch) {
      inputRef.current?.focus({ preventScroll: true });
    }
  }, [open, asSheet, isTouch]);

  const pick = (item: PickerItem) => {
    if (asSheet) playHaptic({ id: 'selection' });
    close(true);
    if (item.value !== value) onChange(item.value);
  };

  const focusFirstOption = () => {
    const root = bodyRef.current;

    (
      root?.querySelector<HTMLElement>('[role="option"][tabindex="0"]') ??
      root?.querySelector<HTMLElement>('[role="option"]')
    )?.focus();
  };

  const onSearchKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Escape') {
      // Esc closes the picker, not the dialog around it.
      e.preventDefault();
      e.stopPropagation();
      close(true);
    } else if (e.key === 'ArrowDown' || (e.key === 'Tab' && !e.shiftKey)) {
      e.preventDefault();
      focusFirstOption();
    } else if (e.key === 'Enter' && results[0]) {
      e.preventDefault();
      pick(results[0]);
    }
  };

  const body = (
    <PickerBody
      ref={bodyRef}
      form={asSheet ? 'sheet' : 'panel'}
      value={value}
      query={query}
      results={results}
      latest={latest}
      tabs={tabs}
      tab={tab}
      onTabChange={setTab}
      pinned={pinned}
      editions={editions}
      onPick={pick}
      labelledBy={titleId}
    />
  );

  return (
    <>
      <div ref={setField} className="min-w-0">
        {open && !asSheet ? (
          // While the panel is open the trigger is its search field, as the
          // old select's was.
          <div
            className={`${TRIGGER_CLASSES} cursor-text`}
            onMouseDown={(e) => {
              if (e.target === inputRef.current) return;
              e.preventDefault();
              close(true);
            }}
          >
            <Search
              className="size-[17px] flex-none text-white/55"
              aria-hidden="true"
            />
            <input
              ref={inputRef}
              id={id}
              type="text"
              role="combobox"
              aria-expanded
              aria-controls={panelId}
              aria-autocomplete="list"
              aria-label={searchPlaceholder}
              placeholder={searchPlaceholder}
              enterKeyHint="search"
              autoComplete="off"
              spellCheck={false}
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              onKeyDown={onSearchKeyDown}
              className="h-full min-w-0 flex-1 bg-transparent font-bold text-white caret-accent outline-none placeholder:font-semibold placeholder:text-white/60"
            />
            <ChevronDown
              className="ml-auto hidden size-4 flex-none text-white/40 2cols:block"
              aria-hidden="true"
            />
          </div>
        ) : (
          <button
            ref={triggerRef}
            id={id}
            type="button"
            aria-haspopup="dialog"
            aria-expanded={open}
            aria-label={`${title}: ${current?.name ?? currentLabel ?? ''}`}
            onClick={() => (open ? close() : openPicker())}
            className={`${TRIGGER_CLASSES} cursor-pointer text-left hover:bg-white/5 focus-visible:bg-white/[0.08] focus-visible:shadow-[inset_0_0_0_2px_var(--accent)] focus-visible:outline-none`}
          >
            {current && <PickerMark item={current} size="trigger" />}
            <span className="flex min-w-0 flex-col gap-[3px] leading-none">
              <span className="truncate text-[12px] font-semibold tracking-normal text-white/75">
                {caption}
              </span>
              <span className="truncate">{currentLabel ?? current?.name}</span>
            </span>
            <ChevronDown
              className="ml-auto hidden size-4 flex-none text-white/40 2cols:block"
              aria-hidden="true"
            />
          </button>
        )}
      </div>

      {asSheet ? (
        <PickerSheet
          open={open}
          onClose={closeSheet}
          title={title}
          titleId={titleId}
          search={
            <LibrarySearchField
              value={query}
              onChange={setQuery}
              placeholder={searchPlaceholder}
            />
          }
        >
          {body}
        </PickerSheet>
      ) : (
        <PickerPanel
          open={open}
          id={panelId}
          label={title}
          anchor={field?.closest<HTMLElement>('.dp-combo-field') ?? field}
          ignore={field}
          onClose={close}
          onTabBack={() => inputRef.current?.focus()}
        >
          <h3 id={titleId} className="sr-only">
            {title}
          </h3>
          {body}
        </PickerPanel>
      )}
    </>
  );
};

export default EditionPicker;
