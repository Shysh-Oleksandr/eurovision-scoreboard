import React from 'react';

import './output.css';

import { QueryClientProvider } from '@tanstack/react-query';
import { createRoot } from 'react-dom/client';

import { queryClient } from './api/queryClient';
import { App } from './App';

// Proactively reload if the tab resumes after a long time or comes back from bfcache
const MAX_HIDDEN_MS = 12 * 60 * 60 * 1000; // 12 hours
let lastHiddenAt: number | null = null;

window.addEventListener('pageshow', (event) => {
  // On iOS/Safari returning from BFCache can leave stale module graph
  // If the page was persisted, force a reload to get fresh assets
  if (event.persisted) {
    window.location.reload();
  }
});

document.addEventListener('visibilitychange', () => {
  if (document.visibilityState === 'hidden') {
    lastHiddenAt = Date.now();

    return;
  }
  if (document.visibilityState === 'visible' && lastHiddenAt) {
    const hiddenForMs = Date.now() - lastHiddenAt;

    if (hiddenForMs > MAX_HIDDEN_MS) {
      window.location.reload();
    }
    lastHiddenAt = null;
  }
});

const container = document.getElementById('root');
const root = createRoot(container!);

root.render(
  <QueryClientProvider client={queryClient}>
    <App />
  </QueryClientProvider>,
);
