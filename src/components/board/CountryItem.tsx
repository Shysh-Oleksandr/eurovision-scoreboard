import React from 'react';

import { Country } from '../../models';

type Props = {
  country: Country;
  hasCountryFinishedVoting: boolean;
  isJuryVoting: boolean;
  onClick: (countryCode: string) => void;
};

const CountryItem = ({
  country,
  hasCountryFinishedVoting,
  isJuryVoting,
  onClick,
}: Props) => {
  const isVoted = country.lastReceivedPoints !== 0;
  const isDisabled = (isVoted && !hasCountryFinishedVoting) || !isJuryVoting;

  return (
    <button
      className={`flex justify-between bg-white mb-[6px] h-10 w-full ${
        isDisabled
          ? ''
          : 'cursor-pointer transition-all duration-300 hover:bg-sky-100'
      }`}
      disabled={isDisabled}
      onClick={() => onClick(country.code)}
    >
      <div className="flex items-center">
        <img
          src={country.flag}
          alt={`${country.name} flag`}
          className="w-14 h-10"
        />
        <h4 className="uppercase ml-1 font-bold text-lg">{country.name}</h4>
      </div>
      <div className="flex h-full">
        {isVoted && (
          <div className="bg-yellow-300 h-full w-10">
            <h6 className="text-pink-500 text-lg font-semibold h-full items-center flex justify-center">
              {country.lastReceivedPoints}
            </h6>
          </div>
        )}
        <div className="bg-pink-500 h-full w-10">
          <h6 className="text-white text-lg font-semibold h-full items-center flex justify-center">
            {country.points}
          </h6>
        </div>
      </div>
    </button>
  );
};

export default CountryItem;
