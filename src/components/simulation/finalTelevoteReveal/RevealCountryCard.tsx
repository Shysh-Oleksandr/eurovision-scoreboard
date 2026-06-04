import React from 'react';

import { getFlagPath, handleFlagError } from '@/helpers/getFlagPath';
import { Country } from '@/models';

type Props = {
  country: Country;
  side: 'leader' | 'last';
  cardRef: React.RefObject<HTMLDivElement | null>;
  flagRef: React.RefObject<HTMLImageElement | null>;
  textRef: React.RefObject<HTMLDivElement | null>;
  glowStyle: React.CSSProperties | undefined;
  label: React.ReactNode;
};

const RevealCountryCard = ({
  country,
  side,
  cardRef,
  flagRef,
  textRef,
  glowStyle,
  label,
}: Props) => {
  const isLeader = side === 'leader';

  return (
    <div
      ref={cardRef}
      className={`flex-1 flex flex-col items-center justify-center gap-4 bg-primary-700/40 bg-gradient-to-br from-primary-800/40 to-primary-800/20 backdrop-blur-sm ${
        isLeader ? 'rounded-l-lg ' : ''
      }md:p-6 xs:p-4 p-2 z-10`}
      style={{
        ...glowStyle,
        border: '1.5px solid rgba(255,255,255,0.14)',
        boxShadow: `
    0 0 18px 0.5px hsl(var(--qualified-panel-glow-hue) 34% 35% / 68%),
    0 0 24px 6px hsl(var(--qualified-panel-glow-hue) 28% 25% / 42%),
    inset 0 6px 14px -5px rgb(0 0 0 / 22%),
    inset 6px 0 14px -8px rgb(0 0 0 / 12%)`,
        borderRadius: isLeader ? '22px 22px 0 22px' : '22px 22px 22px 0',
      }}
    >
      <img
        ref={flagRef}
        src={getFlagPath(country)}
        onError={(e) => handleFlagError(e.currentTarget, country)}
        alt={country.name}
        className="lg:w-[150px] xs:w-[120px] w-[90px] lg:h-[110px] xs:h-[90px] h-[70px] object-cover rounded shadow-lg"
      />
      <div ref={textRef} className="text-center">
        <div className="text-white font-bold lg:text-3xl md:text-2xl xs:text-xl text-lg leading-tight break-words">
          {country.name}
        </div>
        <div className="text-white/70 xs:text-sm text-xs font-semibold uppercase tracking-widest mt-2 opacity-80">
          {label}
        </div>
      </div>
    </div>
  );
};

export default RevealCountryCard;
