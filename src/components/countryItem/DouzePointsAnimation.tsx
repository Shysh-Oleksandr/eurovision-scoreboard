import React from 'react';

import { animated } from '@react-spring/web';

type DouzePointsAnimationProps = {
  springsDouzeContainer: any;
  springsDouzeParallelogramBlue: any;
  springsDouzeParallelogramYellow: any;
};

const AnimatedDiv = animated.div as React.FC<
  React.HTMLAttributes<HTMLDivElement>
>;

const DouzePointsAnimation: React.FC<DouzePointsAnimationProps> = ({
  springsDouzeContainer,
  springsDouzeParallelogramBlue,
  springsDouzeParallelogramYellow,
}) => (
  <AnimatedDiv
    style={springsDouzeContainer}
    className="absolute overflow-hidden left-0 right-0 top-0 bottom-0 z-40 bg-countryItem-douzePointsBg flex justify-center items-center"
  >
    <h4 className="text-countryItem-douzePointsText lg:text-xl md:text-lg xs:text-base text-sm font-bold">
      12 POINTS
    </h4>
    <AnimatedDiv
      style={springsDouzeParallelogramBlue}
      className="absolute h-full w-[25%] bg-countryItem-douzePointsBlock1 z-50"
    />
    <AnimatedDiv
      style={springsDouzeParallelogramYellow}
      className="absolute -translate-x-28 h-full w-[25%] bg-countryItem-douzePointsBlock2 z-50"
    />
  </AnimatedDiv>
);

export default DouzePointsAnimation;
