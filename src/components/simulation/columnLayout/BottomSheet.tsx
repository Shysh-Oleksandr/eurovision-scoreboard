'use client';
import { useTranslations } from 'next-intl';
import React, {
  useEffect,
  useId,
  useLayoutEffect,
  useRef,
  useState,
} from 'react';

import { EdgeProgress } from './controls';
import { DRAG_THRESHOLD, useSheetDrag } from './useSheetDrag';

import { useBackHandler } from '@/hooks/useBackHandler';

type SheetSlot = React.ReactNode | ((close: () => void) => React.ReactNode);

interface BottomSheetProps {
  /** Always shown, under the grab handle. */
  peek: SheetSlot;
  /** Pulled up; without it the sheet can't be pulled up (results). */
  body?: SheetSlot;
  /** The round's progress along the top edge. */
  progress?: number;
  /** Any change closes the sheet (a phase change replaced the controls). */
  resetKey: string;
  /** Reports the collapsed height so the board can keep its last rows clear. */
  onPeekHeight: (height: number) => void;
}

const render = (slot: SheetSlot, close: () => void) =>
  typeof slot === 'function' ? slot(close) : slot;

/**
 * Phones: the column folded into a bottom sheet (the standard mode's
 * `VotingSheet`, Pick qualifiers mode's `QualifiersSheet`). It opens with a
 * tap on the grab handle or a drag anywhere on it (`useSheetDrag`): pull the
 * peek up, push the open sheet down from the peek or its controls (scrolled
 * controls scroll back to their top first). The controls follow the finger
 * and it opens or closes past 28px.
 */
const BottomSheet = ({
  peek,
  body,
  progress,
  resetKey,
  onPeekHeight,
}: BottomSheetProps) => {
  const t = useTranslations('simulation.view');
  const [open, setOpen] = useState(false);
  const [contentHeight, setContentHeight] = useState(0);
  const sectionRef = useRef<HTMLElement>(null);
  const peekRef = useRef<HTMLDivElement>(null);
  const safeRef = useRef<HTMLDivElement>(null);
  const bodyContentRef = useRef<HTMLDivElement>(null);
  const bodyId = useId();
  const canExpand = !!body;
  const close = () => setOpen(false);

  useBackHandler(open, close);

  useEffect(() => setOpen(false), [resetKey]);

  useLayoutEffect(() => {
    const peekEl = peekRef.current;
    const safe = safeRef.current;

    if (!peekEl || !safe) return undefined;

    // The collapsed sheet: the peek and the safe area under it.
    const report = () => onPeekHeight(peekEl.offsetHeight + safe.offsetHeight);

    report();

    const observer = new ResizeObserver(report);

    observer.observe(peekEl);
    observer.observe(safe);

    return () => observer.disconnect();
  }, [onPeekHeight]);

  // The controls' own height, laid out even while the sheet is closed.
  useLayoutEffect(() => {
    const el = bodyContentRef.current;

    if (!el) return undefined;

    const read = () => setContentHeight(el.offsetHeight);

    read();

    const observer = new ResizeObserver(read);

    observer.observe(el);

    return () => observer.disconnect();
  }, [canExpand]);

  // A drag: the controls under the peek follow the finger (0 closed, 1
  // open), so pulling up shows them coming in rather than empty space; past
  // DRAG_THRESHOLD the sheet opens or closes.
  const [reveal, setReveal] = useState<number | null>(null);

  useSheetDrag(sectionRef, {
    enabled: canExpand,
    onDrag: (dy) =>
      setReveal(
        Math.min(
          Math.max(Number(open) - dy / Math.max(contentHeight, 1), 0),
          1,
        ),
      ),
    onRelease: (dy) => {
      setReveal(null);

      if (dy < -DRAG_THRESHOLD) setOpen(true);
      else if (dy > DRAG_THRESHOLD) setOpen(false);
    },
    onCancel: () => setReveal(null),
  });

  const isDragging = reveal !== null;

  return (
    <>
      {(open || (reveal ?? 0) > 0) && (
        <button
          type="button"
          tabIndex={-1}
          aria-label={t('showFewerControls')}
          className="dp-sim-scrim fixed inset-0 z-[40]"
          style={isDragging ? { opacity: reveal } : undefined}
          onClick={close}
        />
      )}
      <section
        ref={sectionRef}
        aria-label={t('votingControls')}
        className={`dp-sim-sheet dp-sim-sheet-in fixed inset-x-0 bottom-0 z-[41] rounded-t-[22px] text-white ${
          isDragging ? 'select-none' : ''
        }`}
      >
        <EdgeProgress progress={progress} inset={22} />
        {/* The peek never scrolls: every vertical move here drags. */}
        <div
          ref={peekRef}
          className={`px-3.5 pb-[12px] pt-2 ${canExpand ? 'touch-none' : ''}`}
        >
          {canExpand ? (
            <button
              type="button"
              aria-expanded={open}
              aria-controls={bodyId}
              aria-label={open ? t('showFewerControls') : t('showMoreControls')}
              onClick={() => setOpen((value) => !value)}
              className="mx-auto -mt-1 flex h-6 w-16 touch-none items-center justify-center"
            >
              <span className="dp-sim-grab h-[5px] w-10 rounded-full" />
            </button>
          ) : (
            <div className="h-2" />
          )}
          {render(peek, close)}
        </div>

        {canExpand && (
          // Its height is set in px (the measured controls, 0 when closed,
          // a share of them mid-drag) so a drag and the settle after it are
          // one continuous movement; `fr` rows can't be dragged exactly.
          <div
            id={bodyId}
            className="dp-sim-sheet-body overflow-hidden"
            style={{
              height: (isDragging ? reveal : Number(open)) * contentHeight,
              transition: isDragging ? 'none' : undefined,
            }}
            aria-hidden={!open}
            inert={!open}
          >
            {/* Scrolls natively when it overflows; `useSheetDrag` takes a
                pull down once it is back at its top. */}
            <div
              ref={bodyContentRef}
              className="flex max-h-[62dvh] flex-col gap-4 overflow-y-auto overscroll-contain px-3.5 pb-[14px] pt-1"
            >
              {render(body, close)}
            </div>
          </div>
        )}
        {/* The safe area, under the peek or the open controls alike. */}
        <div
          ref={safeRef}
          aria-hidden="true"
          className={canExpand ? 'touch-none' : undefined}
          style={{ height: 'var(--safe-bottom-bar)' }}
        />
      </section>
    </>
  );
};

export default BottomSheet;
