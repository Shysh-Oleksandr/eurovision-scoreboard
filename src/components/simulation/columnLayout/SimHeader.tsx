'use client';
import {
  Expand,
  LogOut,
  Maximize2,
  MoreHorizontal,
  RotateCcw,
  Share2,
  Shrink,
  Undo2,
} from 'lucide-react';
import { useTranslations } from 'next-intl';
import React, { useEffect, useLayoutEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';

import Image from 'next/image';

import { useFullscreenToggle } from '../hooks/useFullscreenToggle';
import { useSimulationActions } from '../hooks/useSimulationActions';

import { useSimViewStore } from './simViewStore';
import { DRAG_THRESHOLD, useSheetDrag } from './useSheetDrag';

import { SlidersIcon } from '@/assets/icons/SlidersIcon';
import AnchoredMenu, {
  AnchoredMenuEntry,
} from '@/components/common/AnchoredMenu';
import Button from '@/components/common/Button';
import { getFlagPath } from '@/helpers/getFlagPath';
import { useBackHandler } from '@/hooks/useBackHandler';
import type { ShortcutId } from '@/shortcuts/actions';
import { ShortcutHintText, useShortcutHintFormatter } from '@/shortcuts/hints';
import { useGeneralStore } from '@/state/generalStore';
import { useScoreboardStore } from '@/state/scoreboardStore';
import { getHostingCountryLogo } from '@/theme/hosting';

interface SimHeaderProps {
  isDesktop: boolean;
  /** Minimal view: title only, no buttons (clean for recording). */
  chromeHidden: boolean;
  onShare: () => void;
}

export const HostingLogo = ({ size }: { size: number }) => {
  const t = useTranslations('simulation.header');
  const showHostingCountryLogo = useGeneralStore(
    (state) => state.settings.showHostingCountryLogo,
  );
  const getHostingCountry = useGeneralStore((state) => state.getHostingCountry);
  const shouldUse2026WhiteHeartFlags = useGeneralStore(
    (state) => state.settings.shouldUse2026WhiteHeartFlags,
  );

  // `getHostingCountry` reads other stores; subscribing keeps the logo fresh.
  useGeneralStore((state) => state.settings.hostingCountryCode);

  if (!showHostingCountryLogo) return null;

  const { logo, isExisting } = getHostingCountryLogo(
    getHostingCountry(),
    true,
    shouldUse2026WhiteHeartFlags,
  );

  return (
    <Image
      src={logo}
      alt={t('hostingCountryLogo')}
      width={size}
      height={size}
      unoptimized
      className={`flex-none ${
        isExisting ? 'object-contain' : 'rounded-sm object-cover'
      }`}
      style={{ width: size, height: isExisting ? size : size * 0.75 }}
      onError={(e) => {
        e.currentTarget.src = getFlagPath('ww');
      }}
    />
  );
};

/** How long the ⋯ sheet takes to slide away (`dp-sim-menu-out`). */
const MENU_EXIT_MS = 200;

/** How far the ⋯ sheet is pulled down, and whether the finger is still on it. */
interface Pull {
  y: number;
  /** `y` as a share of the sheet's height: the scrim fades by it. */
  share: number;
  live: boolean;
}

const AT_REST: Pull = { y: 0, share: 0, live: false };

/**
 * Phones: ⋯ opens the actions as a bottom sheet that slides up over a
 * fading scrim, and slides back down when closed (it stays mounted for
 * MENU_EXIT_MS so it can). A pull down anywhere on it follows the finger and
 * closes it past 28px (`useSheetDrag`); a shorter one springs back.
 */
const QuickActionsSheet = ({
  open,
  onClose,
  items,
}: {
  open: boolean;
  onClose: () => void;
  items: AnchoredMenuEntry[];
}) => {
  const t = useTranslations('simulation.view');
  const dialogRef = useRef<HTMLDivElement>(null);
  const [mounted, setMounted] = useState(open);
  const [pull, setPull] = useState<Pull>(AT_REST);

  useBackHandler(open, onClose);

  // Opening again starts at rest, whatever a closing pull left.
  useLayoutEffect(() => {
    if (open) setPull(AT_REST);
  }, [open]);

  useSheetDrag(dialogRef, {
    enabled: open,
    onDrag: (dy) => {
      const y = Math.max(dy, 0);
      const height = dialogRef.current?.offsetHeight || 1;

      setPull({ y, share: Math.min(y / height, 1), live: true });
    },
    onRelease: (dy) => {
      if (dy > DRAG_THRESHOLD) {
        // It slides away (`dp-sim-sheet-out`) from where the finger left it.
        setPull((current) => ({ ...current, live: false }));
        onClose();
      } else {
        setPull(AT_REST);
      }
    },
    onCancel: () => setPull(AT_REST),
  });

  useEffect(() => {
    if (open) {
      setMounted(true);

      return undefined;
    }

    const id = window.setTimeout(() => setMounted(false), MENU_EXIT_MS);

    return () => window.clearTimeout(id);
  }, [open]);

  useEffect(() => {
    if (!open) return undefined;

    // Focus the sheet itself, not an action: a stray Enter must not restart.
    dialogRef.current?.focus();

    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };

    document.addEventListener('keydown', onKeyDown);

    return () => document.removeEventListener('keydown', onKeyDown);
  }, [open, onClose]);

  if (!(open || mounted) || typeof document === 'undefined') return null;

  return createPortal(
    <div
      className="dp-sim-menu fixed inset-0 z-[9000]"
      data-closing={open ? undefined : ''}
    >
      <button
        type="button"
        aria-label={t('showFewerControls')}
        tabIndex={-1}
        className="dp-sim-scrim absolute inset-0"
        style={pull.y ? { opacity: 1 - pull.share } : undefined}
        onClick={onClose}
      />
      <div
        ref={dialogRef}
        tabIndex={-1}
        role="dialog"
        aria-modal="true"
        aria-label={t('moreActions')}
        className={`dp-sim-sheet dp-sim-menu-sheet absolute inset-x-0 bottom-0 touch-none rounded-t-[22px] outline-none px-2.5 pb-[calc(var(--safe-bottom-bar)+10px)] pt-2 text-white ${
          pull.live ? 'select-none' : ''
        }`}
        style={
          pull.y
            ? {
                transform: `translateY(${pull.y}px)`,
                // Follows the finger; `.dp-sim-sheet` springs it back.
                transition: pull.live ? 'none' : undefined,
              }
            : undefined
        }
      >
        <div className="dp-sim-grab mx-auto mb-2 h-[5px] w-10 rounded-full" />
        {items.map((item) => {
          if (item === 'hr') {
            return <div key="hr" className="mx-2 my-1.5 h-px bg-hair" />;
          }

          if (
            !('label' in item) ||
            ('variant' in item && item.variant === 'header')
          ) {
            return null;
          }

          return (
            <button
              key={item.label}
              type="button"
              disabled={item.disabled}
              onClick={() => {
                onClose();
                item.onClick?.();
              }}
              className={`flex h-[52px] w-full items-center gap-3 rounded-xl px-3 text-left text-[15px] font-bold transition-colors hover:bg-white/[0.07] focus-visible:bg-white/[0.07] focus-visible:outline-none disabled:opacity-40 ${
                item.variant === 'danger' ? 'text-[var(--badge-red-ink)]' : ''
              }`}
            >
              <span className="grid size-5 place-items-center text-current opacity-80">
                {item.icon}
              </span>
              {item.label}
              {item.trailing && (
                <span className="ml-auto text-[13px] text-white/40">
                  {item.trailing}
                </span>
              )}
            </button>
          );
        })}
      </div>
    </div>,
    document.body,
  );
};

/** Hosting logo, stage name and contest. */
export const SimHeaderTitle = React.memo(
  ({
    isDesktop,
    centered = false,
  }: {
    isDesktop: boolean;
    /** The minimal view on desktop: the title over the centred board. */
    centered?: boolean;
  }) => {
    const stageName = useScoreboardStore(
      (state) => state.getCurrentStage()?.name ?? '',
    );
    const contestYear = useGeneralStore((state) => state.settings.contestYear);
    const contestName = useGeneralStore((state) => state.settings.contestName);
    const contestLabel = `${contestName || 'Eurovision'} ${
      contestYear || ''
    }`.trim();

    return (
      <div
        className={`flex min-w-0 items-center gap-2.5 ${
          centered ? 'mx-auto' : 'flex-1'
        } ${isDesktop ? 'min-h-[46px]' : 'min-h-[44px]'}`}
      >
        <HostingLogo size={isDesktop ? 40 : 32} />
        <h2
          className={`min-w-0 text-white [text-wrap:balance] ${
            centered ? '' : 'flex-1'
          }`}
        >
          <span
            className={`font-extrabold tracking-[-0.022em] ${
              isDesktop
                ? 'text-[24px] leading-tight'
                : 'text-[17px] leading-tight'
            }`}
          >
            {stageName}
          </span>{' '}
          <span
            className={`font-semibold text-white/70 ${
              isDesktop ? 'ml-1 text-[15px]' : 'block text-[12.5px]'
            }`}
          >
            {contestLabel}
          </span>
        </h2>
      </div>
    );
  },
);

SimHeaderTitle.displayName = 'SimHeaderTitle';

interface SimHeaderActionsProps {
  isDesktop: boolean;
  onShare: () => void;
}

/**
 * Minimal view, Setup (labelled: the one action used all the time) and ⋯
 * for undo, restart, share, fullscreen and cancel. Phones keep Setup and ⋯
 * as icons; ⋯ opens a quick-action sheet.
 */
export const SimHeaderActions = React.memo(
  ({ isDesktop, onShare }: SimHeaderActionsProps) => {
    const t = useTranslations('simulation');
    const tSettings = useTranslations('settings.ui');
    const { canUndo, undo, restart, cancel, openSetup } =
      useSimulationActions();
    const setMinimalView = useSimViewStore((state) => state.setMinimalView);
    const fullscreen = useFullscreenToggle();
    // The keys show at the end of the menu rows (website, mouse only).
    const hintFor = useShortcutHintFormatter();
    const hint = (id: ShortcutId) => {
      const text = hintFor(id);

      return text ? <ShortcutHintText hint={text} /> : undefined;
    };

    const moreRef = useRef<HTMLDivElement>(null);
    const [menuOpen, setMenuOpen] = useState(false);

    const iconClass = 'size-[18px]';
    const items: AnchoredMenuEntry[] = [
      {
        label: t('header.undo'),
        icon: <Undo2 className={iconClass} />,
        onClick: undo,
        disabled: !canUndo,
        trailing: hint('undo'),
      },
      {
        label: t('header.restart'),
        icon: <RotateCcw className={iconClass} />,
        onClick: restart,
        trailing: hint('restart'),
      },
      {
        label: t('header.share'),
        icon: <Share2 className={iconClass} />,
        onClick: onShare,
        trailing: hint('share'),
      },
      ...(isDesktop
        ? []
        : [
            {
              label: t('view.minimalView'),
              icon: <Maximize2 className={iconClass} />,
              onClick: () => setMinimalView(true),
              trailing: hint('minimalView'),
            },
          ]),
      ...(fullscreen.supported
        ? [
            {
              label: fullscreen.enabled
                ? t('view.exitFullscreen')
                : tSettings('enableFullscreenMode'),
              icon: fullscreen.enabled ? (
                <Shrink className={iconClass} />
              ) : (
                <Expand className={iconClass} />
              ),
              onClick: fullscreen.toggle,
              trailing: hint('fullscreen'),
            },
          ]
        : []),
      'hr',
      {
        label: t('header.cancelSimulation'),
        icon: <LogOut className={iconClass} />,
        onClick: cancel,
        variant: 'danger',
        trailing: hint('cancel'),
      },
    ];

    return (
      <div className="flex flex-none items-center gap-2">
        {isDesktop && (
          <Button
            variant="surface"
            size="lg"
            title={t('view.minimalView')}
            aria-label={t('view.minimalView')}
            Icon={<Maximize2 className="size-5" />}
            onClick={() => setMinimalView(true)}
            shortcut="minimalView"
          />
        )}
        <Button
          variant="surfaceStrong"
          size="lg"
          title={isDesktop ? undefined : t('header.setup')}
          aria-label={t('header.setup')}
          className={isDesktop ? '!px-[18px] !text-[14.5px]' : '!w-[60px]'}
          Icon={<SlidersIcon className="size-6" />}
          onClick={openSetup}
          shortcut="setup"
        >
          {isDesktop ? t('header.setup') : undefined}
        </Button>
        <div ref={moreRef} className="contents">
          <Button
            variant="surface"
            size="lg"
            title={t('view.moreActions')}
            aria-label={t('view.moreActions')}
            aria-expanded={menuOpen}
            aria-haspopup="menu"
            className={menuOpen ? 'is-on' : ''}
            Icon={<MoreHorizontal className="size-6" />}
            onClick={() => setMenuOpen((open) => !open)}
          />
        </div>

        {isDesktop ? (
          <AnchoredMenu
            open={menuOpen}
            anchor={(moreRef.current?.firstElementChild as HTMLElement) ?? null}
            onClose={() => setMenuOpen(false)}
            items={items}
            placement="bottom-end"
            minWidth={220}
            ariaLabel={t('view.moreActions')}
          />
        ) : (
          <QuickActionsSheet
            open={menuOpen}
            onClose={() => setMenuOpen(false)}
            items={items}
          />
        )}
      </div>
    );
  },
);

SimHeaderActions.displayName = 'SimHeaderActions';

/**
 * Phones: the title and the actions in one row. (Desktop places the two
 * parts itself, so the actions can stay on screen while a long board
 * scrolls.)
 */
const SimHeader = ({ isDesktop, chromeHidden, onShare }: SimHeaderProps) => (
  <header className="flex items-center gap-2.5">
    <SimHeaderTitle isDesktop={isDesktop} centered={chromeHidden} />
    {!chromeHidden && (
      <SimHeaderActions isDesktop={isDesktop} onShare={onShare} />
    )}
  </header>
);

export default React.memo(SimHeader);
