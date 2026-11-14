'use client';
import React, { useState } from 'react';

import { getFlagPath, handleFlagError } from '@/helpers/getFlagPath';
import { VotingCountry } from '@/models';

/**
 * The voter's flag, filling its box. When the voter changes, the new flag
 * fades in over the old one (the old one stays underneath until it has),
 * so the window never flashes empty: the one moment the chrome animates.
 */
const CrossfadeFlag = ({ country }: { country?: VotingCountry }) => {
  const [layers, setLayers] = useState<VotingCountry[]>(
    country ? [country] : [],
  );
  const top = layers[layers.length - 1];

  // Derived state: queue the incoming flag above the current one.
  if (country && top?.code !== country.code) {
    setLayers((prev) => [...prev.slice(-1), country]);
  }

  return (
    <>
      {layers.map((layer, index) => {
        const isIncoming = layers.length > 1 && index === layers.length - 1;

        return (
          <img
            key={layer.code}
            src={getFlagPath(layer, 'big-rectangle')}
            onError={(e) => handleFlagError(e.currentTarget, layer)}
            onAnimationEnd={isIncoming ? () => setLayers([layer]) : undefined}
            alt=""
            className={`absolute inset-0 h-full w-full object-cover ${
              isIncoming ? 'dp-sim-window-img' : ''
            }`}
          />
        );
      })}
    </>
  );
};

export default CrossfadeFlag;
