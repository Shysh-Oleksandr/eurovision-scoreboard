import { useCallback, useEffect, useState } from 'react';

const useDouzePointsAnimation = (isDouzePoints: boolean) => {
  const [showAnimation, setShowAnimation] = useState(isDouzePoints);

  const hideAnimation = useCallback(() => {
    setShowAnimation(false);
  }, []);

  useEffect(() => {
    if (isDouzePoints) {
      setShowAnimation(true);
    } else {
      const timer = setTimeout(hideAnimation, 1000);

      return () => clearTimeout(timer);
    }
  }, [isDouzePoints, hideAnimation]);

  return showAnimation;
};

export default useDouzePointsAnimation;
