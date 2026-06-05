import { arrayMoveImmutable } from 'array-move';
import { useTranslations } from 'next-intl';
import React, { useEffect, useState } from 'react';

import { PointsItem, useGeneralStore } from '../../../state/generalStore';

import { PointsList } from './PointsList';
import {
  predefinedSystemsOptions,
  PointsSystemHeader,
} from './PointsSystemHeader';

import { RestartIcon } from '@/assets/icons/RestartIcon';
import Button from '@/components/common/Button';
import { Checkbox } from '@/components/common/Checkbox';
import Select from '@/components/common/Select';
import { Tooltip } from '@/components/common/Tooltip';
import { PREDEFINED_SYSTEMS_MAP } from '@/data/data';

const SplitSectionHeader: React.FC<{
  label: string;
  currentSystem: string;
  onSystemChange: (e: React.ChangeEvent<HTMLSelectElement>) => void;
  onReset: () => void;
}> = ({ label, currentSystem, onSystemChange, onReset }) => {
  const currentSystemOption = predefinedSystemsOptions.find(
    (o) => o.value === currentSystem,
  ) || { value: 'custom', label: 'Custom' };
  const isDefault = currentSystemOption.value === 'default';

  return (
    <div className="flex items-center justify-between mb-1 flex-wrap gap-1">
      <p className="text-sm font-semibold text-white/70">{label}</p>
      <div className="flex items-center gap-2 ml-auto">
        {!isDefault && (
          <Button
            onClick={onReset}
            className="!p-2.5"
            aria-label="Restart"
            title="Restart"
          >
            <RestartIcon className="w-5 h-5" />
          </Button>
        )}
        <Select
          id={`predefined-${label}`}
          onChange={onSystemChange}
          value={currentSystemOption.value}
          options={predefinedSystemsOptions}
          className="bg-primary-800 bg-gradient-to-bl from-[10%] from-primary-800 to-primary-700/60 p-2 !rounded-md min-w-[150px] hover:bg-primary-700/60"
        >
          <span className="text-sm line-clamp-2">
            {currentSystemOption.label}
          </span>
        </Select>
      </div>
    </div>
  );
};

const resolveCurrentSystem = (points: PointsItem[]): string =>
  Object.entries(PREDEFINED_SYSTEMS_MAP).find(
    ([, value]) =>
      value.length === points.length &&
      value.every(
        (v, i) =>
          v.value === points[i]?.value &&
          v.showDouzePoints === points[i]?.showDouzePoints,
      ),
  )?.[0] ?? 'custom';

export const PointsSystemSelection = () => {
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

  const t = useTranslations('settings.voting');

  const [internalPoints, setInternalPoints] = useState<PointsItem[]>(
    () => settingsPointsSystem,
  );
  const [internalTelevotePoints, setInternalTelevotePoints] = useState<
    PointsItem[]
  >(() => settingsTelevotePointsSystem);

  useEffect(() => {
    setInternalPoints(settingsPointsSystem);
  }, [settingsPointsSystem]);

  useEffect(() => {
    setInternalTelevotePoints(settingsTelevotePointsSystem);
  }, [settingsTelevotePointsSystem]);

  const currentSystem = resolveCurrentSystem(settingsPointsSystem);
  const currentTelevoteSystem = resolveCurrentSystem(
    settingsTelevotePointsSystem,
  );

  const onSortEnd = (oldIndex: number, newIndex: number) => {
    const moved = arrayMoveImmutable(internalPoints, oldIndex, newIndex);

    setInternalPoints(moved);
    setSettingsPointsSystem(moved);
  };

  const handleRemovePoint = (index: number) => {
    setSettingsPointsSystem(settingsPointsSystem.filter((_, i) => i !== index));
  };

  const handlePointChange = (index: number, value: string) => {
    const newPoints = [...internalPoints];

    newPoints[index] = { ...newPoints[index], value: Number(value) };
    setInternalPoints(newPoints);
  };

  const handlePointBlur = (index: number) => {
    const newPoints = [...internalPoints];

    newPoints[index] = {
      ...newPoints[index],
      value: internalPoints[index].value,
    };
    setInternalPoints(newPoints);
    setSettingsPointsSystem(newPoints);
  };

  const handleAllowMultipleToggle = () => {
    setSettings({
      allowMultiplePointsToSameEntry: !allowMultiplePointsToSameEntry,
    });
  };

  const handlePredefinedSystemChange = (
    e: React.ChangeEvent<HTMLSelectElement>,
  ) => {
    const { value } = e.target;

    if (value === 'custom') return;

    setSettings({
      allowMultiplePointsToSameEntry: value === 'old',
    });
    setSettingsPointsSystem(PREDEFINED_SYSTEMS_MAP[value]);
  };

  const handleAddPoint = (value: string) => {
    const newPoint: PointsItem = {
      value: Number(value),
      showDouzePoints: false,
      id: Math.random(),
    };

    setSettingsPointsSystem([...settingsPointsSystem, newPoint]);
  };

  const handleDouzePointsToggle = (index: number) => {
    const newPoints = [...settingsPointsSystem];

    newPoints[index] = {
      ...newPoints[index],
      showDouzePoints: !newPoints[index].showDouzePoints,
    };
    setSettingsPointsSystem(newPoints);
  };

  const onTelevoreSortEnd = (oldIndex: number, newIndex: number) => {
    const moved = arrayMoveImmutable(
      internalTelevotePoints,
      oldIndex,
      newIndex,
    );

    setInternalTelevotePoints(moved);
    setSettingsTelevotePointsSystem(moved);
  };

  const handleTelevoteRemovePoint = (index: number) => {
    setSettingsTelevotePointsSystem(
      settingsTelevotePointsSystem.filter((_, i) => i !== index),
    );
  };

  const handleTelevotePointChange = (index: number, value: string) => {
    const newPoints = [...internalTelevotePoints];

    newPoints[index] = { ...newPoints[index], value: Number(value) };
    setInternalTelevotePoints(newPoints);
  };

  const handleTelevotePointBlur = (index: number) => {
    const newPoints = [...internalTelevotePoints];

    newPoints[index] = {
      ...newPoints[index],
      value: internalTelevotePoints[index].value,
    };
    setInternalTelevotePoints(newPoints);
    setSettingsTelevotePointsSystem(newPoints);
  };

  const handleTelevorePredefinedSystemChange = (
    e: React.ChangeEvent<HTMLSelectElement>,
  ) => {
    const { value } = e.target;

    if (value === 'custom') return;
    setSettingsTelevotePointsSystem(PREDEFINED_SYSTEMS_MAP[value]);
  };

  const handleTelevoteAddPoint = (value: string) => {
    const newPoint: PointsItem = {
      value: Number(value),
      showDouzePoints: false,
      id: Math.random(),
    };

    setSettingsTelevotePointsSystem([
      ...settingsTelevotePointsSystem,
      newPoint,
    ]);
  };

  const handleTelevoteDouzePointsToggle = (index: number) => {
    const newPoints = [...settingsTelevotePointsSystem];

    newPoints[index] = {
      ...newPoints[index],
      showDouzePoints: !newPoints[index].showDouzePoints,
    };
    setSettingsTelevotePointsSystem(newPoints);
  };

  const handleSplitToggle = () => {
    setSettings({ splitPointsSystem: !splitPointsSystem });
  };

  const handleResetPredefinedSystem = () => {
    setSettingsPointsSystem(PREDEFINED_SYSTEMS_MAP.default);
    setSettings({
      allowMultiplePointsToSameEntry: false,
    });
  };

  return (
    <div>
      <PointsSystemHeader
        currentSystem={currentSystem}
        onSystemChange={handlePredefinedSystemChange}
        onReset={handleResetPredefinedSystem}
        splitPointsSystem={splitPointsSystem}
        onSplitToggle={handleSplitToggle}
      />
      {splitPointsSystem ? (
        <div className="flex flex-col gap-3">
          <div>
            <SplitSectionHeader
              label={t('juryPointsSystem')}
              currentSystem={currentSystem}
              onSystemChange={handlePredefinedSystemChange}
              onReset={() =>
                setSettingsPointsSystem(PREDEFINED_SYSTEMS_MAP.default)
              }
            />
            <PointsList
              points={internalPoints}
              onSortEnd={onSortEnd}
              onPointChange={handlePointChange}
              onPointBlur={handlePointBlur}
              onPointRemove={handleRemovePoint}
              onPointAdd={handleAddPoint}
              onDouzePointsToggle={handleDouzePointsToggle}
            />
          </div>
          <div>
            <SplitSectionHeader
              label={t('televotePointsSystem')}
              currentSystem={currentTelevoteSystem}
              onSystemChange={handleTelevorePredefinedSystemChange}
              onReset={() =>
                setSettingsTelevotePointsSystem(PREDEFINED_SYSTEMS_MAP.default)
              }
            />
            <PointsList
              points={internalTelevotePoints}
              onSortEnd={onTelevoreSortEnd}
              onPointChange={handleTelevotePointChange}
              onPointBlur={handleTelevotePointBlur}
              onPointRemove={handleTelevoteRemovePoint}
              onPointAdd={handleTelevoteAddPoint}
              onDouzePointsToggle={handleTelevoteDouzePointsToggle}
            />
          </div>
        </div>
      ) : (
        <PointsList
          points={internalPoints}
          onSortEnd={onSortEnd}
          onPointChange={handlePointChange}
          onPointBlur={handlePointBlur}
          onPointRemove={handleRemovePoint}
          onPointAdd={handleAddPoint}
          onDouzePointsToggle={handleDouzePointsToggle}
        />
      )}
      <div className="flex items-start gap-2 text-white mt-2">
        <Tooltip
          content={
            <div className="font-medium">
              <p>{t('allowMultiplePointsToSameEntryTooltip')}</p>
            </div>
          }
          position="left"
        />
        <Checkbox
          id="allow-multiple-points"
          label={t('allowMultiplePointsToSameEntry')}
          labelClassName="w-full !px-0 !pt-1 !items-start"
          checked={allowMultiplePointsToSameEntry}
          onChange={handleAllowMultipleToggle}
        />
      </div>
    </div>
  );
};
