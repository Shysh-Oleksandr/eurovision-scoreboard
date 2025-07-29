import { arrayMoveImmutable } from 'array-move';
import React, { useEffect, useState } from 'react';

import { PointsItem, useGeneralStore } from '../../../state/generalStore';

import { PointsList } from './PointsList';
import { PointsSystemHeader } from './PointsSystemHeader';

import { PREDEFINED_SYSTEMS_MAP } from '@/data/data';

export const PointsSystemSelection = () => {
  const pointsSystem = useGeneralStore((state) => state.pointsSystem);
  const setPointsSystem = useGeneralStore((state) => state.setPointsSystem);

  const [internalPoints, setInternalPoints] = useState<PointsItem[]>(
    () => pointsSystem,
  );

  useEffect(() => {
    setInternalPoints(pointsSystem);
  }, [pointsSystem]);

  const currentSystem = Object.entries(PREDEFINED_SYSTEMS_MAP).find(
    ([, value]) =>
      value.length === pointsSystem.length &&
      value.every(
        (v, i) =>
          v.value === pointsSystem[i].value &&
          v.showDouzePoints === pointsSystem[i].showDouzePoints,
      ),
  )?.[0];

  const onSortEnd = (oldIndex: number, newIndex: number) => {
    const moved = arrayMoveImmutable(internalPoints, oldIndex, newIndex);

    setInternalPoints(moved);
    setPointsSystem(moved);
  };

  const handleRemovePoint = (index: number) => {
    setPointsSystem(pointsSystem.filter((_, i) => i !== index));
  };

  const handlePointChange = (index: number, value: string) => {
    const newPoints = [...internalPoints];

    newPoints[index] = { ...newPoints[index], value: Number(value) };
    setInternalPoints(newPoints);
  };

  const handlePointBlur = (index: number) => {
    const pointValue = internalPoints[index].value;

    if (pointValue < 1) {
      handleRemovePoint(index);
    } else {
      const newPoints = [...internalPoints];

      newPoints[index] = {
        ...newPoints[index],
        value: pointValue,
      };
      setInternalPoints(newPoints);
      setPointsSystem(newPoints);
    }
  };

  const handlePredefinedSystemChange = (
    e: React.ChangeEvent<HTMLSelectElement>,
  ) => {
    const { value } = e.target;

    if (value === 'custom') {
      return;
    }

    setPointsSystem(PREDEFINED_SYSTEMS_MAP[value]);
  };

  const handleAddPoint = (value: string) => {
    const newPoint = {
      value: Number(value),
      showDouzePoints: false,
      id: Math.random(),
    };

    setPointsSystem([...pointsSystem, newPoint]);
  };

  const handleDouzePointsToggle = (index: number) => {
    const newPoints = [...pointsSystem];

    newPoints[index] = {
      ...newPoints[index],
      showDouzePoints: !newPoints[index].showDouzePoints,
    };
    setPointsSystem(newPoints);
  };

  return (
    <div>
      <PointsSystemHeader
        currentSystem={currentSystem || 'custom'}
        onSystemChange={handlePredefinedSystemChange}
        onReset={() => setPointsSystem(PREDEFINED_SYSTEMS_MAP.default)}
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
  );
};
