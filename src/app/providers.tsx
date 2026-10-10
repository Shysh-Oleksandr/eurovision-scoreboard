'use client';

import React from 'react';

import { QueryClientProvider } from '@tanstack/react-query';

import { queryClient } from '@/api/queryClient';
import { ConfirmationProvider } from '@/components/common/ConfirmationProvider';
import ReportDialogHost from '@/components/moderation/ReportDialogHost';
import { SyncUserPreferences } from '@/components/SyncUserPreferences';

export default function Providers({ children }: { children: React.ReactNode }) {
  return (
    <QueryClientProvider client={queryClient}>
      <SyncUserPreferences />
      <ConfirmationProvider>{children}</ConfirmationProvider>
      <ReportDialogHost />
    </QueryClientProvider>
  );
}
