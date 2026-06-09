import { PointsItem } from '@/models';
import { useGeneralStore } from '@/state/generalStore';

export interface PointsSystemController {
  pointsSystem: PointsItem[];
  televotePointsSystem: PointsItem[];
  splitPointsSystem: boolean;
  allowMultiplePointsToSameEntry: boolean;
  setPointsSystem: (points: PointsItem[]) => void;
  setTelevotePointsSystem: (points: PointsItem[]) => void;
  setSplitPointsSystem: (value: boolean) => void;
  setAllowMultiplePointsToSameEntry: (value: boolean) => void;
}

export const useGlobalPointsSystemController = (): PointsSystemController => {
  const settingsPointsSystem = useGeneralStore(
    (state) => state.settingsPointsSystem,
  );
  const setSettingsPointsSystem = useGeneralStore(
    (state) => state.setSettingsPointsSystem,
  );
  const settingsTelevotePointsSystem = useGeneralStore(
    (state) => state.settingsTelevotePointsSystem,
  );
  const setSettingsTelevotePointsSystem = useGeneralStore(
    (state) => state.setSettingsTelevotePointsSystem,
  );
  const splitPointsSystem = useGeneralStore(
    (state) => state.settings.splitPointsSystem,
  );
  const allowMultiplePointsToSameEntry = useGeneralStore(
    (state) => state.settings.allowMultiplePointsToSameEntry,
  );
  const setSettings = useGeneralStore((state) => state.setSettings);

  return {
    pointsSystem: settingsPointsSystem,
    televotePointsSystem: settingsTelevotePointsSystem,
    splitPointsSystem,
    allowMultiplePointsToSameEntry,
    setPointsSystem: setSettingsPointsSystem,
    setTelevotePointsSystem: setSettingsTelevotePointsSystem,
    setSplitPointsSystem: (value) => setSettings({ splitPointsSystem: value }),
    setAllowMultiplePointsToSameEntry: (value) =>
      setSettings({ allowMultiplePointsToSameEntry: value }),
  };
};
