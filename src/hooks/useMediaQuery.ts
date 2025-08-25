import { useEffect, useState } from 'react';

export const useMediaQuery = (query: string) => {
  const [matches, setMatches] = useState(false);

  useEffect(() => {
    const media = window.matchMedia(query);

    if (media.matches !== matches) {
      setMatches(media.matches);
    }
    const listener = () => setMatches(media.matches);

    window.addEventListener('resize', listener);
    window.addEventListener('orientationchange', listener);

    return () => {
      window.removeEventListener('resize', listener);
      window.removeEventListener('orientationchange', listener);
    };
  }, [matches, query]);

  return matches;
};
