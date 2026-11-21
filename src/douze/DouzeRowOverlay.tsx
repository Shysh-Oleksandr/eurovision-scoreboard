'use client';
import React, { useEffect, useRef } from 'react';

import DouzeSpecPlayer from './DouzeSpecPlayer';
import type { DouzeOptions } from './options';
import { getDouzeSpec } from './registry';

import { useIsLowPerfDevice } from '@/hooks/useIsLowPerfDevice';
import { playHaptic } from '@/native/haptics';
import { useGeneralStore } from '@/state/generalStore';
import { useScoreboardStore } from '@/state/scoreboardStore';
import { playThemeSound } from '@/theme/playThemeSound';
import type { DouzePointsAnimationMode } from '@/theme/types';

type Props = {
  mode: DouzePointsAnimationMode;
  /** A custom theme's changes to the animation ("Customize animation"). */
  options?: DouzeOptions | null;
  /** The points just received (a 12 only counts if the points system says so). */
  pointsAmount: number;
  /** A custom entry's chosen colours, used in place of its flag's. */
  entryColors?: readonly string[] | null;
  isThemePreview?: boolean;
};

/**
 * A spec-driven douze animation (douze/registry.ts) on a country row. Goes
 * in CountryItemBase's `renderOverlay` slot, next to the row's container,
 * which clips. Plays once per mount; the row's douze hook mounts it.
 */
const DouzeRowOverlay: React.FC<Props> = ({
  mode,
  options,
  pointsAmount,
  entryColors,
  isThemePreview = false,
}) => {
  const spec = getDouzeSpec(mode, options);
  const isLowPerfDevice = useIsLowPerfDevice();
  const globalPointsSystem = useGeneralStore((state) => state.pointsSystem);
  const stageJuryOverride = useScoreboardStore((state) =>
    isThemePreview
      ? undefined
      : state.getCurrentStage()?.overrides?.pointsSystem?.pointsSystem,
  );
  const pointsSystem = stageJuryOverride ?? globalPointsSystem;
  const isDouzePoints =
    isThemePreview ||
    pointsSystem.some(
      (point) => point.showDouzePoints && point.value === pointsAmount,
    );
  const playedRef = useRef(false);

  useEffect(() => {
    if (!spec || !isDouzePoints || playedRef.current) return;

    playedRef.current = true;
    playThemeSound('douzePoints', { skip: isThemePreview });
    if (!isThemePreview) playHaptic({ id: 'douzeBloom', variant: 'sweep' });
  }, [spec, isDouzePoints, isThemePreview]);

  if (!spec || !isDouzePoints) return null;

  return (
    <DouzeSpecPlayer
      spec={spec}
      lite={isLowPerfDevice}
      entryColors={entryColors}
    />
  );
};

export default DouzeRowOverlay;
