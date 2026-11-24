'use client';
import { useTranslations } from 'next-intl';
import React, {
  forwardRef,
  useId,
  useLayoutEffect,
  useRef,
  useState,
} from 'react';

import { getTabItems, PickerItem, PickerTab } from './pickerItems';
import PickerMark from './PickerMark';

import { PinIcon } from '@/assets/icons/PinIcon';
import SegmentedTabs from '@/components/common/SegmentedTabs';
import { CONTEST_TYPE_TAB_NAMES } from '@/data/contestTypes';
import { fitStepAttributes, useFitStep } from '@/hooks/useFitStep';

export type PickerForm = 'panel' | 'sheet';

const COLUMNS = 4;
const TILE_GAP = 6;
const ROW_HEIGHT = 44;
const ROW_GAP = 2;
/** A longer tab scrolls inside instead (a big quick select). */
const MAX_TAB_PANEL = 360;
const TILE_HEIGHT: Record<PickerForm, number> = { panel: 40, sheet: 44 };
/** Padding inside the scrolling areas, so the chosen tile's ring isn't clipped. */
const RING_ROOM = 2;

/** Quick select shrinks to its pin when the tab labels don't fit. */
const TAB_STEPS = [{ quick: 'label' }, { quick: 'icon' }] as const;

/** The tab panel is as tall as the tallest tab, so switching moves nothing. */
const tabPanelHeight = (
  counts: { tab: PickerTab; count: number }[],
  form: PickerForm,
) => {
  const heights = counts.map(({ tab, count }) => {
    if (tab === 'pinned') return count * ROW_HEIGHT + (count - 1) * ROW_GAP;

    const rows = Math.ceil(count / COLUMNS);

    return rows * TILE_HEIGHT[form] + (rows - 1) * TILE_GAP;
  });

  return Math.min(Math.max(0, ...heights), MAX_TAB_PANEL);
};

const ARROW_STEPS: Record<string, (columns: number) => number> = {
  ArrowRight: () => 1,
  ArrowLeft: () => -1,
  ArrowDown: (columns) => columns,
  ArrowUp: (columns) => -columns,
};

/** Arrow keys, Home and End move between a listbox's options. */
const moveFocus = (e: React.KeyboardEvent<HTMLElement>, columns: number) => {
  const options = Array.from(
    e.currentTarget.querySelectorAll<HTMLElement>('[role="option"]'),
  );
  const index = options.indexOf(document.activeElement as HTMLElement);
  const last = options.length - 1;
  let next: number | undefined;

  if (index < 0) return;
  if (ARROW_STEPS[e.key]) next = index + ARROW_STEPS[e.key](columns);
  else if (e.key === 'Home') next = 0;
  else if (e.key === 'End') next = last;
  else return;

  e.preventDefault();
  if (next >= 0 && next <= last) options[next].focus();
};

/** The tabbable option of a listbox: the current pick, else the first. */
const entryValue = (items: PickerItem[], value: string) =>
  items.some((item) => item.value === value) ? value : items[0]?.value;

const fullName = (item: PickerItem) =>
  item.host ? `${item.name}, ${item.host}` : item.name;

type PickerBodyProps = {
  form: PickerForm;
  value: string;
  query: string;
  results: PickerItem[];
  latest: PickerItem[];
  tabs: PickerTab[];
  tab?: PickerTab;
  onTabChange: (tab: PickerTab) => void;
  pinned: PickerItem[];
  editions: PickerItem[];
  onPick: (item: PickerItem) => void;
  /** The heading that names the picker ("Contest"). */
  labelledBy: string;
};

/**
 * The picker's content, the same in the desktop panel and the phone sheet:
 * Latest, then the tabs (Quick select and the series) over a grid of
 * years, newest first. While searching, one list of matches with full
 * names takes their place at the same height.
 */
const PickerBody = forwardRef<HTMLDivElement, PickerBodyProps>(
  (
    {
      form,
      value,
      query,
      results,
      latest,
      tabs,
      tab,
      onTabChange,
      pinned,
      editions,
      onPick,
      labelledBy,
    },
    ref,
  ) => {
    const t = useTranslations();
    const idPrefix = useId();
    const latestId = `${idPrefix}latest`;
    const mainRef = useRef<HTMLDivElement>(null);
    const tabsRef = useRef<HTMLDivElement>(null);
    const [mainHeight, setMainHeight] = useState<number>();
    const searching = query.trim() !== '';
    const step = useFitStep(tabsRef, TAB_STEPS, {
      targets: '.dp-pick-tab-text',
    });

    // Search results keep the height Latest and the tabs had.
    useLayoutEffect(() => {
      const height = mainRef.current?.offsetHeight;

      if (!searching && height && height !== mainHeight) setMainHeight(height);
    }, [searching, mainHeight, tab, tabs.length, latest.length]);

    const tabId = (id: PickerTab) => `${idPrefix}tab-${id}`;
    const panelId = (id: PickerTab) => `${idPrefix}panel-${id}`;
    const tileHeight = TILE_HEIGHT[form];

    const option = (item: PickerItem, entry: string | undefined) => ({
      type: 'button' as const,
      role: 'option',
      'aria-selected': item.value === value,
      tabIndex: item.value === entry ? 0 : -1,
      onClick: () => onPick(item),
    });

    const row = (
      item: PickerItem,
      entry: string | undefined,
      caption?: string,
    ) => (
      <button
        key={item.value}
        {...option(item, entry)}
        className={`dp-pick-row flex min-h-11 w-full items-center gap-2.5 rounded-[9px] px-2.5 py-1.5 text-left ${
          item.value === value ? 'is-on' : ''
        }`}
      >
        <PickerMark item={item} size="row" thumbnail />
        <span className="flex min-w-0 flex-col gap-[3px] leading-tight">
          <span className="truncate text-[14.5px] font-extrabold tracking-[-.01em]">
            {item.name}
          </span>
          {caption && (
            <span className="truncate text-[12px] font-semibold text-white/55">
              {caption}
            </span>
          )}
        </span>
      </button>
    );

    if (searching) {
      const entry = results[0]?.value;

      return (
        <div
          ref={ref}
          className="-mx-0.5 overflow-y-auto overscroll-contain p-0.5"
          style={{ height: mainHeight }}
        >
          {results.length ? (
            <div
              role="listbox"
              aria-labelledby={labelledBy}
              onKeyDown={(e) => moveFocus(e, 1)}
              className="dp-pick-options flex flex-col gap-0.5"
            >
              {results.map((item) =>
                row(
                  item,
                  entry,
                  item.host ??
                    (item.series
                      ? undefined
                      : t('setup.eventSetupModal.picker.quickSelect')),
                ),
              )}
            </div>
          ) : (
            <p className="px-2.5 py-5 text-[14px] leading-normal text-white/70">
              {t('setup.eventSetupModal.picker.noResults', {
                query: query.trim(),
              })}
            </p>
          )}
        </div>
      );
    }

    const latestEntry = entryValue(latest, value);
    const tabItems = tab ? getTabItems(tab, pinned, editions) : [];
    const tabEntry = entryValue(tabItems, value);
    const height = tabPanelHeight(
      tabs.map((id) => ({
        tab: id,
        count: getTabItems(id, pinned, editions).length,
      })),
      form,
    );

    return (
      <div ref={ref}>
        <div ref={mainRef}>
          {latest.length > 0 && (
            <>
              <h4
                id={latestId}
                className="mb-2 px-0.5 text-[12.5px] font-bold text-white/70"
              >
                {t('setup.eventSetupModal.picker.latest')}
              </h4>
              <div
                role="listbox"
                aria-labelledby={latestId}
                aria-orientation="horizontal"
                onKeyDown={(e) => moveFocus(e, latest.length)}
                className="dp-pick-options flex gap-1.5"
              >
                {latest.map((item) => {
                  const on = item.value === value;
                  const label = (
                    <>
                      <span className="text-[15px] font-extrabold leading-none tracking-[-.01em]">
                        {item.year}
                      </span>
                      {item.series && (
                        <span className="max-w-full truncate text-[12px] font-semibold leading-none opacity-75">
                          {CONTEST_TYPE_TAB_NAMES[item.series]}
                        </span>
                      )}
                    </>
                  );

                  return item.thumbnailUrl ? (
                    <button
                      key={item.value}
                      {...option(item, latestEntry)}
                      aria-label={fullName(item)}
                      className={`dp-pick-thumb flex h-[76px] min-w-0 flex-1 basis-0 flex-col items-center justify-end gap-[5px] rounded-xl px-0.5 pb-3 ${
                        on ? 'is-on' : ''
                      }`}
                      style={{ backgroundImage: `url(${item.thumbnailUrl})` }}
                    >
                      {label}
                    </button>
                  ) : (
                    <button
                      key={item.value}
                      {...option(item, latestEntry)}
                      aria-label={fullName(item)}
                      className={`dp-pick-latest flex h-[76px] min-w-0 flex-1 basis-0 flex-col items-center justify-center gap-[5px] rounded-xl px-0.5 ${
                        on ? 'is-on' : ''
                      }`}
                    >
                      <PickerMark item={item} size="latest" />
                      {label}
                    </button>
                  );
                })}
              </div>
            </>
          )}

          {tabs.length > 1 && tab && (
            <div
              ref={tabsRef}
              className="mt-3.5"
              {...fitStepAttributes(TAB_STEPS[step])}
            >
              <SegmentedTabs
                tabs={tabs.map((id) => ({
                  value: id,
                  label:
                    id === 'pinned' ? (
                      <span className="flex min-w-0 items-center justify-center gap-1.5">
                        <PinIcon className="size-[15px] flex-none" />
                        <span className="dp-pick-tab-text dp-pick-quick-text truncate">
                          {t('setup.eventSetupModal.picker.quickSelect')}
                        </span>
                      </span>
                    ) : (
                      <span className="dp-pick-tab-text block truncate">
                        {CONTEST_TYPE_TAB_NAMES[id]}
                      </span>
                    ),
                }))}
                value={tab}
                onChange={onTabChange}
                ariaLabelledBy={labelledBy}
                tabId={tabId}
                panelId={panelId}
                large={form === 'sheet'}
                fill
                className="flex"
              />
            </div>
          )}

          {tab && (
            <div
              role="tabpanel"
              id={panelId(tab)}
              aria-labelledby={tabs.length > 1 ? tabId(tab) : labelledBy}
              className="-mx-0.5 mt-2 overflow-y-auto overscroll-contain p-0.5"
              style={{ height: height + RING_ROOM * 2 }}
            >
              {tab === 'pinned' ? (
                <div
                  role="listbox"
                  aria-labelledby={tabId(tab)}
                  onKeyDown={(e) => moveFocus(e, 1)}
                  className="dp-pick-options flex flex-col gap-0.5"
                >
                  {tabItems.map((item) => row(item, tabEntry))}
                </div>
              ) : (
                <div
                  role="listbox"
                  aria-labelledby={tabs.length > 1 ? tabId(tab) : labelledBy}
                  onKeyDown={(e) => moveFocus(e, COLUMNS)}
                  className="dp-pick-options grid grid-cols-4 gap-1.5"
                >
                  {tabItems.map((item) => {
                    const on = item.value === value;

                    return item.thumbnailUrl ? (
                      <button
                        key={item.value}
                        {...option(item, tabEntry)}
                        aria-label={fullName(item)}
                        className={`dp-pick-thumb rounded-[9px] text-[14.5px] font-extrabold tracking-[-.01em] ${
                          on ? 'is-on' : ''
                        }`}
                        style={{
                          height: tileHeight,
                          backgroundImage: `url(${item.thumbnailUrl})`,
                        }}
                      >
                        {item.year}
                      </button>
                    ) : (
                      <button
                        key={item.value}
                        {...option(item, tabEntry)}
                        aria-label={fullName(item)}
                        className={`dp-pick-tile flex items-center justify-center gap-[7px] rounded-[9px] px-1.5 text-[14.5px] font-extrabold tracking-[-.01em] ${
                          on ? 'is-on' : ''
                        }`}
                        style={{ height: tileHeight }}
                      >
                        <PickerMark item={item} size="tile" />
                        {item.year}
                      </button>
                    );
                  })}
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    );
  },
);

PickerBody.displayName = 'PickerBody';

export default PickerBody;
