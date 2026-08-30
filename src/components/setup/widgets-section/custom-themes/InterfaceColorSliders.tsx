import React from 'react';

import Hue from '@uiw/react-color-hue';
import ShadeSlider from '@uiw/react-color-shade-slider';

import { useThrottledEdit } from './hooks/useThrottledEdit';

export interface HsvaValue {
  h: number;
  s: number;
  v: number;
  a: number;
}

interface InterfaceColorSlidersProps {
  hsva: HsvaValue;
  onChange: (next: HsvaValue) => void;
}

/**
 * The Look tab's hue + shade sliders. Slider drags render only this component
 * via the local echo; the full hsva propagates to CustomizeThemeModal on a
 * 40 ms throttle (the modal already debounces its preview at the same 40 ms,
 * so the visible cadence is unchanged — the whole-modal re-render per
 * pointer-move is what disappears).
 */
const InterfaceColorSliders: React.FC<InterfaceColorSlidersProps> = ({
  hsva,
  onChange,
}) => {
  const [liveHsva, pushChange] = useThrottledEdit(hsva, onChange);

  return (
    <>
      <Hue
        hue={liveHsva.h}
        className="[&>:first-child]:!rounded-[10px] !rounded-[10px]"
        onChange={(newHue) => {
          pushChange({ ...liveHsva, h: newHue.h });
        }}
      />
      <ShadeSlider
        className="mt-1 [&>:first-child]:!rounded-[10px] !rounded-[10px]"
        hsva={liveHsva}
        onChange={(newShade) => {
          pushChange({
            ...liveHsva,
            v: Math.max(15, Math.min(100, newShade.v)),
          });
        }}
      />
    </>
  );
};

export default React.memo(InterfaceColorSliders);
