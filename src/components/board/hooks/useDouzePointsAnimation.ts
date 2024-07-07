import { useEffect, useState } from 'react';

const useDouzePointsAnimation = (isDouzePoints: boolean) => {
  const [showAnimation, setShowAnimation] = useState(isDouzePoints);

  useEffect(() => {
    if (isDouzePoints) {
      setShowAnimation(true);
    } else {
      setTimeout(() => {
        setShowAnimation(false);
      }, 1000);
    }
  }, [isDouzePoints]);

  return showAnimation;
};

export default useDouzePointsAnimation;
