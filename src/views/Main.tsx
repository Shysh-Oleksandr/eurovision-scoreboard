'use client';

import { useDeferredValue } from 'react';

import dynamic from 'next/dynamic';

import EventSetupModal from '../components/setup/EventSetupModal';
import { PageWrapper } from '../components/simulation/PageWrapper';

import { SlidersIcon } from '@/assets/icons/SlidersIcon';
import Button from '@/components/common/Button';
import { importSimulation } from '@/hooks/simulationChunkImports';
import { useSimulationChunksPreload } from '@/hooks/useSimulationChunksPreload';
import { useCountriesStore } from '@/state/countriesStore';
import { useScoreboardStore } from '@/state/scoreboardStore';

const Simulation = dynamic(importSimulation, { ssr: false });
const SnowfallAnimation = dynamic(
  () => import('../components/effects/SnowfallAnimation'),
  { ssr: false },
);

const Main = () => {
  // Subscribe to the boolean only: Main re-rendering per store update would
  // drag the whole EventSetupModal hook tree along on every award.
  const hasStages = useScoreboardStore((state) => state.eventStages.length > 0);
  // Mount the simulation in a deferred (time-sliceable) render pass so the
  // setup modal's unmount and the board's first mount don't land in a single
  // long main-thread task on stage start.
  const deferredHasStages = useDeferredValue(hasStages);

  const eventSetupModalOpen = useCountriesStore(
    (state) => state.eventSetupModalOpen,
  );
  const setEventSetupModalOpen = useCountriesStore(
    (state) => state.setEventSetupModalOpen,
  );

  useSimulationChunksPreload();

  return (
    <PageWrapper>
      <EventSetupModal />
      <SnowfallAnimation />

      {deferredHasStages ? (
        <Simulation />
      ) : (
        !hasStages &&
        !eventSetupModalOpen && (
          <div className="flex justify-center flex-1 items-center h-full">
            <Button
              onClick={() => setEventSetupModalOpen(true)}
              Icon={<SlidersIcon className="w-8 h-8" />}
              aria-label="Setup"
              title="Setup"
              label="Open Setup"
            />
          </div>
        )
      )}
    </PageWrapper>
  );
};

export default Main;
