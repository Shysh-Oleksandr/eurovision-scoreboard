import React, { useEffect, useState } from 'react';

import { getSequenceNumber } from '../../helpers/getSequenceNumber';
import { useCountriesStore } from '../../state/countriesStore';
import { useScoreboardStore } from '../../state/scoreboardStore';

type Props = { votingCountryIndex: number };

const CountryInfo = ({ votingCountryIndex }: Props) => {
  const [shouldBlink, setShouldBlink] = useState(false);

  const { getVotingCountry, getVotingCountriesLength, getVotingCountries } =
    useCountriesStore();
  const { presenterSettings } = useScoreboardStore();

  // In presenter mode, get the country directly like BoardHeader does
  const votingCountry = presenterSettings.isAutoPlaying
    ? getVotingCountries()[presenterSettings.currentMessageCountryIndex]
    : getVotingCountry();

  const votingCountriesLength = getVotingCountriesLength();

  // In presenter mode, use currentMessageCountryIndex for sequence number
  const effectiveIndex = presenterSettings.isAutoPlaying
    ? presenterSettings.currentMessageCountryIndex
    : votingCountryIndex;

  useEffect(() => {
    if (effectiveIndex === 0) return;

    setShouldBlink(true);

    setTimeout(() => {
      setShouldBlink(false);
    }, 1000);
  }, [effectiveIndex]);

  return (
    <div className="w-full pb-2 lg:pt-4 pt-3 lg:px-4 px-3 rounded-md rounded-b-none">
      <h4
        className={`text-white uppercase lg:text-2xl text-xl ${
          shouldBlink ? 'blinker' : ''
        }`}
      >
        {votingCountry?.name || ''}
      </h4>
      <h5 className="uppercase text-slate-400 lg:text-sm text-xs lg:mt-3 mt-2">
        <span className="font-medium">
          {getSequenceNumber(effectiveIndex + 1)}
        </span>{' '}
        of <span className="font-medium">{votingCountriesLength}</span>{' '}
        countries
      </h5>
    </div>
  );
};

export default CountryInfo;
