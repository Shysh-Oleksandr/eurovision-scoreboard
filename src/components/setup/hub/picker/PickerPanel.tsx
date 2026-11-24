'use client';
import React, {
  useCallback,
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
} from 'react';
import { createPortal } from 'react-dom';

import { useBackHandler } from '@/hooks/useBackHandler';

const GAP = 6;
const VIEWPORT_MARGIN = 8;
const WIDTH = 392;

const FOCUSABLE =
  'button:not([disabled]):not([tabindex="-1"]), input:not([disabled]), [tabindex="0"]';

type PickerPanelProps = {
  open: boolean;
  /** The combo field the panel hangs from. */
  anchor: HTMLElement | null;
  /** Presses here aren't outside presses (the trigger and its search). */
  ignore: HTMLElement | null;
  onClose: (restoreFocus?: boolean) => void;
  /** Shift+Tab from the panel's first stop: back to the search field. */
  onTabBack: () => void;
  id: string;
  label: string;
  children: React.ReactNode;
};

/**
 * The desktop and tablet shell of the header picker: a menu-material panel
 * under the combo, as wide as four year tiles need. No entrance animation,
 * like the menus. Closes on Esc, a press outside, a scroll outside, or Tab
 * past its last stop.
 */
const PickerPanel = ({
  open,
  anchor,
  ignore,
  onClose,
  onTabBack,
  id,
  label,
  children,
}: PickerPanelProps) => {
  const ref = useRef<HTMLDivElement>(null);
  const [style, setStyle] = useState<React.CSSProperties>({
    visibility: 'hidden',
  });

  useBackHandler(open, () => onClose(true));

  const place = useCallback(() => {
    if (!anchor) return;

    const rect = anchor.getBoundingClientRect();
    const width = Math.min(WIDTH, window.innerWidth - VIEWPORT_MARGIN * 2);
    const left = Math.min(
      Math.max(rect.left, VIEWPORT_MARGIN),
      window.innerWidth - width - VIEWPORT_MARGIN,
    );
    const top = rect.bottom + GAP;

    setStyle({
      top,
      left,
      width,
      maxHeight: window.innerHeight - top - VIEWPORT_MARGIN,
    });
  }, [anchor]);

  // Placed before paint, so it never flashes at 0,0.
  useLayoutEffect(() => {
    if (open) place();
  }, [open, place]);

  useEffect(() => {
    if (!open) return undefined;

    const isInside = (target: EventTarget | null) =>
      target instanceof Node &&
      (!!ref.current?.contains(target) || !!ignore?.contains(target));
    const onPointerDown = (e: PointerEvent) => {
      if (!isInside(e.target)) onClose();
    };
    const onScroll = (e: Event) => {
      if (!isInside(e.target)) onClose();
    };

    document.addEventListener('pointerdown', onPointerDown, true);
    window.addEventListener('scroll', onScroll, true);
    window.addEventListener('resize', place);

    return () => {
      document.removeEventListener('pointerdown', onPointerDown, true);
      window.removeEventListener('scroll', onScroll, true);
      window.removeEventListener('resize', place);
    };
  }, [open, ignore, onClose, place]);

  const onKeyDown = (e: React.KeyboardEvent<HTMLDivElement>) => {
    if (e.key === 'Escape') {
      e.preventDefault();
      e.stopPropagation();
      onClose(true);

      return;
    }

    if (e.key !== 'Tab' || !ref.current) return;

    const stops = Array.from(
      ref.current.querySelectorAll<HTMLElement>(FOCUSABLE),
    );

    if (e.shiftKey && document.activeElement === stops[0]) {
      e.preventDefault();
      onTabBack();
    } else if (
      !e.shiftKey &&
      document.activeElement === stops[stops.length - 1]
    ) {
      e.preventDefault();
      onClose(true);
    }
  };

  if (!open || typeof document === 'undefined') return null;

  return createPortal(
    <div
      ref={ref}
      id={id}
      role="dialog"
      aria-label={label}
      onKeyDown={onKeyDown}
      style={{ position: 'fixed', zIndex: 10000, ...style }}
      className="dp-menu overflow-y-auto overscroll-contain rounded-[14px] p-3 text-white"
    >
      {children}
    </div>,
    document.body,
  );
};

export default PickerPanel;
