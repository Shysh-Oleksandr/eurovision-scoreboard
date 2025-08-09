import React from 'react';

import { useGeneralStore } from '../../state/generalStore';
import { Input } from '../Input';

import { HostingCountrySelect } from './HostingCountrySelect';

export const ContestSettings: React.FC = () => {
  const settings = useGeneralStore((state) => state.settings);
  const setSettings = useGeneralStore((state) => state.setSettings);

  return (
    <>
      <div className="flex flex-col gap-1">
        <label
          htmlFor="contestName"
          className="text-white sm:text-base text-sm"
        >
          Name
        </label>
        <Input
          id="contestName"
          type="text"
          className="h-12 lg:text-[0.95rem] text-sm"
          placeholder="Enter contest name..."
          value={settings.contestName}
          onChange={(e) => setSettings({ contestName: e.target.value })}
        />
      </div>
      <div className="flex flex-col gap-1">
        <label
          htmlFor="contestYear"
          className="text-white sm:text-base text-sm"
        >
          Year
        </label>
        <Input
          id="contestYear"
          type="number"
          className="h-12 lg:text-[0.95rem] text-sm pr-3"
          placeholder="Enter contest year..."
          value={settings.contestYear}
          onChange={(e) => setSettings({ contestYear: e.target.value })}
        />
      </div>
      <HostingCountrySelect />
    </>
  );
};
