import { useCallback, useEffect, useRef, useState } from 'react';

import { ANIMATION_DURATION } from '../../../data/data';

const useVotingFinished = (isVotingFinished: boolean) => {
  const timerId = useRef<number | null>(null);
  const [isFinished, setIsFinished] = useState(false);

  const clearTimer = useCallback(() => {
    if (timerId.current) {
      clearTimeout(timerId.current);
      timerId.current = null;
    }
  }, []);

  useEffect(() => {
    if (isVotingFinished && !timerId.current) {
      timerId.current = setTimeout(() => {
        setIsFinished(true);
      }, ANIMATION_DURATION);
    }

    if (!isVotingFinished) {
      clearTimer();
      setIsFinished(false);
    }

    return clearTimer;
  }, [isVotingFinished, clearTimer]);

  return isFinished;
};

export default useVotingFinished;
