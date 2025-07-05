import React from 'react';

import { animated } from '@react-spring/web';

type DouzePointsAnimationProps = {
  springsDouzeContainer: any;
  springsDouzeParallelogramBlue: any;
  springsDouzeParallelogramYellow: any;
};

const DouzePointsAnimation: React.FC<DouzePointsAnimationProps> = ({
  springsDouzeContainer,
  springsDouzeParallelogramBlue,
  springsDouzeParallelogramYellow,
}) => (
  <animated.div
    style={springsDouzeContainer}
    className="absolute overflow-hidden left-0 right-0 top-0 bottom-0 z-40 bg-countryItem-douzePointsBg flex justify-center items-center"
  >
    <h4 className="text-countryItem-douzePointsText lg:text-xl md:text-lg xs:text-base text-sm font-bold">
      12 POINTS
    </h4>
    <animated.div
      style={springsDouzeParallelogramBlue}
      className="absolute h-full w-[25%] bg-countryItem-douzePointsBlock1 z-50"
    />
    <animated.div
      style={springsDouzeParallelogramYellow}
      className="absolute -translate-x-28 h-full w-[25%] bg-countryItem-douzePointsBlock2 z-50"
    />
  </animated.div>
);

export default DouzePointsAnimation;
