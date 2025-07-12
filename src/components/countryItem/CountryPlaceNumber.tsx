import gsap from 'gsap';
import React, { useMemo, useRef } from 'react';

import { useGSAP } from '@gsap/react';

type Props = {
  shouldShowAsNonQualified: boolean;
  index: number;
  showPlaceAnimation: boolean;
};

const CountryPlaceNumber = ({
  shouldShowAsNonQualified,
  index,
  showPlaceAnimation,
}: Props) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const textRef = useRef<HTMLHeadingElement>(null);

  // Calculate width dynamically to handle different screen sizes
  const width = useMemo(() => {
    if (typeof window !== 'undefined') {
      return window.innerWidth > 576 ? 40 : 32;
    }

    return 40; // fallback
  }, []);

  useGSAP(
    () => {
      if (showPlaceAnimation) {
        gsap.fromTo(
          containerRef.current,
          {
            width: 0,
          },
          {
            width,
            duration: 0.3,
            delay: 0.08,
            ease: 'power3.inOut',
          },
        );
        gsap.fromTo(
          textRef.current,
          {
            opacity: 0,
          },
          {
            opacity: 1,
            duration: 0.3,
            delay: 0.08,
            ease: 'power3.inOut',
          },
        );
      }
    },
    { dependencies: [showPlaceAnimation, width], scope: containerRef },
  );

  const placeText = index + 1 < 10 ? `0${index + 1}` : index + 1;

  if (!showPlaceAnimation) {
    return null;
  }

  return (
    <div
      ref={containerRef}
      className={`flex flex-none items-center justify-center lg:h-10 md:h-9 xs:h-8 h-7 rounded-sm bg-countryItem-placeContainerBg text-countryItem-placeText ${
        shouldShowAsNonQualified ? 'bg-primary-900 opacity-70' : ''
      }`}
    >
      <h4 ref={textRef} className="font-semibold md:text-lg text-base">
        {placeText}
      </h4>
    </div>
  );
};

export default CountryPlaceNumber;
