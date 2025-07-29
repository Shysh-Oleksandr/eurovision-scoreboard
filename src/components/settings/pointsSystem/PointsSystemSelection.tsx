import { arrayMoveImmutable } from 'array-move';
import React, { useEffect, useState } from 'react';

import { useGeneralStore } from '../../../state/generalStore';

import { PointsSystemHeader, PointsList, PREDEFINED_SYSTEMS_MAP } from '.';

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

  const currentSystem = Object.entries(PREDEFINED_SYSTEMS_MAP).find(
    ([, value]) =>
      value.length === pointsSystem.length &&
      value.every((v, i) => v === pointsSystem[i]),
  )?.[0];

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

  const handleAddPoint = (value: string) => {
    setPointsSystem([...pointsSystem, Number(value)]);
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
      />
    </div>
  );
};
