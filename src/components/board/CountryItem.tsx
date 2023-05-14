import React from 'react';

import { Country } from '../../models';

type Props = {
  country: Country;
};

const CountryItem = ({ country }: Props) => {
  return (
    <div className="flex justify-between bg-white mb-[6px] h-10 w-full">
      <div className="flex items-center">
        <img
          src={country.flag}
          alt={`${country.name} flag`}
          className="w-14 h-10"
        />
        <h4 className="uppercase ml-1 font-bold text-lg">{country.name}</h4>
      </div>
      <div className="bg-pink-500 h-full w-10">
        <h6 className="text-white text-lg font-semibold h-full items-center flex justify-center">
          0
        </h6>
      </div>
    </div>
  );
};

export default CountryItem;
