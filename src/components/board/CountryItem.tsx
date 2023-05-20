import React, { useEffect, useState } from 'react';

import { Country } from '../../models';

type Props = {
  country: Country;
  hasCountryFinishedVoting: boolean;
  isJuryVoting: boolean;
  isActive: boolean;
  onClick: (countryCode: string) => void;
};

const CountryItem = ({
  country,
  hasCountryFinishedVoting,
  isJuryVoting,
  isActive,
  onClick,
}: Props) => {
  const isVoted = country.lastReceivedPoints !== 0 || country.isVotingFinished;
  const isDisabled = (isVoted && !hasCountryFinishedVoting) || !isJuryVoting;

  const [isVotingFinished, setIsVotingFinished] = useState(false);

  useEffect(() => {
    if (country.isVotingFinished) {
      setTimeout(() => {
        setIsVotingFinished(true);
      }, 3000);
    }
  }, [country.isVotingFinished]);

  return (
    <button
      className={`flex justify-between shadow-md mb-[6px] h-10 w-full ${
        isDisabled
          ? ''
          : 'cursor-pointer transition-all duration-300 hover:bg-sky-100'
      } ${country.isVotingFinished ? 'bg-blue-900' : 'bg-white'} ${
        isActive
          ? 'outline outline-2 outline-blue-500 rounded-sm bg-blue-700'
          : ''
      }`}
      disabled={isDisabled}
      onClick={() => onClick(country.code)}
    >
      <div className="flex items-center">
        <img
          src={country.flag}
          alt={`${country.name} flag`}
          className="w-14 h-10 bg-white"
        />
        <h4
          className={`uppercase ml-1 font-bold text-lg ${
            country.isVotingFinished || isActive
              ? 'text-white'
              : 'text-blue-950'
          }`}
        >
          {country.name}
        </h4>
      </div>
      <div className="flex h-full">
        {isVoted && !isVotingFinished && (
          <div className="bg-yellow-300 h-full w-10">
            <h6 className="text-pink-500 text-lg font-semibold h-full items-center flex justify-center">
              {country.lastReceivedPoints}
            </h6>
          </div>
        )}
        <div
          className={`h-full w-10 ${
            country.isVotingFinished ? 'bg-blue-600' : 'bg-pink-500'
          }`}
        >
          <h6 className="text-white text-lg font-semibold h-full items-center flex justify-center">
            {country.points}
          </h6>
        </div>
      </div>
    </button>
  );
};

export default CountryItem;
