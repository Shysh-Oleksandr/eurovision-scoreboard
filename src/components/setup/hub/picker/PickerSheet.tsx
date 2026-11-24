'use client';
import { X } from 'lucide-react';
import { useTranslations } from 'next-intl';
import React, { useEffect, useLayoutEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';

import {
  DRAG_THRESHOLD,
  useSheetDrag,
} from '@/components/simulation/columnLayout/useSheetDrag';
import { useBackHandler } from '@/hooks/useBackHandler';

/** How long the sheet takes to slide away (`dp-sim-sheet-out`). */
const EXIT_MS = 200;

type PickerSheetProps = {
  open: boolean;
  onClose: () => void;
  title: string;
  titleId: string;
  /** The search field, under the title. */
  search: React.ReactNode;
  children: React.ReactNode;
};

/**
 * The phone shell of the header picker: the simulation's ⋯ sheet (slides
 * up over a fading scrim, pulls down to close, Android back closes it),
 * titled with the field's name. The search field isn't focused on open, so
 * the keyboard doesn't cover the years.
 */
const PickerSheet = ({
  open,
  onClose,
  title,
  titleId,
  search,
  children,
}: PickerSheetProps) => {
  const t = useTranslations('common');
  const dialogRef = useRef<HTMLDivElement>(null);
  const [mounted, setMounted] = useState(open);
  const [pullY, setPullY] = useState(0);
  const [pulling, setPulling] = useState(false);

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

    dialogRef.current?.focus({ preventScroll: true });

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
        aria-label={t('close')}
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
        className={`dp-sim-sheet dp-sim-menu-sheet absolute inset-x-0 bottom-0 max-h-[88dvh] overflow-y-auto overscroll-contain rounded-t-[22px] px-3.5 pb-[calc(var(--safe-bottom-bar)+12px)] pt-2 text-white outline-none ${
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
            {title}
          </h3>
          <button
            type="button"
            onClick={onClose}
            aria-label={t('close')}
            className="-mr-2 ml-auto grid size-11 flex-none place-items-center rounded-xl text-white/70 transition-colors hover:bg-white/[0.08] hover:text-white focus-visible:outline focus-visible:outline-2 focus-visible:outline-accent"
          >
            <X className="size-5" aria-hidden="true" />
          </button>
        </div>
        <div className="mb-3.5 mt-1 flex">{search}</div>
        {children}
      </div>
    </div>,
    document.body,
  );
};

export default PickerSheet;
