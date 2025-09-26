import React, { Suspense } from 'react';

import EventSetupModal from '../components/setup/EventSetupModal';
import { PageWrapper } from '../components/simulation/PageWrapper';

import { SlidersIcon } from '@/assets/icons/SlidersIcon';
import Button from '@/components/common/Button';
import { useCountriesStore } from '@/state/countriesStore';
import { useScoreboardStore } from '@/state/scoreboardStore';

const Simulation = React.lazy(
  () => import('../components/simulation/Simulation'),
);

export const Main = () => {
  const eventStages = useScoreboardStore((state) => state.eventStages);
  const eventSetupModalOpen = useCountriesStore(
    (state) => state.eventSetupModalOpen,
  );
  const setEventSetupModalOpen = useCountriesStore(
    (state) => state.setEventSetupModalOpen,
  );

  return (
    <PageWrapper>
      <EventSetupModal />
      {eventStages.length > 0 ? (
        <Suspense fallback={null}>
          <Simulation />
        </Suspense>
      ) : (
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
