import '@testing-library/jest-dom/vitest';
import React from 'react';
import { vi } from 'vitest';

vi.mock('react-easy-sort', () => ({
  default: ({ children }: { children: React.ReactNode }) => (
    <div data-testid="sortable-list-mock">{children}</div>
  ),
  SortableItem: ({ children }: { children: React.ReactNode }) => (
    <div>{children}</div>
  ),
}));
