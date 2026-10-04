'use client';
import React, { createContext, useContext } from 'react';

import type { AllocationDrawModel } from './useAllocationDraw';

const AllocationDrawContext = createContext<AllocationDrawModel | null>(null);

export const AllocationDrawProvider: React.FC<{
  value: AllocationDrawModel;
  children: React.ReactNode;
}> = ({ value, children }) => (
  <AllocationDrawContext.Provider value={value}>
    {children}
  </AllocationDrawContext.Provider>
);

/** The draw model computed once in EventSetupModal (see `useAllocationDraw`). */
export const useAllocationDrawContext = (): AllocationDrawModel => {
  const model = useContext(AllocationDrawContext);

  if (!model) {
    throw new Error('useAllocationDrawContext outside AllocationDrawProvider');
  }

  return model;
};
