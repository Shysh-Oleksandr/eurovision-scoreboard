'use client';
import React, { Component, type ComponentProps, type ReactNode } from 'react';
import ColorPicker from 'react-best-gradient-color-picker';

type BoundaryProps = {
  value: string;
  children: (failed: boolean) => ReactNode;
};
type BoundaryState = { failed: boolean; value: string };

let reported = false;

/** Posts the value the picker couldn't read, once per page load. */
function reportUnreadableValue(value: string, error: unknown) {
  if (reported) return;
  reported = true;

  void import('@/api/client')
    .then(({ api }) =>
      api.post('/errors', {
        message: 'Color picker could not read a value',
        userDetails: {
          platform: navigator.platform,
          userAgent: navigator.userAgent,
          language: navigator.language,
        },
        generalInfo: {
          value: value.slice(0, 300),
          error: String((error as Error)?.message ?? error).slice(0, 300),
        },
      }),
    )
    .catch(() => {});
}

/**
 * react-best-gradient-color-picker parses its value while rendering and
 * throws on one it can't read, which used to take the whole app to the error
 * page (`Expected color definition`). The picker then shows the fallback
 * until the value changes.
 */
class PickerBoundary extends Component<BoundaryProps, BoundaryState> {
  state: BoundaryState = { failed: false, value: this.props.value };

  static getDerivedStateFromProps(
    props: BoundaryProps,
    state: BoundaryState,
  ): Partial<BoundaryState> | null {
    return props.value === state.value
      ? null
      : { failed: false, value: props.value };
  }

  static getDerivedStateFromError(): Partial<BoundaryState> {
    return { failed: true };
  }

  componentDidCatch(error: unknown) {
    reportUnreadableValue(this.props.value, error);
  }

  render() {
    return this.props.children(this.state.failed);
  }
}

type SafeColorPickerProps = ComponentProps<typeof ColorPicker> & {
  value: string;
  /** Shown when the picker can't read `value`: the field's default. */
  fallbackValue: string;
};

const SafeColorPicker = ({ fallbackValue, ...props }: SafeColorPickerProps) => (
  <PickerBoundary value={props.value}>
    {(failed) => (
      <ColorPicker {...props} value={failed ? fallbackValue : props.value} />
    )}
  </PickerBoundary>
);

// Memoized like the plain picker was: it re-renders from its own drag state
// and the throttled prop value, not from its parent's per-move renders.
export default React.memo(SafeColorPicker);
