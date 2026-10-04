'use client';

import React, {
  useCallback,
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
} from 'react';
import { createPortal } from 'react-dom';

export interface AnchoredMenuItem {
  label: string;
  /** Second, muted line under the label (e.g. why an item is unavailable). */
  description?: string;
  icon?: React.ReactNode;
  onClick?: () => void;
  variant?: 'default' | 'danger';
  disabled?: boolean;
  trailing?: React.ReactNode;
  /** Keep the menu open after this item is activated. */
  keepOpen?: boolean;
}

export interface AnchoredMenuHeader {
  variant: 'header';
  label: string;
}

/** A short explanatory paragraph (title + text), e.g. the reason a toggle is unavailable. */
export interface AnchoredMenuNote {
  variant: 'note';
  title: string;
  text?: string;
}

export type AnchoredMenuEntry =
  | AnchoredMenuItem
  | AnchoredMenuHeader
  | AnchoredMenuNote
  | 'hr';

export type AnchoredMenuPlacement =
  | 'bottom-start'
  | 'bottom-end'
  | 'top-start'
  | 'top-end';

interface AnchoredMenuProps {
  open: boolean;
  anchor: HTMLElement | null;
  onClose: () => void;
  items: AnchoredMenuEntry[];
  placement?: AnchoredMenuPlacement;
  minWidth?: number;
  ariaLabel?: string;
  className?: string;
}

const MENU_GAP = 6;
const VIEWPORT_MARGIN = 8;
const ENABLED_ITEM_SELECTOR = '[role="menuitem"]:not([aria-disabled="true"])';

const isHeader = (entry: AnchoredMenuEntry): entry is AnchoredMenuHeader =>
  typeof entry === 'object' && entry.variant === 'header';

const isNote = (entry: AnchoredMenuEntry): entry is AnchoredMenuNote =>
  typeof entry === 'object' && entry.variant === 'note';

const getEnabledItems = (menu: HTMLElement | null): HTMLElement[] =>
  menu
    ? Array.from(menu.querySelectorAll<HTMLElement>(ENABLED_ITEM_SELECTOR))
    : [];

const AnchoredMenu: React.FC<AnchoredMenuProps> = ({
  open,
  anchor,
  onClose,
  items,
  placement = 'bottom-start',
  minWidth,
  ariaLabel,
  className,
}) => {
  const menuRef = useRef<HTMLDivElement>(null);
  const [menuStyle, setMenuStyle] = useState<React.CSSProperties>({
    position: 'fixed',
    zIndex: 10000,
    visibility: 'hidden',
  });

  const updatePosition = useCallback(() => {
    const menu = menuRef.current;

    if (!menu || !anchor) return;

    const rect = anchor.getBoundingClientRect();
    const menuWidth = menu.offsetWidth;
    const menuHeight = menu.offsetHeight;
    const viewportWidth = window.innerWidth;
    const viewportHeight = window.innerHeight;

    const spaceBelow =
      viewportHeight - rect.bottom - MENU_GAP - VIEWPORT_MARGIN;
    const spaceAbove = rect.top - MENU_GAP - VIEWPORT_MARGIN;
    const prefersBottom = placement.startsWith('bottom');
    const fitsPreferred = prefersBottom
      ? menuHeight <= spaceBelow
      : menuHeight <= spaceAbove;
    const openBelow = fitsPreferred ? prefersBottom : spaceBelow >= spaceAbove;

    const rawTop = openBelow
      ? rect.bottom + MENU_GAP
      : rect.top - MENU_GAP - menuHeight;
    const maxTop = Math.max(
      VIEWPORT_MARGIN,
      viewportHeight - menuHeight - VIEWPORT_MARGIN,
    );
    const top = Math.min(Math.max(rawTop, VIEWPORT_MARGIN), maxTop);

    const rawLeft = placement.endsWith('start')
      ? rect.left
      : rect.right - menuWidth;
    const maxLeft = Math.max(
      VIEWPORT_MARGIN,
      viewportWidth - menuWidth - VIEWPORT_MARGIN,
    );
    const left = Math.min(Math.max(rawLeft, VIEWPORT_MARGIN), maxLeft);

    setMenuStyle({
      position: 'fixed',
      top,
      left,
      zIndex: 10000,
      visibility: 'visible',
      minWidth,
    });
  }, [anchor, placement, minWidth]);

  // Measure and position the menu before paint so it never flashes at 0,0.
  useLayoutEffect(() => {
    if (!open) {
      setMenuStyle({ position: 'fixed', zIndex: 10000, visibility: 'hidden' });

      return;
    }

    updatePosition();
  }, [open, updatePosition, items]);

  // Focus the first enabled item once the menu is visible.
  useEffect(() => {
    if (!open) return;

    const [first] = getEnabledItems(menuRef.current);

    (first ?? menuRef.current)?.focus({ preventScroll: true });
  }, [open]);

  // Outside pointerdown / scroll / resize / Escape close the menu.
  useEffect(() => {
    if (!open) return;

    const handlePointerDown = (e: PointerEvent) => {
      const target = e.target as Node;
      const insideAnchor = !!anchor && anchor.contains(target);
      const insideMenu = !!menuRef.current && menuRef.current.contains(target);

      if (!insideAnchor && !insideMenu) onClose();
    };
    const handleScroll = () => onClose();
    const handleResize = () => onClose();
    const handleDocumentKeyDown = (e: KeyboardEvent) => {
      if (e.key !== 'Escape') return;
      if (menuRef.current?.contains(document.activeElement)) return; // handled by the menu itself

      onClose();
    };

    document.addEventListener('pointerdown', handlePointerDown, true);
    document.addEventListener('keydown', handleDocumentKeyDown);
    window.addEventListener('scroll', handleScroll, true);
    window.addEventListener('resize', handleResize);

    return () => {
      document.removeEventListener('pointerdown', handlePointerDown, true);
      document.removeEventListener('keydown', handleDocumentKeyDown);
      window.removeEventListener('scroll', handleScroll, true);
      window.removeEventListener('resize', handleResize);
    };
  }, [open, anchor, onClose]);

  const closeAndRestoreFocus = useCallback(() => {
    onClose();
    anchor?.focus({ preventScroll: true });
  }, [onClose, anchor]);

  const handleKeyDown = (e: React.KeyboardEvent<HTMLDivElement>) => {
    const enabled = getEnabledItems(menuRef.current);
    const currentIndex = enabled.indexOf(document.activeElement as HTMLElement);

    const focusAt = (index: number) => {
      if (enabled.length === 0) return;

      const wrapped = (index + enabled.length) % enabled.length;

      enabled[wrapped]?.focus({ preventScroll: true });
    };

    switch (e.key) {
      case 'ArrowDown':
        e.preventDefault();
        focusAt(currentIndex + 1);
        break;
      case 'ArrowUp':
        e.preventDefault();
        focusAt(currentIndex === -1 ? enabled.length - 1 : currentIndex - 1);
        break;
      case 'Home':
        e.preventDefault();
        focusAt(0);
        break;
      case 'End':
        e.preventDefault();
        focusAt(enabled.length - 1);
        break;
      case 'Enter':
      case ' ':
        if (currentIndex !== -1) {
          e.preventDefault();
          enabled[currentIndex]?.click();
        }
        break;
      case 'Escape':
        e.preventDefault();
        e.stopPropagation();
        closeAndRestoreFocus();
        break;
      case 'Tab':
        onClose();
        break;
      default:
        break;
    }
  };

  const handleItemClick = (item: AnchoredMenuItem) => {
    if (item.disabled) return;

    item.onClick?.();

    if (!item.keepOpen) onClose();
  };

  if (!open || typeof document === 'undefined') return null;

  // Stable keys without falling back to array indices: count repeated labels.
  const seenKeys = new Map<string, number>();
  const keyFor = (base: string) => {
    const seen = seenKeys.get(base) ?? 0;

    seenKeys.set(base, seen + 1);

    return seen === 0 ? base : `${base}-${seen}`;
  };

  return createPortal(
    <div
      ref={menuRef}
      role="menu"
      aria-label={ariaLabel}
      tabIndex={-1}
      style={menuStyle}
      onKeyDown={handleKeyDown}
      className={`dp-menu p-1.5 rounded-xl min-w-[212px] shadow-[0_18px_44px_rgba(0,0,0,.6)] border border-white/[0.16] outline-none ${
        className ?? ''
      }`}
    >
      {items.map((entry) => {
        if (entry === 'hr') {
          return (
            <hr
              key={keyFor('hr')}
              role="presentation"
              className="border-0 border-t border-white/10 my-1 mx-1"
            />
          );
        }

        if (isNote(entry)) {
          return (
            <div
              key={keyFor(`note:${entry.title}`)}
              role="presentation"
              className="px-2.5 pt-2 pb-2 max-w-[290px] select-none"
            >
              <p className="text-[13.5px] font-extrabold leading-[1.35] text-white text-pretty">
                {entry.title}
              </p>
              {entry.text && (
                <p className="mt-1.5 text-[12.5px] font-semibold leading-[1.45] text-white/70 text-pretty">
                  {entry.text}
                </p>
              )}
            </div>
          );
        }

        if (isHeader(entry)) {
          return (
            <div
              key={keyFor(`header:${entry.label}`)}
              role="presentation"
              className="px-2.5 pt-2 pb-1 text-[10px] font-extrabold uppercase tracking-[.14em] text-white/40 select-none"
            >
              {entry.label}
            </div>
          );
        }

        const isDanger = entry.variant === 'danger';

        return (
          <button
            key={keyFor(`item:${entry.label}`)}
            type="button"
            role="menuitem"
            tabIndex={-1}
            aria-disabled={entry.disabled || undefined}
            onClick={() => handleItemClick(entry)}
            className={`flex items-center gap-2.5 w-full text-left text-[13px] font-bold px-2.5 py-2 rounded-lg transition-colors outline-none focus-visible:bg-white/[0.09] ${
              isDanger
                ? 'text-red-300 hover:bg-red-500/30 hover:text-white'
                : 'text-white/70 hover:bg-white/[0.09] hover:text-white'
            } ${
              entry.disabled
                ? 'opacity-45 cursor-not-allowed hover:bg-transparent hover:text-white/70'
                : ''
            }`}
          >
            {entry.icon && (
              <span
                className={`flex-none ${
                  isDanger ? 'text-red-300' : 'text-white/55'
                }`}
              >
                {entry.icon}
              </span>
            )}
            <span className="min-w-0 flex-1 flex flex-col gap-px">
              <span className="truncate">{entry.label}</span>
              {entry.description && (
                <span className="text-[11.5px] font-semibold text-white/55 whitespace-normal">
                  {entry.description}
                </span>
              )}
            </span>
            {entry.trailing !== undefined && entry.trailing !== null && (
              <span className="ml-auto pl-3 flex-none text-white/40">
                {entry.trailing}
              </span>
            )}
          </button>
        );
      })}
    </div>,
    document.body,
  );
};

export default AnchoredMenu;
