import React, { ChangeEvent, useState, useMemo, useEffect } from 'react';

import {
  getMaxPossibleTelevotePoints,
  getTotalTelevotePoints,
} from '../../data/data';
import { getSequenceNumber } from '../../helpers/getSequenceNumber';
import { useCountriesStore } from '../../state/countriesStore';
import { useScoreboardStore } from '../../state/scoreboardStore';
import Button from '../common/Button';
import { Checkbox } from '../common/Checkbox';
import { Input } from '../Input';

import { useGeneralStore } from '@/state/generalStore';

const NUMBER_REGEX = /^\d*$/;

const TelevoteInput = () => {
  const giveTelevotePoints = useScoreboardStore(
    (state) => state.giveTelevotePoints,
  );
  const getCurrentStage = useScoreboardStore((state) => state.getCurrentStage);
  const televotingProgress = useScoreboardStore(
    (state) => state.televotingProgress,
  );
  const shouldShowManualTelevoteWarning = useGeneralStore(
    (state) => state.settings.shouldShowManualTelevoteWarning,
  );
  const shouldLimitManualTelevotePoints = useGeneralStore(
    (state) => state.settings.shouldLimitManualTelevotePoints,
  );
  const revealTelevoteLowestToHighest = useGeneralStore(
    (state) => state.settings.revealTelevoteLowestToHighest,
  );
  const pointsSystem = useGeneralStore((state) => state.pointsSystem);

  const hasShownManualTelevoteWarning = useScoreboardStore(
    (state) => state.hasShownManualTelevoteWarning,
  );
  const setHasShownManualTelevoteWarning = useScoreboardStore(
    (state) => state.setHasShownManualTelevoteWarning,
  );
  const currentRevealTelevotePoints = useScoreboardStore(
    (state) => state.currentRevealTelevotePoints,
  );
  const setCurrentRevealTelevotePoints = useScoreboardStore(
    (state) => state.setCurrentRevealTelevotePoints,
  );
  const getNextLowestTelevoteCountry = useScoreboardStore(
    (state) => state.getNextLowestTelevoteCountry,
  );

  const getVotingCountry = useCountriesStore((state) => state.getVotingCountry);
  const getStageVotingCountries = useCountriesStore(
    (state) => state.getStageVotingCountries,
  );

  const { countries } = getCurrentStage();
  const votingCountries = getStageVotingCountries();

  const [enteredPoints, setEnteredPoints] = useState('');
  const [error, setError] = useState('');
  const [disableLimit, setDisableLimit] = useState(false);
  const [disableLimitForShow, setDisableLimitForShow] = useState(false);

  const votingCountryCode = getVotingCountry().code;

  // Calculate televote points progress and limits
  const televoteProgress = useMemo(() => {
    if (!shouldLimitManualTelevotePoints) {
      return null;
    }

    if (!countries) return null;

    // Calculate total points already awarded in this stage
    const totalAwardedPoints = countries.reduce(
      (sum, country) => sum + country.televotePoints,
      0,
    );

    // Calculate total available points for this stage
    const totalAvailablePoints = getTotalTelevotePoints(
      votingCountries.length,
      pointsSystem,
    );

    const maxPointsPerVotingCountry = getMaxPossibleTelevotePoints(
      votingCountries,
      votingCountryCode,
      pointsSystem,
    );

    return {
      totalAwardedPoints,
      totalAvailablePoints,
      progressPercentage: (totalAwardedPoints / totalAvailablePoints) * 100,
      maxPointsPerVotingCountry,
    };
  }, [
    shouldLimitManualTelevotePoints,
    countries,
    votingCountries,
    pointsSystem,
    votingCountryCode,
  ]);

  const handleInputChange = (e: ChangeEvent<HTMLInputElement>) => {
    const inputValue = e.target.value;

    // Only allow whole numbers
    if (NUMBER_REGEX.test(inputValue)) {
      setError('');
      setEnteredPoints(inputValue);
    }
  };

  const handleVoting = () => {
    const votingPoints = parseInt(enteredPoints);

    if (isNaN(votingPoints)) {
      setError('Invalid input');

      return;
    }

    // Validate points if limiting is enabled and limit is not disabled
    if (
      shouldLimitManualTelevotePoints &&
      televoteProgress &&
      !disableLimit &&
      !disableLimitForShow
    ) {
      // Check if the current voting country would exceed their individual limit
      if (votingPoints > televoteProgress.maxPointsPerVotingCountry) {
        setError(
          revealTelevoteLowestToHighest
            ? `The maximum possible number of points is ${televoteProgress.maxPointsPerVotingCountry}`
            : `The maximum number of points for this country is ${televoteProgress.maxPointsPerVotingCountry}`,
        );

        return;
      }

      // Check if the total stage limit would be exceeded
      if (
        televoteProgress.totalAwardedPoints + votingPoints >
        televoteProgress.totalAvailablePoints
      ) {
        setError(
          `Total televote points cannot exceed ${televoteProgress.totalAvailablePoints}`,
        );

        return;
      }
    }

    // In reveal mode, update the current reveal points as the user types
    if (revealTelevoteLowestToHighest) {
      if (hasShownManualTelevoteWarning || !shouldShowManualTelevoteWarning) {
        setCurrentRevealTelevotePoints(votingPoints);

        return;
      }

      const confirmation = window.confirm(
        "Note: Manually adjusting televote points won't be reflected in the detailed stats. Are you sure you want to continue?",
      );

      if (confirmation) {
        setHasShownManualTelevoteWarning(true);
        setCurrentRevealTelevotePoints(votingPoints);
      }

      return;
    }

    const vote = () => {
      setEnteredPoints('');
      setError('');
      setDisableLimit(false); // Reset the limit disable state after voting

      giveTelevotePoints(votingCountryCode, votingPoints);
    };

    if (hasShownManualTelevoteWarning || !shouldShowManualTelevoteWarning) {
      vote();

      return;
    }

    const confirmation = window.confirm(
      "Note: Manually assigning televote points won't be reflected in the detailed stats. Are you sure you want to continue?",
    );

    if (confirmation) {
      setHasShownManualTelevoteWarning(true);
      vote();
    }
  };

  useEffect(() => {
    if (televotingProgress === 0) {
      setDisableLimit(false);
      setDisableLimitForShow(false);
      setError('');
      setEnteredPoints('');
    }
  }, [televotingProgress]);

  useEffect(() => {
    if (revealTelevoteLowestToHighest) {
      const nextCountry = getNextLowestTelevoteCountry();

      if (nextCountry) {
        setCurrentRevealTelevotePoints(nextCountry.points);
        setEnteredPoints(nextCountry.points.toString());
      }
    }
  }, [
    revealTelevoteLowestToHighest,
    getNextLowestTelevoteCountry,
    setCurrentRevealTelevotePoints,
    televotingProgress,
  ]);

  return (
    <div className="w-full pb-1 lg:pt-3 pt-2 lg:px-4 px-3 rounded-md rounded-b-none">
      <label
        className="lg:text-[1.35rem] text-lg text-white"
        htmlFor="televoteInput"
      >
        Enter televote points
      </label>

      <h5 className="uppercase text-white/50 lg:text-sm text-xs mt-2 mb-1">
        <span className="font-medium">
          {getSequenceNumber(televotingProgress + 1)}
        </span>{' '}
        of <span className="font-medium">{countries.length}</span> countries
      </h5>

      {/* Progress bar for televote points when limiting is enabled */}
      {shouldLimitManualTelevotePoints && televoteProgress && (
        <div className="mt-3">
          <div className="w-full bg-primary-900 rounded-full h-2">
            <div
              className={`h-2 rounded-full transition-all duration-300 ${
                disableLimit || disableLimitForShow
                  ? 'bg-gradient-to-r from-yellow-500 to-orange-500'
                  : 'bg-gradient-to-r from-primary-800 to-primary-700'
              }`}
              style={{
                width: `${Math.min(televoteProgress.progressPercentage, 100)}%`,
              }}
            />
          </div>
          <div className="flex justify-between text-xs gap-1 text-white/50 mt-1">
            <span>
              Awarded: {televoteProgress.totalAwardedPoints} /{' '}
              {televoteProgress.totalAvailablePoints}
            </span>
            {(disableLimit || disableLimitForShow) && (
              <span className="text-yellow-400 text-right">
                ⚠️ Limit disabled
              </span>
            )}
          </div>
        </div>
      )}

      <div className="flex">
        <Input
          className="w-full lg:!pt-3 md:!pt-2 !pt-1 lg:!pb-2 md:!pb-1 !pb-[2px] !px-2 !mt-2 lg:text-base text-sm"
          name="televoteInput"
          id="televoteInput"
          type="number"
          placeholder="Enter points..."
          value={enteredPoints}
          onChange={handleInputChange}
        />
        <Button
          label={revealTelevoteLowestToHighest ? 'Save' : 'Vote'}
          onClick={handleVoting}
          className="mt-2 ml-2 md:px-4 !px-6"
          disabled={
            enteredPoints === '' ||
            (error !== '' && !disableLimit && !disableLimitForShow) ||
            (revealTelevoteLowestToHighest &&
              enteredPoints === currentRevealTelevotePoints?.toString())
          }
        />
      </div>
      {error !== '' && (
        <div className="lg:ml-2 ml-1 lg:pt-2 pt-1">
          <h5 className="text-countryItem-douzePointsBlock2 lg:text-[0.95rem] text-sm">
            {error}
          </h5>
          {shouldLimitManualTelevotePoints && televoteProgress && (
            <div className="mt-1 space-y-1 text-white">
              <Checkbox
                id="disableLimit"
                label="Disable limit for this vote"
                checked={disableLimit}
                onChange={(e) => setDisableLimit(e.target.checked)}
                labelClassName="!p-0 !px-1 [&>span]:!text-sm"
              />
              <Checkbox
                id="disableLimitForShow"
                label="Disable limit for this show"
                checked={disableLimitForShow}
                onChange={(e) => setDisableLimitForShow(e.target.checked)}
                labelClassName="!p-0 !px-1 [&>span]:!text-sm"
              />
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default TelevoteInput;
