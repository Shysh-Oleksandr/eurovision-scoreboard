import React from 'react';

import EventSetupModal from '../components/setup/EventSetupModal';
import { PageWrapper } from '../components/simulation/PageWrapper';

import { Simulation } from '@/components/simulation/Simulation';

export const Main = () => {
  return (
    <PageWrapper>
      <EventSetupModal />
      <Simulation />
    </PageWrapper>
  );
};
