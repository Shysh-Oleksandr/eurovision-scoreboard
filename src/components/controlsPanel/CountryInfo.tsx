import React, { useEffect, useState } from 'react';

import { getSequenceNumber } from '../../helpers/getSequenceNumber';
import { useCountriesStore } from '../../state/countriesStore';

type Props = { votingCountryIndex: number };

const CountryInfo = ({ votingCountryIndex }: Props) => {
  const [shouldBlink, setShouldBlink] = useState(false);

  const { getVotingCountry, getVotingCountriesLength } = useCountriesStore();

  const votingCountry = getVotingCountry();
  const votingCountriesLength = getVotingCountriesLength();

  useEffect(() => {
    if (votingCountryIndex === 0) return;

    setShouldBlink(true);

    setTimeout(() => {
      setShouldBlink(false);
    }, 1000);
  }, [votingCountryIndex]);

  return (
    <div className="w-full pb-2 lg:pt-4 pt-3 lg:px-4 px-3 rounded-md rounded-b-none">
      <h4
        className={`text-white uppercase lg:text-2xl text-xl ${
          shouldBlink ? 'blinker' : ''
        }`}
      >
        {votingCountry?.name || ''}
      </h4>
      <h5 className="uppercase text-slate-400 lg:text-sm text-xs lg:mt-4 mt-2">
        <span className="font-medium">
          {getSequenceNumber(votingCountryIndex + 1)}
        </span>{' '}
        of <span className="font-medium">{votingCountriesLength}</span>{' '}
        countries
      </h5>
    </div>
  );
};

export default CountryInfo;
