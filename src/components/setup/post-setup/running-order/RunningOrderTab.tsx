'use client';

import {
  ArrowDown,
  ArrowDownAZ,
  ArrowDownUp,
  ArrowDownZA,
  ArrowLeft,
  ArrowRight,
  ArrowUp,
  ChevronDown,
  Share,
  Shuffle,
} from 'lucide-react';
import { useTranslations } from 'next-intl';
import React, { useState } from 'react';

import { noDrag } from '../noDrag';

import { useRunningOrder } from './useRunningOrder';

import AnchoredMenu, {
  AnchoredMenuEntry,
} from '@/components/common/AnchoredMenu';
import Button from '@/components/common/Button';
import {
  SortableItem,
  SortableList,
} from '@/components/common/sort/SortableList';
import { BoardCap, BoardFlag } from '@/components/setup/hub/lineup/CountryTile';
import { useBoardRowLook } from '@/components/setup/hub/lineup/useBoardRowLook';
import { playHaptic } from '@/native/haptics';

type RunningOrder = ReturnType<typeof useRunningOrder>;

/** What a change replaced, so Undo can put it back. */
interface LastAction {
  message: string;
  codes: string[];
  firstHalfSize: number | null;
  movedCode: string | null;
}

interface RunningOrderTabProps {
  ro: RunningOrder;
  /** Called before any change, so the modal can tell it was edited. */
  onTouch: () => void;
  onShare: () => void;
}

/** Grid placement for the two-column layout (styles.css `.dp-ss-ro-list`). */
const place = (col: number, row: number) =>
  ({ '--ro-col': col, '--ro-row': row } as React.CSSProperties);

/**
 * The running order as the board will draw it: the theme's jury rows,
 * numbered outside the row, in two columns that read down (one on phones).
 * Drawn halves are the two columns; a row's points box moves it to the other
 * half. Sorts, the draw and going back live in one Order menu, and each one
 * (like a move across the halves) leaves a line with Undo.
 */
export const RunningOrderTab: React.FC<RunningOrderTabProps> = ({
  ro,
  onTouch,
  onShare,
}) => {
  const t = useTranslations('setup.stageSetup');
  const tDraw = useTranslations('setup.allocationDraw');
  const tStage = useTranslations('setup.eventStageModal');
  const look = useBoardRowLook();
  const {
    orderedCodes,
    orderedCountries,
    firstHalfSize,
    setOrderedCodes,
    setFirstHalfSize,
    handleRunningOrderSortEnd,
    handleQuickSort,
    handleDrawHalves,
    handleRemoveHalves,
    handleMoveToOtherHalf,
  } = ro;

  const [last, setLast] = useState<LastAction | null>(null);
  const [menuOpen, setMenuOpen] = useState(false);
  const [anchor, setAnchor] = useState<HTMLButtonElement | null>(null);

  const count = orderedCountries.length;
  const hasHalves =
    firstHalfSize !== null &&
    firstHalfSize >= 0 &&
    firstHalfSize <= count &&
    count > 1;
  const half = hasHalves ? firstHalfSize : 0;

  const run = (
    message: string,
    apply: () => void,
    movedCode: string | null = null,
  ) => {
    onTouch();
    const snapshot = { codes: orderedCodes, firstHalfSize };

    apply();
    setLast({ message, movedCode, ...snapshot });
  };

  const undo = () => {
    if (!last) return;
    setOrderedCodes(last.codes);
    setFirstHalfSize(last.firstHalfSize);
    setLast(null);
    playHaptic({ id: 'undo' });
  };

  const drawHalves = () => {
    const first = Math.floor(count / 2);

    run(t('roDoneHalves', { first, second: count - first }), () => {
      handleDrawHalves();
    });
  };

  const nameOf = (code: string) =>
    orderedCountries.find((c) => c.code === code)?.name ?? '';

  const onSortEnd = (from: number, to: number) => {
    if (from === to) return;
    onTouch();
    const snapshot = { codes: orderedCodes, firstHalfSize };
    const code = orderedCodes[from];
    const movedTo = handleRunningOrderSortEnd(from, to);

    setLast(
      movedTo
        ? {
            message: t('roDoneMoved', {
              name: nameOf(code),
              half: movedTo === 1 ? 'first' : 'second',
            }),
            movedCode: code,
            ...snapshot,
          }
        : null,
    );
  };

  const moveToOtherHalf = (code: string) => {
    const toSecond = orderedCodes.indexOf(code) < half;

    run(
      t('roDoneMoved', {
        name: nameOf(code),
        half: toSecond ? 'second' : 'first',
      }),
      () => {
        handleMoveToOtherHalf(code);
      },
      code,
    );
  };

  const menuItems: AnchoredMenuEntry[] = [
    {
      label: t('sortAZ'),
      icon: <ArrowDownAZ className="size-[17px]" />,
      onClick: () =>
        run(t(hasHalves ? 'roDoneAZHalves' : 'doneAZ'), () =>
          handleQuickSort('az'),
        ),
    },
    {
      label: t('sortZA'),
      icon: <ArrowDownZA className="size-[17px]" />,
      onClick: () =>
        run(t(hasHalves ? 'roDoneZAHalves' : 'doneZA'), () =>
          handleQuickSort('za'),
        ),
    },
    {
      label: t('shuffle'),
      icon: <Shuffle className="size-[17px]" />,
      onClick: () =>
        run(t(hasHalves ? 'roDoneShuffleHalves' : 'doneShuffle'), () =>
          handleQuickSort('shuffle'),
        ),
    },
    ...(count > 1
      ? ([
          'hr',
          {
            label: hasHalves ? t('roDrawHalvesAgain') : tDraw('roDrawHalves'),
            description: tDraw('roDrawHalvesHint'),
            onClick: drawHalves,
          },
          ...(hasHalves
            ? [
                {
                  label: tDraw('roRemoveHalves'),
                  description: t('roRemoveHalvesHint'),
                  onClick: () => run(t('roDoneNoHalves'), handleRemoveHalves),
                },
              ]
            : []),
        ] as AnchoredMenuEntry[])
      : []),
    'hr',
    {
      label: t('roBackToSaved'),
      description: t('roBackToSavedHint'),
      onClick: () => run(t('roDoneSaved'), () => handleQuickSort('reset')),
    },
  ];

  // Two columns: the halves, or the order split in two, each reading down.
  const rowsPerColumn = hasHalves
    ? Math.max(half, count - half)
    : Math.ceil(count / 2);
  const headerRows = hasHalves ? 1 : 0;
  const cellFor = (index: number) => {
    const split = hasHalves ? half : rowsPerColumn;
    const col = index < split ? 1 : 2;
    const row = (col === 1 ? index : index - split) + 1 + headerRows;

    return place(col, row);
  };

  const rows: React.ReactNode[] = [];
  const halfHeader = (which: 1 | 2) => (
    <div
      key={`half-${which}`}
      role="presentation"
      // Not a sortable row: SortableList counts rows without it.
      data-sortable-ignore=""
      className="dp-ss-ro-half"
      style={place(which, 1)}
    >
      <span>{which === 1 ? tDraw('firstHalf') : tDraw('secondHalf')}</span>
      <i aria-hidden="true" />
      <span className="tabular-nums text-white/55">
        {which === 1 ? half : count - half}
      </span>
    </div>
  );

  orderedCountries.forEach((country, index) => {
    if (hasHalves && index === 0) rows.push(halfHeader(1));
    if (hasHalves && index === half) rows.push(halfHeader(2));

    const inFirstHalf = hasHalves && index < half;
    const moveLabel = inFirstHalf
      ? tDraw('roMoveToSecondHalf')
      : tDraw('roMoveToFirstHalf');
    const moved = last?.movedCode === country.code;

    rows.push(
      <SortableItem key={country.code}>
        <div
          className={`dp-ss-ro-item ${moved ? 'is-moved' : ''}`}
          style={cellFor(index)}
        >
          <span className="dp-ss-ro-num">
            {String(index + 1).padStart(2, '0')}
          </span>
          <div className="relative min-w-0">
            <div
              className={`dp-ss-ro-board dp-scoreboard-font bg-countryItem-juryBg text-countryItem-juryCountryText ${
                look.rounded ? 'rounded-full' : 'rounded-[3px]'
              } flex h-10 min-w-0 cursor-grab touch-manipulation select-none items-center gap-[6px] overflow-hidden 2cols:h-9`}
              style={look.rowStyle}
            >
              <BoardFlag country={country} look={look} eager={index < 12} />
              <span
                className={`min-w-0 flex-1 truncate font-bold ${
                  look.uppercase
                    ? 'uppercase text-[12.5px] 2cols:text-[12.5px]'
                    : 'text-[13px]'
                } ${look.flagShape === 'none' ? 'pl-3' : ''}`}
              >
                {country.name}
              </span>
              <BoardCap look={look} widthClassName="w-[46px]" />
            </div>
            {hasHalves && (
              <button
                ref={noDrag}
                type="button"
                aria-label={`${country.name}: ${moveLabel}`}
                title={moveLabel}
                onClick={() => moveToOtherHalf(country.code)}
                className={`dp-ss-ro-move absolute inset-y-0 right-0 grid w-[46px] place-items-center text-countryItem-juryPointsText ${
                  look.rounded ? 'rounded-r-full' : 'rounded-r-[3px]'
                }`}
              >
                <span className="dp-ss-ro-arrow-v">
                  {inFirstHalf ? (
                    <ArrowDown className="size-4" aria-hidden="true" />
                  ) : (
                    <ArrowUp className="size-4" aria-hidden="true" />
                  )}
                </span>
                <span className="dp-ss-ro-arrow-h">
                  {inFirstHalf ? (
                    <ArrowRight className="size-4" aria-hidden="true" />
                  ) : (
                    <ArrowLeft className="size-4" aria-hidden="true" />
                  )}
                </span>
              </button>
            )}
          </div>
        </div>
      </SortableItem>,
    );
  });
  if (hasHalves && half === count) rows.push(halfHeader(2));

  return (
    <div className="dp-ss-ro">
      <div className="flex min-h-10 items-center gap-2">
        <h3 className="min-w-0 flex-1 truncate text-[15px] font-extrabold tracking-[-0.01em]">
          {t('entries', { count })}
        </h3>
        <button
          ref={setAnchor}
          type="button"
          aria-haspopup="menu"
          aria-expanded={menuOpen}
          onClick={() => setMenuOpen((open) => !open)}
          className={`dp-act ${
            menuOpen ? 'is-on' : ''
          } flex h-10 flex-none items-center gap-2 rounded-xl pl-3 pr-2.5 text-[13.5px] font-extrabold normal-case`}
        >
          <ArrowDownUp
            className="size-[17px] flex-none text-white/70"
            aria-hidden="true"
          />
          {t('order')}
          <ChevronDown
            className="size-4 flex-none text-white/70"
            aria-hidden="true"
          />
        </button>
        <Button
          variant="surface"
          size="md"
          className="flex-none"
          Icon={<Share className="size-[17px]" />}
          onClick={onShare}
          aria-label={tStage('shareRunningOrder')}
        >
          <span className="hidden 2cols:inline">{t('share')}</span>
        </Button>
      </div>

      <p className="dp-ss-line">
        {last ? (
          <>
            {last.message}{' '}
            <button type="button" onClick={undo} className="dp-ss-undo">
              {t('undo')}
            </button>
          </>
        ) : (
          <span className="text-white/55">
            {hasHalves ? t('roHintHalves') : t('roHint')}
          </span>
        )}
      </p>
      <p aria-live="polite" className="sr-only">
        {last?.message ?? ''}
      </p>

      <SortableList
        onSortEnd={onSortEnd}
        hapticBoundary={hasHalves ? half : null}
        className="dp-ss-ro-list"
        draggedItemClassName="dp-ss-dragged"
      >
        {rows}
      </SortableList>

      <AnchoredMenu
        open={menuOpen}
        anchor={anchor}
        onClose={() => setMenuOpen(false)}
        items={menuItems}
        placement="bottom-end"
        className="min-w-[300px] max-w-[min(360px,calc(100vw-16px))]"
        ariaLabel={t('order')}
        plainHeaders
      />
    </div>
  );
};
