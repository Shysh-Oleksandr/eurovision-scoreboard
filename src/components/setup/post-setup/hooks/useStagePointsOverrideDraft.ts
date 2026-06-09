import { useCallback, useEffect, useState } from 'react';

import { PointsSystemController } from '@/components/settings/pointsSystem/useGlobalPointsSystemController';
import { EventStage, PointsItem, StagePointsSystemOverride } from '@/models';
import { useGeneralStore } from '@/state/generalStore';

const pointsArraysEqual = (a: PointsItem[], b: PointsItem[]): boolean => {
  if (a.length !== b.length) return false;

  return a.every(
    (item, i) =>
      item.value === b[i].value &&
      item.showDouzePoints === b[i].showDouzePoints,
  );
};

const overrideDiffersFromGlobal = (
  localPoints: PointsItem[],
  localTelevotePoints: PointsItem[],
  localSplit: boolean,
  localAllowMultiple: boolean,
  globalPoints: PointsItem[],
  globalTelevotePoints: PointsItem[],
  globalSplit: boolean,
  globalAllowMultiple: boolean,
): boolean => {
  if (!pointsArraysEqual(localPoints, globalPoints)) return true;
  if (localSplit !== globalSplit) return true;
  if (localAllowMultiple !== globalAllowMultiple) return true;
  if (localSplit || globalSplit) {
    if (!pointsArraysEqual(localTelevotePoints, globalTelevotePoints))
      return true;
  }

  return false;
};

interface UseStagePointsOverrideDraftResult {
  controller: PointsSystemController;
  isOverridden: boolean;
  resetToGlobal: () => void;
  getOverride: () => StagePointsSystemOverride | undefined;
}

export const useStagePointsOverrideDraft = (
  stage: EventStage,
  isOpen: boolean,
): UseStagePointsOverrideDraftResult => {
  const globalSettingsPointsSystem = useGeneralStore(
    (state) => state.settingsPointsSystem,
  );
  const globalSettingsTelevotePointsSystem = useGeneralStore(
    (state) => state.settingsTelevotePointsSystem,
  );
  const globalSplitPointsSystem = useGeneralStore(
    (state) => state.settings.splitPointsSystem,
  );
  const globalAllowMultiple = useGeneralStore(
    (state) => state.settings.allowMultiplePointsToSameEntry,
  );

  const getGlobalDefaults = useCallback(() => {
    const existing = stage.overrides?.pointsSystem;

    if (existing) {
      return {
        points: existing.pointsSystem,
        televotePoints: existing.televotePointsSystem,
        split: existing.splitPointsSystem,
        allowMultiple: existing.allowMultiplePointsToSameEntry,
      };
    }
    return {
      points: globalSettingsPointsSystem,
      televotePoints: globalSettingsTelevotePointsSystem,
      split: globalSplitPointsSystem,
      allowMultiple: globalAllowMultiple,
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen]);

  const [localPoints, setLocalPoints] = useState<PointsItem[]>(
    () => getGlobalDefaults().points,
  );
  const [localTelevotePoints, setLocalTelevotePoints] = useState<PointsItem[]>(
    () => getGlobalDefaults().televotePoints,
  );
  const [localSplit, setLocalSplit] = useState<boolean>(
    () => getGlobalDefaults().split,
  );
  const [localAllowMultiple, setLocalAllowMultiple] = useState<boolean>(
    () => getGlobalDefaults().allowMultiple,
  );

  useEffect(() => {
    if (!isOpen) return;
    const defaults = getGlobalDefaults();
    setLocalPoints(defaults.points);
    setLocalTelevotePoints(defaults.televotePoints);
    setLocalSplit(defaults.split);
    setLocalAllowMultiple(defaults.allowMultiple);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen]);

  const resetToGlobal = useCallback(() => {
    setLocalPoints(globalSettingsPointsSystem);
    setLocalTelevotePoints(globalSettingsTelevotePointsSystem);
    setLocalSplit(globalSplitPointsSystem);
    setLocalAllowMultiple(globalAllowMultiple);
  }, [
    globalSettingsPointsSystem,
    globalSettingsTelevotePointsSystem,
    globalSplitPointsSystem,
    globalAllowMultiple,
  ]);

  const isOverridden = overrideDiffersFromGlobal(
    localPoints,
    localTelevotePoints,
    localSplit,
    localAllowMultiple,
    globalSettingsPointsSystem,
    globalSettingsTelevotePointsSystem,
    globalSplitPointsSystem,
    globalAllowMultiple,
  );

  const getOverride = useCallback((): StagePointsSystemOverride | undefined => {
    const differs = overrideDiffersFromGlobal(
      localPoints,
      localTelevotePoints,
      localSplit,
      localAllowMultiple,
      globalSettingsPointsSystem,
      globalSettingsTelevotePointsSystem,
      globalSplitPointsSystem,
      globalAllowMultiple,
    );
    if (!differs) return undefined;
    return {
      pointsSystem: localPoints,
      televotePointsSystem: localTelevotePoints,
      splitPointsSystem: localSplit,
      allowMultiplePointsToSameEntry: localAllowMultiple,
    };
  }, [
    localPoints,
    localTelevotePoints,
    localSplit,
    localAllowMultiple,
    globalSettingsPointsSystem,
    globalSettingsTelevotePointsSystem,
    globalSplitPointsSystem,
    globalAllowMultiple,
  ]);

  const controller: PointsSystemController = {
    pointsSystem: localPoints,
    televotePointsSystem: localTelevotePoints,
    splitPointsSystem: localSplit,
    allowMultiplePointsToSameEntry: localAllowMultiple,
    setPointsSystem: setLocalPoints,
    setTelevotePointsSystem: setLocalTelevotePoints,
    setSplitPointsSystem: setLocalSplit,
    setAllowMultiplePointsToSameEntry: setLocalAllowMultiple,
  };

  return { controller, isOverridden, resetToGlobal, getOverride };
};
