'use client';

import { MoreHorizontal } from 'lucide-react';
import React, { useCallback, useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';

export interface OverflowMenuItem {
  icon?: React.ReactNode;
  label: string;
  onClick?: () => void;
  variant?: 'default' | 'danger';
}

export interface OverflowMenuStat {
  id: string;
  icon?: React.ReactNode;
  value: string | number;
}

export interface OverflowMenuStatsRow {
  variant: 'stats';
  stats: OverflowMenuStat[];
}

export type OverflowMenuEntry = OverflowMenuItem | OverflowMenuStatsRow | 'hr';

interface OverflowMenuProps {
  items: OverflowMenuEntry[];
  className?: string;
}

const MENU_GAP = 8;

const isStatsRow = (item: OverflowMenuEntry): item is OverflowMenuStatsRow =>
  typeof item === 'object' && item.variant === 'stats';

const OverflowMenu: React.FC<OverflowMenuProps> = ({ items, className }) => {
  const [open, setOpen] = useState(false);
  const [menuStyle, setMenuStyle] = useState<React.CSSProperties>({
    visibility: 'hidden',
  });
  const triggerRef = useRef<HTMLButtonElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);

  const updatePosition = useCallback(() => {
    if (!triggerRef.current) return;

    const rect = triggerRef.current.getBoundingClientRect();

    setMenuStyle({
      position: 'fixed',
      bottom: window.innerHeight - rect.top + MENU_GAP,
      right: window.innerWidth - rect.right,
      zIndex: 10000,
      visibility: 'visible',
    });
  }, []);

  useEffect(() => {
    if (!open) return;

    updatePosition();

    const handlePointerDown = (e: PointerEvent) => {
      const target = e.target as Node;
      const clickedInsideTrigger = !!(
        triggerRef.current && triggerRef.current.contains(target)
      );
      const clickedInsideMenu = !!(
        menuRef.current && menuRef.current.contains(target)
      );

      if (!clickedInsideTrigger && !clickedInsideMenu) {
        setOpen(false);
      }
    };
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setOpen(false);
    };

    document.addEventListener('pointerdown', handlePointerDown, true);
    document.addEventListener('keydown', handleKeyDown);
    window.addEventListener('scroll', updatePosition, true);
    window.addEventListener('resize', updatePosition);

    return () => {
      document.removeEventListener('pointerdown', handlePointerDown, true);
      document.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('scroll', updatePosition, true);
      window.removeEventListener('resize', updatePosition);
    };
  }, [open, updatePosition]);

  return (
    <div className={`relative ${className ?? ''}`}>
      <button
        ref={triggerRef}
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="w-11 h-11 rounded-xl bg-white/[0.06] border border-white/10 flex items-center justify-center text-white/70 hover:text-white hover:bg-white/[0.12] transition-colors"
        aria-label="More options"
        aria-expanded={open}
      >
        <MoreHorizontal className="size-5" />
      </button>

      {open &&
        createPortal(
          <div
            ref={menuRef}
            style={menuStyle}
            className="bg-black bg-gradient-to-t from-primary-900/60 to-primary-800/50 border border-white/[0.16] rounded-xl p-1.5 min-w-[188px] shadow-2xl"
            onMouseDown={(e) => e.stopPropagation()}
          >
            {items.map((item, index) => {
              const hrIndex = items
                .slice(0, index)
                .filter((entry) => entry === 'hr').length;

              if (item === 'hr') {
                return (
                  <hr
                    key={`separator-${hrIndex}`}
                    className="border-0 border-t border-white/10 my-1 mx-1"
                  />
                );
              }

              if (isStatsRow(item)) {
                return (
                  <div
                    key="engagement-stats"
                    className="flex items-center gap-4 px-3 py-2.5 text-[13.5px] font-semibold text-white/55 cursor-default select-none"
                  >
                    {item.stats.map((stat) => (
                      <span
                        key={stat.id}
                        className="inline-flex items-center gap-1.5"
                      >
                        {stat.icon && (
                          <span className="flex-none text-white/55">
                            {stat.icon}
                          </span>
                        )}
                        <span className="tabular-nums">{stat.value}</span>
                      </span>
                    ))}
                  </div>
                );
              }

              return (
                <button
                  key={item.label}
                  type="button"
                  onClick={() => {
                    item.onClick?.();
                    setOpen(false);
                  }}
                  className={`flex items-center gap-[11px] w-full text-left text-[13.5px] font-semibold px-3 py-2.5 rounded-lg transition-colors hover:bg-white/[0.07] ${
                    item.variant === 'danger' ? 'text-red-400' : 'text-white'
                  }`}
                >
                  {item.icon && (
                    <span
                      className={`flex-none ${
                        item.variant === 'danger'
                          ? 'text-red-400'
                          : 'text-white/55'
                      }`}
                    >
                      {item.icon}
                    </span>
                  )}
                  {item.label}
                </button>
              );
            })}
          </div>,
          document.body,
        )}
    </div>
  );
};

export default OverflowMenu;
