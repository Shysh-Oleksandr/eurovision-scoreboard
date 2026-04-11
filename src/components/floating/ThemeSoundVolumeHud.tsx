'use client';

import {
  AudioLines,
  Music,
  Volume,
  Volume1,
  Volume2,
  VolumeOff,
} from 'lucide-react';
import { useTranslations } from 'next-intl';
import React, {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';

import { RangeSlider } from '@/components/common/RangeSlider';
import { cn } from '@/helpers/utils';
import { useMediaQuery } from '@/hooks/useMediaQuery';
import { useGeneralStore } from '@/state/generalStore';
import {
  customThemeHasAnyAudio,
  customThemeHasSimulationBackground,
} from '@/theme/customThemeHasAudio';

const HUD_SLIDER_CLASS =
  'min-w-0 flex-1 [&_.range-wrapper]:mt-0 [&_input]:touch-none';

/**
 * Fixed bottom-right volume control for custom theme sounds.
 * Hover-capable devices: panel stays open while the pointer is over the control (with a short leave delay);
 * the round icon click mutes or restores both effects and ambience volumes.
 * Touch-first devices: the icon toggles the panel; the same mute/restore action is available inside the panel.
 */
export default function ThemeSoundVolumeHud() {
  const t = useTranslations('settings.ui');
  const customTheme = useGeneralStore((s) => s.customTheme);
  const themeSoundVolume = useGeneralStore((s) => s.settings.themeSoundVolume);
  const themeAmbienceVolume = useGeneralStore(
    (s) => s.settings.themeAmbienceVolume,
  );
  const hideThemeSoundVolumeHud = useGeneralStore(
    (s) => s.settings.hideThemeSoundVolumeHud,
  );
  const disableAllThemeAudio = useGeneralStore(
    (s) => s.settings.disableAllThemeAudio,
  );
  const setSettings = useGeneralStore((s) => s.setSettings);

  const preSfxRef = useRef(100);
  const preAmbRef = useRef(100);
  const rootRef = useRef<HTMLDivElement>(null);
  const closeTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const canHoverMenu = useMediaQuery('(hover: hover)');
  const [hoverInside, setHoverInside] = useState(false);
  const [touchOpen, setTouchOpen] = useState(false);

  const clearCloseTimer = useCallback(() => {
    if (closeTimerRef.current !== null) {
      clearTimeout(closeTimerRef.current);
      closeTimerRef.current = null;
    }
  }, []);

  const scheduleCloseHover = useCallback(() => {
    clearCloseTimer();
    closeTimerRef.current = setTimeout(() => {
      setHoverInside(false);
      closeTimerRef.current = null;
    }, 320);
  }, [clearCloseTimer]);

  const handleWrapperEnter = useCallback(() => {
    if (!canHoverMenu) return;
    clearCloseTimer();
    setHoverInside(true);
  }, [canHoverMenu, clearCloseTimer]);

  const handleWrapperLeave = useCallback(() => {
    if (!canHoverMenu) return;
    scheduleCloseHover();
  }, [canHoverMenu, scheduleCloseHover]);

  useEffect(() => {
    return () => {
      clearCloseTimer();
    };
  }, [clearCloseTimer]);

  useEffect(() => {
    if (!canHoverMenu) {
      setHoverInside(false);
    }
  }, [canHoverMenu]);

  useEffect(() => {
    if (canHoverMenu || !touchOpen) return;
    const onDocPointerDown = (e: PointerEvent) => {
      const root = rootRef.current;

      if (!root || root.contains(e.target as Node)) return;
      setTouchOpen(false);
    };

    document.addEventListener('pointerdown', onDocPointerDown, true);

    return () =>
      document.removeEventListener('pointerdown', onDocPointerDown, true);
  }, [canHoverMenu, touchOpen]);

  const setVolume = useCallback(
    (value: number) => setSettings({ themeSoundVolume: value }),
    [setSettings],
  );

  const setAmbienceVolume = useCallback(
    (value: number) => setSettings({ themeAmbienceVolume: value }),
    [setSettings],
  );

  const toggleMuteBoth = useCallback(() => {
    const { themeSoundVolume: s, themeAmbienceVolume: a } =
      useGeneralStore.getState().settings;

    if (s > 0 || a > 0) {
      preSfxRef.current = s;
      preAmbRef.current = a;
      setSettings({ themeSoundVolume: 0, themeAmbienceVolume: 0 });

      return;
    }

    setSettings({
      themeSoundVolume: preSfxRef.current,
      themeAmbienceVolume: preAmbRef.current,
    });
  }, [setSettings]);

  const handleIconClick = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (canHoverMenu) {
      toggleMuteBoth();

      return;
    }
    setTouchOpen((o) => !o);
  };

  const panelVisible = canHoverMenu ? hoverInside : touchOpen;

  const hasSimBg = customThemeHasSimulationBackground(customTheme);

  const bothVolumesZero = hasSimBg
    ? themeSoundVolume <= 0 && themeAmbienceVolume <= 0
    : themeSoundVolume <= 0;
  const levelForIcon = hasSimBg
    ? Math.max(themeSoundVolume, themeAmbienceVolume)
    : themeSoundVolume;

  const VolumeIcon = useMemo(() => {
    if (disableAllThemeAudio || bothVolumesZero) {
      return VolumeOff;
    }
    if (levelForIcon <= 25) {
      return Volume;
    }
    if (levelForIcon >= 75) {
      return Volume2;
    }

    return Volume1;
  }, [bothVolumesZero, disableAllThemeAudio, levelForIcon]);

  if (hideThemeSoundVolumeHud || !customThemeHasAnyAudio(customTheme)) {
    return null;
  }

  return (
    <div ref={rootRef} className="fixed bottom-5 right-5 z-[2000]">
      {/*
        Hover/leave only on this 44×44px hit box + absolutely positioned descendants (panel).
        Wide panel is out of flow so it does not extend the hover strip left of the icon.
      */}
      <div
        className="relative h-11 w-11"
        onMouseEnter={handleWrapperEnter}
        onMouseLeave={handleWrapperLeave}
      >
        <div
          className={cn(
            'absolute bottom-full right-0 w-[min(calc(100vw-2.5rem),14rem)] origin-top-right pb-1.5 transition-opacity duration-200',
            panelVisible
              ? 'pointer-events-auto opacity-100'
              : 'pointer-events-none opacity-0',
          )}
          aria-hidden={!panelVisible}
        >
          <div className="rounded-lg bg-black/40 px-2.5 py-2 shadow-lg backdrop-blur-sm">
            <div className="flex flex-col gap-2.5">
              <div className="flex items-center gap-2">
                <AudioLines
                  className="h-4 w-4 shrink-0 text-white/90"
                  strokeWidth={2}
                  aria-hidden
                />
                <RangeSlider
                  id="theme-sound-volume-hud-sfx"
                  value={themeSoundVolume}
                  onChange={setVolume}
                  min={0}
                  max={100}
                  step={1}
                  displayValue={false}
                  delay={0}
                  containerClassName={HUD_SLIDER_CLASS}
                />
              </div>
              {hasSimBg && (
                <div className="flex items-center gap-2">
                  <Music
                    className="h-4 w-4 shrink-0 text-white/90"
                    strokeWidth={2}
                    aria-hidden
                  />
                  <RangeSlider
                    id="theme-sound-volume-hud-ambience"
                    value={themeAmbienceVolume}
                    onChange={setAmbienceVolume}
                    min={0}
                    max={100}
                    step={1}
                    displayValue={false}
                    delay={0}
                    containerClassName={HUD_SLIDER_CLASS}
                  />
                </div>
              )}
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  toggleMuteBoth();
                }}
                className="flex w-full items-center justify-center gap-1.5 rounded-md bg-white/10 py-1.5 text-xs font-medium text-white/90 transition-colors hover:bg-white/15"
              >
                {bothVolumesZero ? (
                  <>
                    <Volume2 className="h-3.5 w-3.5" strokeWidth={2} />
                    {t('themeSoundHudRestoreShort')}
                  </>
                ) : (
                  <>
                    <VolumeOff className="h-3.5 w-3.5" strokeWidth={2} />
                    {t('themeSoundHudMuteAllShort')}
                  </>
                )}
              </button>
            </div>
          </div>
        </div>

        <button
          type="button"
          onClick={handleIconClick}
          aria-label={
            canHoverMenu
              ? t('themeSoundHudMuteToggle')
              : touchOpen
              ? t('themeSoundHudCloseControls')
              : t('themeSoundHudOpenControls')
          }
          aria-expanded={!canHoverMenu ? touchOpen : undefined}
          className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-black/40 text-white shadow-md backdrop-blur-sm transition-colors hover:bg-black/55 focus:outline-none focus-visible:ring-2 focus-visible:ring-white/70"
        >
          <VolumeIcon className="h-6 w-6" strokeWidth={2} aria-hidden />
        </button>
      </div>
    </div>
  );
}
