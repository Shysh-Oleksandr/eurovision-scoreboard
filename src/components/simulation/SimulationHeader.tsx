import React from 'react';

import { useCountriesStore } from '../../state/countriesStore';
import { useGeneralStore } from '../../state/generalStore';
import { getHostingCountryLogoForYear } from '../../theme/themes';
import Button from '../Button';

interface SimulationHeaderProps {
  phaseTitle: string;
}

export const SimulationHeader = ({ phaseTitle }: SimulationHeaderProps) => {
  const { year } = useGeneralStore();
  const { setEventSetupModalOpen } = useCountriesStore();

  return (
    <div className="flex justify-between items-center mb-4">
      <div className="flex items-center gap-2">
        <img
          src={getHostingCountryLogoForYear(year)}
          alt="Hosting country logo"
          className="w-10 h-10"
          width={40}
          height={40}
        />
        <h2 className="sm:text-xl text-lg font-bold text-white">
          {phaseTitle}
        </h2>
      </div>

      <div className="flex gap-2">
        <Button
          label="Start over"
          onClick={() => setEventSetupModalOpen(true)}
        />
      </div>
    </div>
  );
};
