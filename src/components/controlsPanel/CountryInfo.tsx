import React, { useEffect, useState } from 'react';

import { COUNTRIES_LENGTH } from '../../data';
import countries from '../../data/countries.json';
import { getSequenceNumber } from '../../helpers/getSequenceNumber';

type Props = { votingCountryIndex: number };

const CountryInfo = ({ votingCountryIndex }: Props) => {
  const [shouldBlink, setShouldBlink] = useState(false);

  const votingCountryData = countries[votingCountryIndex];

  useEffect(() => {
    if (votingCountryIndex === 0) return;

    setShouldBlink(true);

    setTimeout(() => {
      setShouldBlink(false);
    }, 1000);
  }, [votingCountryIndex]);

  return (
    <div className="bg-blue-950 w-full pb-2 lg:pt-4 pt-3 lg:px-4 px-3">
      <h4
        className={`text-white uppercase lg:text-2xl text-xl ${
          shouldBlink ? 'blinker' : ''
        }`}
      >
        {votingCountryData?.name || ''}
      </h4>
      <h5 className="uppercase text-slate-400 lg:text-sm text-xs lg:mt-4 mt-2">
        <span className="font-medium">
          {getSequenceNumber(votingCountryIndex + 1)}
        </span>{' '}
        of <span className="font-medium">{COUNTRIES_LENGTH}</span> countries
      </h5>
    </div>
  );
};

export default CountryInfo;
