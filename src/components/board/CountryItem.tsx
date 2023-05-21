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
      className={`flex justify-between shadow-md lg:mb-[6px] mb-1 lg:h-10 md:h-9 h-8 w-full ${
        isDisabled
          ? ''
          : 'cursor-pointer transition-all duration-300 hover:bg-sky-100'
      } ${country.isVotingFinished ? 'bg-blue-900' : 'bg-white'} ${
        isActive
          ? 'outline outline-2 outline-blue-500 rounded-sm !bg-blue-700'
          : ''
      }`}
      disabled={isDisabled}
      onClick={() => onClick(country.code)}
    >
      <div className="flex items-center">
        <img
          src={country.flag}
          alt={`${country.name} flag`}
          className="lg:w-14 md:w-12 w-10 lg:h-10 md:h-9 h-8 bg-white"
        />
        <h4
          className={`uppercase text-left ml-1 font-bold lg:text-lg sm:text-base md:leading-4 text-[13px] ${
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
          <div className="bg-yellow-300 h-full lg:w-10 md:w-9 w-8">
            <h6 className="text-pink-500 lg:text-lg sm:text-base text-[13px] font-semibold h-full items-center flex justify-center">
              {country.lastReceivedPoints}
            </h6>
          </div>
        )}
        <div
          className={`h-full lg:w-10 md:w-9 w-8 ${
            country.isVotingFinished ? 'bg-blue-600' : 'bg-pink-500'
          }`}
        >
          <h6 className="text-white lg:text-lg sm:text-base text-[13px] font-semibold h-full items-center flex justify-center">
            {country.points}
          </h6>
        </div>
      </div>
    </button>
  );
};

export default CountryItem;
