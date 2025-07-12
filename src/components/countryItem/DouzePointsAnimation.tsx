import React from 'react';

type DouzePointsAnimationProps = {
  refs: {
    containerRef: React.RefObject<HTMLDivElement | null>;
    parallelogramBlueRef: React.RefObject<HTMLDivElement | null>;
    parallelogramYellowRef: React.RefObject<HTMLDivElement | null>;
  };
};

const DouzePointsAnimation: React.FC<DouzePointsAnimationProps> = ({
  refs,
}) => (
  <div
    ref={refs.containerRef}
    className="absolute overflow-hidden left-0 right-0 top-0 bottom-0 z-40 bg-countryItem-douzePointsBg flex justify-center items-center opacity-0"
  >
    <h4 className="text-countryItem-douzePointsText lg:text-xl md:text-lg xs:text-base text-sm font-bold">
      12 POINTS
    </h4>
    <div
      ref={refs.parallelogramBlueRef}
      className="absolute h-full w-[25%] -translate-x-32 bg-countryItem-douzePointsBlock1 z-50"
    />
    <div
      ref={refs.parallelogramYellowRef}
      className="absolute -translate-x-56 h-full w-[25%] bg-countryItem-douzePointsBlock2 z-50"
    />
  </div>
);

export default DouzePointsAnimation;
