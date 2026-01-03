'use client';

import React from 'react';

import { QueryClientProvider } from '@tanstack/react-query';

import { queryClient } from '@/api/queryClient';
import { ConfirmationProvider } from '@/components/common/ConfirmationProvider';

export default function Providers({ children }: { children: React.ReactNode }) {
  return (
    <QueryClientProvider client={queryClient}>
      <ConfirmationProvider>{children}</ConfirmationProvider>
    </QueryClientProvider>
  );
}
