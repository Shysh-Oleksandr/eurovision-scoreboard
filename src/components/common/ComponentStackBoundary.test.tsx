import { Component, type ReactNode } from 'react';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { cleanup, render } from '@testing-library/react';

import {
  ComponentStackBoundary,
  type ErrorWithComponentStack,
} from './ComponentStackBoundary';

/** Stands in for the route's error page boundary. */
class ErrorPage extends Component<
  { children: ReactNode; onError: (error: ErrorWithComponentStack) => void },
  { failed: boolean }
> {
  state = { failed: false };

  static getDerivedStateFromError() {
    return { failed: true };
  }

  componentDidCatch(error: ErrorWithComponentStack) {
    this.props.onError(error);
  }

  render() {
    return this.state.failed ? <p>error page</p> : this.props.children;
  }
}

function VotingPanel(): ReactNode {
  throw new Error('render loop');
}

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
});

describe('ComponentStackBoundary', () => {
  it('passes the error on to the error page with its component stack', () => {
    vi.spyOn(console, 'error').mockImplementation(() => {});
    const onError = vi.fn();

    const { getByText } = render(
      <ErrorPage onError={onError}>
        <ComponentStackBoundary>
          <VotingPanel />
        </ComponentStackBoundary>
      </ErrorPage>,
    );

    expect(getByText('error page')).toBeInTheDocument();
    expect(onError).toHaveBeenCalledTimes(1);

    const error = onError.mock.calls[0][0] as ErrorWithComponentStack;

    expect(error.message).toBe('render loop');
    expect(error.componentStack).toContain('VotingPanel');
  });

  it('renders its children when nothing throws', () => {
    const { getByText } = render(
      <ComponentStackBoundary>
        <p>board</p>
      </ComponentStackBoundary>,
    );

    expect(getByText('board')).toBeInTheDocument();
  });
});
