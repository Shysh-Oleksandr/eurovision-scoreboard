'use client';
import React, { useMemo, useRef, useState } from 'react';

import dynamic from 'next/dynamic';

import {
  DrawShareData,
  drawShareFromLineup,
  DrawShareStage,
} from './drawShare';
import { useDrawUiStore } from './drawUiStore';

import { useAllocationDrawStore } from '@/state/allocationDrawStore';
import { useCountriesStore } from '@/state/countriesStore';

// The share image pulls in the graphics engine: only when asked for.
const ShareDrawModal = dynamic(() => import('./ShareDrawModal'), {
  ssr: false,
});

/**
 * "Share the draw" from a semi's "Drawn" chip, after Apply: the image of
 * every semi still holding the countries of that draw (drawShare.ts).
 */
const LineupDrawShare: React.FC<{ stages: readonly DrawShareStage[] }> = ({
  stages,
}) => {
  const stageId = useDrawUiStore((s) => s.shareStageId);
  const drawn = useAllocationDrawStore((s) => s.drawn);
  const getAllCountries = useCountriesStore((s) => s.getAllCountries);
  const customCountries = useCountriesStore((s) => s.customCountries);
  const entryOverrides = useCountriesStore((s) => s.entryOverrides);
  const [loaded, setLoaded] = useState(false);

  const live = useMemo(() => {
    if (!stageId) return null;
    const byCode = new Map(getAllCountries().map((c) => [c.code, c]));

    return drawShareFromLineup(stageId, stages, drawn, (code) =>
      byCode.get(code),
    );
    // customCountries and entryOverrides are the inputs of getAllCountries
    // that change.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    stageId,
    stages,
    drawn,
    customCountries,
    entryOverrides,
    getAllCountries,
  ]);

  // Keep the last image while the modal closes.
  const last = useRef<DrawShareData | null>(null);

  if (live) last.current = live;
  const data = live ?? last.current;

  if (!data || (!stageId && !loaded)) return null;

  return (
    <ShareDrawModal
      isOpen={!!stageId && !!live}
      onClose={() => useDrawUiStore.getState().setShareStageId(null)}
      onLoaded={() => setLoaded(true)}
      data={data}
    />
  );
};

export default LineupDrawShare;
