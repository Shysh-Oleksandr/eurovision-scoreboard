import React from 'react';

import countries from '../../data/countries.json';
import { getSequenceNumber } from '../../helpers/getSequenceNumber';

type Props = { votingCountryIndex: number };

const CountryInfo = ({ votingCountryIndex }: Props) => {
  const votingCountryData = countries[votingCountryIndex];

  return (
    <div className="bg-blue-950 w-full pb-2 lg:pt-4 pt-3 lg:px-4 px-3">
      <h4 className="text-white uppercase lg:text-2xl text-xl">
        {votingCountryData?.name || ''}
      </h4>
      <h5 className="uppercase text-slate-400 lg:text-sm text-xs lg:mt-4 mt-2">
        {getSequenceNumber(votingCountryIndex + 1)} of 37 countries
      </h5>
    </div>
  );
};

export default CountryInfo;
