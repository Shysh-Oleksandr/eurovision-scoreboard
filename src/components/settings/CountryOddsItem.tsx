import React, { useEffect, useRef, useState } from 'react';

import { useDebounceWithCancel } from '../../hooks/useDebounceWithCancel';
import { BaseCountry } from '../../models';
import { Input } from '../Input';

import { useGeneralStore } from '@/state/generalStore';
import { getHostingCountryLogo } from '@/theme/hosting';

const MAX_ODDS = 1000;
const DEBOUNCE_TIME = 400;

interface CountryOddsItemProps {
  country: BaseCountry;
  onOddsChange: (oddType: 'jury' | 'televote', value?: number) => void;
}

export const CountryOddsItem: React.FC<CountryOddsItemProps> = ({
  country,
  onOddsChange,
}) => {
  const shouldShowHeartFlagIcon = useGeneralStore(
    (state) => state.settings.shouldShowHeartFlagIcon,
  );

  const [juryOdds, setJuryOdds] = useState<number | undefined>(
    country.juryOdds ?? 50,
  );
  const [televoteOdds, setTelevoteOdds] = useState<number | undefined>(
    country.televoteOdds ?? 50,
  );

  const [debouncedJuryOdds, cancelJury] = useDebounceWithCancel(
    juryOdds,
    DEBOUNCE_TIME,
  );
  const [debouncedTelevoteOdds, cancelTelevote] = useDebounceWithCancel(
    televoteOdds,
    DEBOUNCE_TIME,
  );

  const isJuryUserInput = useRef(false);
  const isTelevoteUserInput = useRef(false);

  // Sync local state with props when they change from parent (e.g., on Reset)
  useEffect(() => {
    // If a user was typing, a debounce is scheduled.
    // The parent then does a bulk update (Reset), which updates our props.
    // We must cancel the pending debounce, or it will overwrite the prop change.
    cancelJury();
    cancelTelevote();
    setJuryOdds(country.juryOdds);
    setTelevoteOdds(country.televoteOdds);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [country.juryOdds, country.televoteOdds]);

  // Call onOddsChange only when debounced value changes from user input
  useEffect(() => {
    if (isJuryUserInput.current) {
      onOddsChange('jury', debouncedJuryOdds);
      isJuryUserInput.current = false;
    }
  }, [debouncedJuryOdds, onOddsChange]);

  useEffect(() => {
    if (isTelevoteUserInput.current) {
      onOddsChange('televote', debouncedTelevoteOdds);
      isTelevoteUserInput.current = false;
    }
  }, [debouncedTelevoteOdds, onOddsChange]);

  const handleInputChange = (
    e: React.ChangeEvent<HTMLInputElement>,
    setter: React.Dispatch<React.SetStateAction<number | undefined>>,
    isUserInputRef: React.MutableRefObject<boolean>,
  ) => {
    const { value } = e.target;

    isUserInputRef.current = true;

    if (value === '') {
      setter(undefined);

      return;
    }

    const numberValue = parseFloat(value);

    if (!isNaN(numberValue) && numberValue >= 0 && numberValue <= MAX_ODDS) {
      setter(numberValue);
    }
  };

  const { logo, isExisting } = getHostingCountryLogo(
    country,
    shouldShowHeartFlagIcon,
  );

  return (
    <div className="bg-primary-800 bg-gradient-to-tr from-[10%] from-primary-900/80 to-primary-700/50 rounded-lg p-3 text-white">
      <div className="flex items-center gap-3">
        <img
          src={logo}
          alt={country.name}
          className={`flex-none rounded-sm ${
            isExisting ? 'w-8 h-8' : 'w-8 h-6 object-cover'
          }`}
          loading="lazy"
          width={32}
          height={28}
        />
        <span className="font-semibold truncate">{country.name}</span>
      </div>
      <div className="grid grid-cols-2 gap-2 mt-2">
        <Input
          type="number"
          className="!bg-primary-700/40 !px-1 !py-1.5 text-center placeholder:!text-gray-400 focus:!bg-primary-700/60 hover:!bg-primary-700/60 bg-none"
          placeholder="Jury"
          min={0}
          max={MAX_ODDS}
          step={0.5}
          value={juryOdds ?? ''}
          onChange={(e) => handleInputChange(e, setJuryOdds, isJuryUserInput)}
        />
        <Input
          type="number"
          className="!bg-primary-900/50 !px-1 !py-1.5 text-center placeholder:!text-gray-400 focus:!bg-primary-900/80 hover:!bg-primary-900/80 bg-none"
          placeholder="Tele"
          min={0}
          max={MAX_ODDS}
          step={0.5}
          value={televoteOdds ?? ''}
          onChange={(e) =>
            handleInputChange(e, setTelevoteOdds, isTelevoteUserInput)
          }
        />
      </div>
    </div>
  );
};
