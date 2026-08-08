'use client';

import React, {
  useCallback,
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
} from 'react';
import { createPortal } from 'react-dom';

import { cn } from '@/helpers/utils';

/** Gap between the trigger and the panel. */
const ANCHOR_GAP = 6;
/** Keep the panel this far from the viewport edges. */
const EDGE_MARGIN = 12;

const HIDDEN_STYLE: React.CSSProperties = {
  position: 'fixed',
  top: 0,
  left: 0,
  zIndex: 10000,
  visibility: 'hidden',
};

type TriggerProps = {
  ref: React.Ref<HTMLButtonElement>;
  onClick: () => void;
  isOpen: boolean;
};

type VotingBarMenuProps = {
  /** Renders the trigger button; must spread `ref` and `onClick` onto it. */
  renderTrigger: (props: TriggerProps) => React.ReactNode;
  /** Panel body. Receives a `close` callback so rows can dismiss the menu. */
  children: React.ReactNode | ((close: () => void) => React.ReactNode);
  panelClassName?: string;
  /** `end` lines the panel's right edge up with the trigger's right edge. */
  align?: 'start' | 'end';
};

/**
 * The command-bar popover primitive: a trigger plus a portalled panel anchored
 * just below it, clamped inside the viewport, dismissed by an invisible
 * full-screen scrim or Escape.
 *
 * Portalled (not absolutely positioned inside the modal) so the panel is never
 * clipped by the modal's own scroll containers.
 */
export const VotingBarMenu: React.FC<VotingBarMenuProps> = ({
  renderTrigger,
  children,
  panelClassName,
  align = 'start',
}) => {
  const [isOpen, setIsOpen] = useState(false);
  // Fixed + off-screen from the very first paint: measuring the panel while it
  // is still a static block in the body would report the full body width and
  // send the clamp the wrong way.
  const [style, setStyle] = useState<React.CSSProperties>(HIDDEN_STYLE);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);

  const close = useCallback(() => setIsOpen(false), []);

  const updatePosition = useCallback(() => {
    const trigger = triggerRef.current;
    const panel = panelRef.current;

    if (!trigger || !panel) return;

    const rect = trigger.getBoundingClientRect();
    const { offsetWidth: width, offsetHeight: height } = panel;

    const maxLeft = window.innerWidth - width - EDGE_MARGIN;
    const rawLeft = align === 'end' ? rect.right - width : rect.left;
    const left = Math.max(EDGE_MARGIN, Math.min(rawLeft, maxLeft));

    // Flip above the trigger when there isn't room below it.
    const below = rect.bottom + ANCHOR_GAP;
    const fitsBelow = below + height <= window.innerHeight - EDGE_MARGIN;
    const top = fitsBelow
      ? below
      : Math.max(EDGE_MARGIN, rect.top - ANCHOR_GAP - height);

    setStyle({ position: 'fixed', top, left, zIndex: 10000 });
  }, [align]);

  useLayoutEffect(() => {
    if (!isOpen) {
      setStyle(HIDDEN_STYLE);

      return;
    }

    updatePosition();
  }, [isOpen, updatePosition]);

  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') close();
    };

    document.addEventListener('keydown', handleKeyDown);
    window.addEventListener('scroll', updatePosition, true);
    window.addEventListener('resize', updatePosition);

    return () => {
      document.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('scroll', updatePosition, true);
      window.removeEventListener('resize', updatePosition);
    };
  }, [isOpen, close, updatePosition]);

  return (
    <>
      {renderTrigger({
        ref: triggerRef,
        onClick: () => setIsOpen((v) => !v),
        isOpen,
      })}

      {isOpen &&
        createPortal(
          <>
            <div className="fixed inset-0 z-[9999]" onClick={close} />
            <div
              ref={panelRef}
              style={style}
              className={cn(
                'vp-pop-in min-w-[236px] rounded-xl border border-white/[0.16] p-1.5',
                // Opaque stops only: the panel floats over the matrix, so any
                // alpha here would let the numbers underneath bleed through.
                'bg-gradient-to-b from-primary-900 to-primary-950',
                'shadow-[0_18px_44px_rgba(0,0,0,0.6)]',
                panelClassName,
              )}
            >
              {typeof children === 'function' ? children(close) : children}
            </div>
          </>,
          document.body,
        )}
    </>
  );
};

export const VotingMenuLabel: React.FC<{
  children: React.ReactNode;
  hint?: React.ReactNode;
}> = ({ children, hint }) => (
  <div className="flex items-center justify-between gap-2.5 px-[11px] pb-[5px] pt-2 text-[10px] font-extrabold uppercase tracking-[0.14em] text-white/40">
    <span>{children}</span>
    {hint}
  </div>
);

export const VotingMenuSeparator: React.FC = () => (
  <hr className="mx-1 my-1.5 border-0 border-t border-white/10" />
);

type VotingMenuRowProps = {
  icon?: React.ReactNode;
  children: React.ReactNode;
  /** Trailing muted hint, e.g. ".xlsx" or "voter × entry". */
  sub?: React.ReactNode;
  onClick?: () => void;
  disabled?: boolean;
  variant?: 'default' | 'danger';
};

export const VotingMenuRow: React.FC<VotingMenuRowProps> = ({
  icon,
  children,
  sub,
  onClick,
  disabled,
  variant = 'default',
}) => (
  <button
    type="button"
    disabled={disabled}
    onClick={onClick}
    className={cn(
      'group flex w-full items-center gap-[11px] rounded-lg px-[11px] py-[9px] text-left text-[13px] font-semibold transition-colors',
      variant === 'danger'
        ? 'text-red-400 hover:bg-red-500/10'
        : 'text-white/75 hover:bg-white/[0.07] hover:text-white',
      disabled && 'pointer-events-none opacity-40',
    )}
  >
    {icon && (
      <span
        className={cn(
          'flex-none transition-colors',
          variant === 'danger'
            ? 'text-red-400'
            : 'text-white/40 group-hover:text-white/70',
        )}
      >
        {icon}
      </span>
    )}
    <span className="min-w-0 truncate">{children}</span>
    {sub && (
      <span className="ml-auto flex-none text-[11px] font-bold tracking-[0.02em] text-white/40">
        {sub}
      </span>
    )}
  </button>
);

export default VotingBarMenu;
