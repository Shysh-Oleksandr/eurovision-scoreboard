'use client';
import React, { useMemo } from 'react';

import dynamic from 'next/dynamic';

import { useGeneralStore } from '@/state/generalStore';

const LazySnowfall = dynamic(() => import('react-snowfall'), {
  ssr: false,
});

const SnowfallAnimation: React.FC = () => {
  const enableWinterEffects = useGeneralStore(
    (state) => state.settings.enableWinterEffects,
  );
  const snowFallIntensity = useGeneralStore(
    (state) => state.settings.snowFallIntensity, // 1-10
  );

  const { pieces, speed } = useMemo(() => {
    // Calculate pieces: 20 (min) to 500 (max) based on intensity (1-10)
    // Linear interpolation: min + (max - min) * (intensity - 1) / 9
    const pieces = Math.round(20 + (500 - 20) * ((snowFallIntensity - 1) / 9));

    // Calculate speed[0]: 0.25 (min) to 1.5 (max) based on intensity (1-10)
    const speedMin = 0.25 + (1.5 - 0.25) * ((snowFallIntensity - 1) / 9);

    // Calculate speed[1]: 1 (min) to 4.5 (max) based on intensity (1-10)
    const speedMax = 1 + (4.5 - 1) * ((snowFallIntensity - 1) / 9);

    const speed: [number, number] = [speedMin, speedMax];

    return { pieces, speed };
  }, [snowFallIntensity]);

  if (!enableWinterEffects) return null;

  return (
    <div className="hidden-on-reduced-motion">
      <LazySnowfall
        snowflakeCount={pieces}
        speed={speed}
        style={{
          position: 'fixed',
          width: '100vw',
          height: '100vh',
          zIndex: 100,
        }}
      />
    </div>
  );
};

export default SnowfallAnimation;
