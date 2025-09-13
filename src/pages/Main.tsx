import React, { Suspense } from 'react';

import EventSetupModal from '../components/setup/EventSetupModal';
import { PageWrapper } from '../components/simulation/PageWrapper';

import { useScoreboardStore } from '@/state/scoreboardStore';

const Simulation = React.lazy(
  () => import('../components/simulation/Simulation'),
);

export const Main = () => {
  const eventStages = useScoreboardStore((state) => state.eventStages);

  return (
    <PageWrapper>
      <EventSetupModal />
      {eventStages.length > 0 && (
        <Suspense fallback={null}>
          <Simulation />
        </Suspense>
      )}
    </PageWrapper>
  );
};
