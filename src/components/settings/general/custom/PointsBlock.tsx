import React from 'react';

import { PointsSystemSelection } from '../../pointsSystem/PointsSystemSelection';
import { useGlobalPointsSystemController } from '../../pointsSystem/useGlobalPointsSystemController';

/**
 * The points-system editor (chips, presets, split jury/televote, sparkle,
 * add/remove, allow-multiple). Reuses the existing composite unchanged so the
 * shared logic — and the identical editor in the stage setup panel — stay intact.
 */
export const PointsBlock: React.FC = () => {
  const controller = useGlobalPointsSystemController();

  return (
    <div className="px-3 pb-1">
      <PointsSystemSelection controller={controller} />
    </div>
  );
};
