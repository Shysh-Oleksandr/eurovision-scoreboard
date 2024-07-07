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
    className="absolute overflow-hidden left-0 right-0 top-0 bottom-0 z-40 bg-yellow-300 flex justify-center items-center"
  >
    <h4 className="text-pink-500 lg:text-xl md:text-lg xs:text-base text-sm font-bold">
      12 POINTS
    </h4>
    <animated.div
      style={springsDouzeParallelogramBlue}
      className="absolute h-full w-[25%] bg-blue-700 z-50"
    />
    <animated.div
      style={springsDouzeParallelogramYellow}
      className="absolute -translate-x-28 h-full w-[25%] bg-pink-500 z-50"
    />
  </animated.div>
);

export default DouzePointsAnimation;
