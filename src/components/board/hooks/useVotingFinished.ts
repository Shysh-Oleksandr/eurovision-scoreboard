import { useEffect, useRef, useState } from 'react';

import { ANIMATION_DURATION } from '../../../data';

const useVotingFinished = (isVotingFinished: boolean) => {
  const timerId = useRef<NodeJS.Timeout | null>(null);
  const [isFinished, setIsFinished] = useState(false);

  useEffect(() => {
    if (isVotingFinished && !timerId.current) {
      timerId.current = setTimeout(() => {
        setIsFinished(true);
      }, ANIMATION_DURATION);
    }

    if (!isVotingFinished && timerId.current) {
      clearTimeout(timerId.current);
      timerId.current = null;
      setIsFinished(false);
    }
  }, [isVotingFinished]);

  return isFinished;
};

export default useVotingFinished;
