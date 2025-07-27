import { arrayMoveImmutable } from 'array-move';
import React, { useEffect, useState } from 'react';
import SortableList, { SortableItem } from 'react-easy-sort';

import { DragGripIcon } from '../../assets/icons/DragGripIcon';
import { PlusIcon } from '../../assets/icons/PlusIcon';
import { XCloseIcon } from '../../assets/icons/XClose';
import { POINTS_ARRAY } from '../../data/data';
import { useGeneralStore } from '../../state/generalStore';
import Button from '../common/Button';
import Select from '../common/Select';
import { Input } from '../Input';

import { RestartIcon } from '@/assets/icons/RestartIcon';

const REVERSED_POINTS_ARRAY = [...POINTS_ARRAY].reverse();
const OLD_POINTS_ARRAY = Array(10).fill(1);

const PREDEFINED_SYSTEMS_MAP = {
  default: POINTS_ARRAY,
  reversed: REVERSED_POINTS_ARRAY,
  old: OLD_POINTS_ARRAY,
};

const predefinedSystemsOptions = [
  { value: 'default', label: 'Eurovision Standard (1-8, 10, 12)' },
  { value: 'reversed', label: 'Reversed (12-8, 10, 1)' },
  { value: 'old', label: 'Eurovision Pre-1975 (1x10)' },
];

export const PointsSystemSelection = () => {
  const pointsSystem = useGeneralStore((state) => state.pointsSystem);
  const setPointsSystem = useGeneralStore((state) => state.setPointsSystem);

  const [internalPoints, setInternalPoints] = useState(() =>
    pointsSystem.map((p) => ({ id: Math.random(), value: String(p) })),
  );

  useEffect(() => {
    setInternalPoints(
      pointsSystem.map((p) => ({ id: Math.random(), value: String(p) })),
    );
  }, [pointsSystem]);

  const [isAdding, setIsAdding] = useState(false);
  const [newPoint, setNewPoint] = useState('');

  const currentSystem = Object.entries(PREDEFINED_SYSTEMS_MAP).find(
    ([, value]) =>
      value.length === pointsSystem.length &&
      value.every((v, i) => v === pointsSystem[i]),
  )?.[0];

  const currentSystemOption = predefinedSystemsOptions.find(
    (option) => option.value === currentSystem,
  ) || { value: 'custom', label: 'Custom' };

  const isDefaultSystem = currentSystemOption.value === 'default';

  const onSortEnd = (oldIndex: number, newIndex: number) => {
    const moved = arrayMoveImmutable(internalPoints, oldIndex, newIndex);

    setInternalPoints(moved);
    setPointsSystem(
      moved
        .map((p) => Number(p.value))
        .filter((p) => !Number.isNaN(p) && p !== 0),
    );
  };

  const handleRemovePoint = (index: number) => {
    setPointsSystem(pointsSystem.filter((_, i) => i !== index));
  };

  const handleAddPoint = () => {
    if (
      Number(newPoint) < 1 ||
      Number.isNaN(Number(newPoint)) ||
      newPoint.trim() === ''
    ) {
      setIsAdding(false);
      setNewPoint('');

      return;
    }

    if (newPoint.trim() !== '') {
      setPointsSystem([...pointsSystem, Number(newPoint)]);
      setNewPoint('');
      setIsAdding(false);
    }
  };

  const handlePointChange = (index: number, value: string) => {
    const newPoints = [...internalPoints];

    newPoints[index] = { ...newPoints[index], value };
    setInternalPoints(newPoints);
  };

  const handlePointBlur = (index: number) => {
    const pointValue = internalPoints[index].value;

    if (String(pointValue).trim() === '' || Number(pointValue) < 1) {
      handleRemovePoint(index);
    } else {
      const newPoints = [...internalPoints];

      newPoints[index] = {
        ...newPoints[index],
        value: String(Number(pointValue)),
      };
      setInternalPoints(newPoints);

      setPointsSystem(newPoints.map((p) => Number(p.value)));
    }
  };

  const handlePredefinedSystemChange = (
    e: React.ChangeEvent<HTMLSelectElement>,
  ) => {
    const { value } = e.target;

    if (value === 'custom') {
      return;
    }

    setPointsSystem(
      PREDEFINED_SYSTEMS_MAP[value as keyof typeof PREDEFINED_SYSTEMS_MAP],
    );
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-2 flex-wrap gap-1">
        <div>
          <h4 className="text-base sm:text-lg font-semibold">Points System</h4>
          <p className="text-sm text-white/50">Drag and drop to reorder</p>
        </div>
        <div className="flex items-center gap-2 ml-auto">
          {!isDefaultSystem && (
            <Button
              onClick={() => {
                setPointsSystem(PREDEFINED_SYSTEMS_MAP.default);
              }}
              className="!p-2.5"
              aria-label="Restart"
              title="Restart"
            >
              <RestartIcon className="w-5 h-5" />
            </Button>
          )}
          <Select
            id="predefined-systems"
            onChange={handlePredefinedSystemChange}
            value={currentSystemOption?.value}
            options={predefinedSystemsOptions}
            className="bg-primary-800 bg-gradient-to-bl from-[10%] from-primary-800 to-primary-700/60 p-2 !rounded-md min-w-[150px]"
          >
            <span className="text-sm line-clamp-2">
              {currentSystemOption?.label}
            </span>
          </Select>
        </div>
      </div>
      <SortableList
        onSortEnd={onSortEnd}
        className="flex flex-wrap gap-2"
        draggedItemClassName="dragged"
      >
        {internalPoints.map((item, index) => (
          <SortableItem key={item.id}>
            <div className="flex items-center bg-primary-800 bg-gradient-to-bl from-[10%] from-primary-800 to-primary-700/60 py-1 rounded-md z-10 cursor-grab">
              <div className="h-full flex items-center justify-center">
                <DragGripIcon className="w-6 h-6 text-white" />
              </div>
              <Input
                type="number"
                value={item.value}
                onChange={(e) => handlePointChange(index, e.target.value)}
                onBlur={() => handlePointBlur(index)}
                className="!w-12 h-8 bg-transparent bg-none"
                min={1}
                step={1}
              />
              <button
                onClick={() => handleRemovePoint(index)}
                className="ml-auto pr-1"
              >
                <XCloseIcon className="w-6 h-6 text-white" />
              </button>
            </div>
          </SortableItem>
        ))}
        <div className="flex items-center justify-end">
          {isAdding ? (
            <div className="flex items-center">
              <Input
                type="number"
                value={newPoint}
                onChange={(e) => setNewPoint(e.target.value)}
                onBlur={handleAddPoint}
                autoFocus
                className="lg:!w-[60px] !w-[52px] !h-[35px] text-center !px-0"
              />
            </div>
          ) : (
            <Button
              onClick={() => setIsAdding(true)}
              className="h-full !py-1 !px-4 lg:!px-5 w-fit"
            >
              <PlusIcon className="w-7 h-7" />
            </Button>
          )}
        </div>
      </SortableList>
    </div>
  );
};
