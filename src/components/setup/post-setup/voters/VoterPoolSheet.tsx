'use client';
import { useTranslations } from 'next-intl';
import React, {
  useEffect,
  useId,
  useLayoutEffect,
  useRef,
  useState,
} from 'react';
import { createPortal } from 'react-dom';

import Button from '@/components/common/Button';
import {
  DRAG_THRESHOLD,
  useSheetDrag,
} from '@/components/simulation/columnLayout/useSheetDrag';
import { useBackHandler } from '@/hooks/useBackHandler';

/** How long the sheet takes to slide away (`dp-sim-sheet-out`). */
const EXIT_MS = 200;

interface VoterPoolSheetProps {
  open: boolean;
  onClose: () => void;
  children: React.ReactNode;
}

/**
 * Phones: Add voters as the simulation's ⋯ sheet (slides up over a fading
 * scrim, pulls down to close). It stays open while countries are added, so
 * several can be picked in a row; Done closes it.
 */
const VoterPoolSheet: React.FC<VoterPoolSheetProps> = ({
  open,
  onClose,
  children,
}) => {
  const t = useTranslations();
  const titleId = useId();
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
        className={`dp-sim-sheet dp-sim-menu-sheet absolute inset-x-0 bottom-0 h-[86dvh] overflow-y-auto overscroll-contain rounded-t-[22px] px-3.5 pb-[calc(var(--safe-bottom-bar)+12px)] pt-2 text-white outline-none ${
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
        <div className="mb-2 flex min-h-11 items-center gap-3">
          <h3
            id={titleId}
            className="min-w-0 flex-1 truncate text-[17px] font-extrabold tracking-[-0.015em]"
          >
            {t('setup.stageSetup.addVoters')}
          </h3>
          <Button
            variant="surface"
            size="md"
            className="flex-none px-4"
            onClick={onClose}
          >
            {t('common.done')}
          </Button>
        </div>
        {children}
      </div>
    </div>,
    document.body,
  );
};

export default VoterPoolSheet;
