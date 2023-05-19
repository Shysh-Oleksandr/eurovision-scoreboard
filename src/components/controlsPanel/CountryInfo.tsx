import React from 'react';

import countries from '../../data/countries.json';
import { getSequenceNumber } from '../../helpers/getSequenceNumber';

type Props = { votingCountryIndex: number };

const CountryInfo = ({ votingCountryIndex }: Props) => {
  const votingCountryData = countries[votingCountryIndex];

  return (
    <div className="bg-blue-950 w-full pb-2 pt-4 px-4">
      <h4 className="text-white uppercase text-2xl">
        {votingCountryData?.name || ''}
      </h4>
      <h5 className="uppercase text-slate-400 text-sm mt-4">
        {getSequenceNumber(votingCountryIndex + 1)} of 37 countries
      </h5>
    </div>
  );
};

export default CountryInfo;
