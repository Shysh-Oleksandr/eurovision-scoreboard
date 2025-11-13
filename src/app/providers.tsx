'use client';

import React from 'react';

import { QueryClientProvider } from '@tanstack/react-query';

import { queryClient } from '@/api/queryClient';

export default function Providers({ children }: { children: React.ReactNode }) {
  return (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  );
}
