'use client';

import { Component, type ErrorInfo, type ReactNode } from 'react';

export type ErrorWithComponentStack = Error & { componentStack?: string };

type State = { caught: boolean; rethrow: ErrorWithComponentStack | null };

/**
 * Hands every render error on to the route's error page (`app/error.tsx`)
 * with React's component stack attached as `error.componentStack`. The error
 * page only receives the error, and a production stack for some errors (React
 * #185, maximum update depth) holds no app frame at all; the component stack
 * names each component's chunk and column.
 *
 * The first pass renders nothing; `componentDidCatch` then throws the
 * annotated error from render, where the error page's boundary catches it.
 */
export class ComponentStackBoundary extends Component<
  { children: ReactNode },
  State
> {
  state: State = { caught: false, rethrow: null };

  static getDerivedStateFromError(): Partial<State> {
    return { caught: true };
  }

  componentDidCatch(error: unknown, info: ErrorInfo) {
    const annotated: ErrorWithComponentStack =
      error instanceof Error ? error : new Error(String(error));

    if (info.componentStack) {
      try {
        annotated.componentStack = info.componentStack;
      } catch {
        // A frozen error object: pass it on without the stack.
      }
    }
    this.setState({ rethrow: annotated });
  }

  render() {
    if (this.state.rethrow) throw this.state.rethrow;
    if (this.state.caught) return null;

    return this.props.children;
  }
}
