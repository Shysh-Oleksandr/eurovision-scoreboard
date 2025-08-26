import React, { useEffect, useState } from 'react';

import { getSequenceNumber } from '../../helpers/getSequenceNumber';
import { useCountriesStore } from '../../state/countriesStore';

import { useGeneralStore } from '@/state/generalStore';

type Props = { votingCountryIndex: number };

const CountryInfo = ({ votingCountryIndex }: Props) => {
  const [shouldBlink, setShouldBlink] = useState(false);
  const shouldShowJuryVotingProgress = useGeneralStore(
    (state) => state.settings.shouldShowJuryVotingProgress,
  );
  const getVotingCountry = useCountriesStore((state) => state.getVotingCountry);
  const getVotingCountriesLength = useCountriesStore(
    (state) => state.getVotingCountriesLength,
  );

  const votingCountry = getVotingCountry();
  const votingCountriesLength = getVotingCountriesLength();

  useEffect(() => {
    if (votingCountryIndex === 0) return;

    setShouldBlink(true);

    const timer = setTimeout(() => {
      setShouldBlink(false);
    }, 1000);

    return () => clearTimeout(timer);
  }, [votingCountryIndex]);

  return (
    <div className="w-full pb-2 lg:pt-4 pt-3 lg:px-4 px-3 rounded-md rounded-b-none">
      <h4
        className={`text-white uppercase break-words lg:text-2xl text-xl ${
          shouldBlink ? 'blinker' : ''
        }`}
      >
        {votingCountry?.name || ''}
      </h4>
      <h5 className="uppercase text-white/50 lg:text-sm text-xs lg:mt-1 mt-2">
        <span className="font-medium">
          {getSequenceNumber(votingCountryIndex + 1)}
        </span>{' '}
        of <span className="font-medium">{votingCountriesLength}</span>{' '}
        countries
      </h5>

      {shouldShowJuryVotingProgress && (
        <div className="w-full bg-primary-900 rounded-full h-2 relative sm:mt-3 mt-2">
          <div
            className={`h-2 rounded-full transition-all duration-300 bg-primary-700 bg-gradient-to-r from-primary-800 to-primary-700`}
            style={{
              width: `${Math.min(
                ((votingCountryIndex + 1) / votingCountriesLength) * 100,
                100,
              )}%`,
            }}
          />
        </div>
      )}
    </div>
  );
};

export default CountryInfo;
