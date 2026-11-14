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

const GAP = 8;
const MARGIN = 8;

interface PopoverProps {
  open: boolean;
  anchor: HTMLElement | null;
  onClose: () => void;
  children: React.ReactNode;
  /** Opens above the anchor when it fits (stripes, panels pinned low). */
  preferAbove?: boolean;
  align?: 'start' | 'end' | 'center';
  ariaLabel: string;
  className?: string;
}

/**
 * A small floating panel anchored to a button (presentation options, the
 * stripe's random menu). Portaled to the body, so it is never clipped or
 * scaled by the board's zoom; closes on outside press, Escape and the
 * Android back button.
 */
const Popover = ({
  open,
  anchor,
  onClose,
  children,
  preferAbove = true,
  align = 'end',
  ariaLabel,
  className = '',
}: PopoverProps) => {
  const ref = useRef<HTMLDivElement>(null);
  const [style, setStyle] = useState<React.CSSProperties>({
    position: 'fixed',
    visibility: 'hidden',
  });

  useBackHandler(open, onClose);

  const place = useCallback(() => {
    const el = ref.current;

    if (!el || !anchor) return;

    const rect = anchor.getBoundingClientRect();
    const width = el.offsetWidth;
    const height = el.offsetHeight;
    const fitsAbove = rect.top - GAP - height >= MARGIN;
    const fitsBelow = rect.bottom + GAP + height <= window.innerHeight - MARGIN;
    const above = preferAbove
      ? fitsAbove || !fitsBelow
      : !fitsBelow && fitsAbove;
    const top = above ? rect.top - GAP - height : rect.bottom + GAP;

    let left = rect.right - width;

    if (align === 'start') ({ left } = rect);
    if (align === 'center') left = rect.left + rect.width / 2 - width / 2;

    left = Math.min(Math.max(left, MARGIN), window.innerWidth - width - MARGIN);

    setStyle({
      position: 'fixed',
      top: Math.max(top, MARGIN),
      left,
      zIndex: 10000,
      visibility: 'visible',
    });
  }, [anchor, preferAbove, align]);

  useLayoutEffect(() => {
    if (open) place();
  }, [open, place]);

  useEffect(() => {
    if (!open) return undefined;

    const onPointerDown = (e: PointerEvent) => {
      const target = e.target as Node;

      if (ref.current?.contains(target) || anchor?.contains(target)) return;

      onClose();
    };
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.stopPropagation();
        onClose();
        anchor?.focus();
      }
    };

    document.addEventListener('pointerdown', onPointerDown, true);
    document.addEventListener('keydown', onKeyDown, true);
    window.addEventListener('resize', place);

    return () => {
      document.removeEventListener('pointerdown', onPointerDown, true);
      document.removeEventListener('keydown', onKeyDown, true);
      window.removeEventListener('resize', place);
    };
  }, [open, anchor, onClose, place]);

  if (!open || typeof document === 'undefined') return null;

  return createPortal(
    <div
      ref={ref}
      role="dialog"
      aria-label={ariaLabel}
      style={style}
      className={`dp-sim-float rounded-[14px] p-3.5 text-white ${className}`}
    >
      {children}
    </div>,
    document.body,
  );
};

export default Popover;
