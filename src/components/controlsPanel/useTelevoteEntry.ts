import { useTranslations } from 'next-intl';
import { ChangeEvent, useEffect, useMemo, useState } from 'react';

import {
  getMaxPossibleTelevotePoints,
  getTotalTelevotePoints,
} from '../../data/data';
import { useCountriesStore } from '../../state/countriesStore';
import { useScoreboardStore } from '../../state/scoreboardStore';

import { useConfirmation } from '@/hooks/useConfirmation';
import { useGeneralStore } from '@/state/generalStore';

const NUMBER_REGEX = /^-?\d*$/;

/**
 * Televote points given so far in the current stage against what the stage
 * can give in total, plus the most the current country may still get.
 * `televoteProgress` is `null` while the limit setting is off. Subscribes to
 * the stage's countries, so it stays fresh on its own (the minimal view's
 * progress line uses it without an entry on screen).
 */
export const useTelevoteProgress = () => {
  const shouldLimitManualTelevotePoints = useGeneralStore(
    (state) => state.settings.shouldLimitManualTelevotePoints,
  );
  const _juryPointsSystem = useGeneralStore((state) => state.pointsSystem);
  const _televotePointsSystem = useGeneralStore(
    (state) => state.televotePointsSystem,
  );
  const splitPointsSystem = useGeneralStore(
    (state) => state.settings.splitPointsSystem,
  );
  const pointsSystem = splitPointsSystem
    ? _televotePointsSystem
    : _juryPointsSystem;

  const countries = useScoreboardStore(
    (state) => state.getCurrentStage()?.countries,
  );

  // The voting country moves with the progress; read below.
  useScoreboardStore((state) => state.televotingProgress);

  const getVotingCountry = useCountriesStore((state) => state.getVotingCountry);
  const getStageVotingCountries = useCountriesStore(
    (state) => state.getStageVotingCountries,
  );

  const votingCountries = getStageVotingCountries(undefined, {
    channel: 'televote',
  });
  const votingCountryCode = getVotingCountry()?.code;

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
      votingCountryCode ?? '',
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

  return {
    televoteProgress,
    shouldLimitManualTelevotePoints,
    countries,
    votingCountryCode,
  };
};

/**
 * State and validation for entering one country's televote points by hand
 * (limits, the lowest-to-highest reveal value, the manual-entry warning).
 * Shared by the classic `TelevoteInput` and the column layout's entry.
 */
export const useTelevoteEntry = () => {
  const t = useTranslations();
  const { confirm } = useConfirmation();

  const giveTelevotePoints = useScoreboardStore(
    (state) => state.giveTelevotePoints,
  );
  const televotingProgress = useScoreboardStore(
    (state) => state.televotingProgress,
  );

  const revealTelevoteLowestToHighest = useGeneralStore(
    (state) => state.settings.revealTelevoteLowestToHighest,
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

  const {
    televoteProgress,
    shouldLimitManualTelevotePoints,
    countries,
    votingCountryCode,
  } = useTelevoteProgress();

  const [enteredPoints, setEnteredPoints] = useState('');
  const [error, setError] = useState('');
  const [disableLimit, setDisableLimit] = useState(false);
  const [disableLimitForShow, setDisableLimitForShow] = useState(false);

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
      setError(t('error.invalidInput'));

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
            ? t('simulation.maxPossibleTelevotePoints', {
                count: televoteProgress.maxPointsPerVotingCountry,
              })
            : t('simulation.maxPossibleTelevotePointsForCountry', {
                count: televoteProgress.maxPointsPerVotingCountry,
              }),
        );

        return;
      }

      // Check if the total stage limit would be exceeded
      if (
        televoteProgress.totalAwardedPoints + votingPoints >
        televoteProgress.totalAvailablePoints
      ) {
        setError(
          t('simulation.totalTelevotePointsCannotExceed', {
            count: televoteProgress.totalAvailablePoints,
          }),
        );

        return;
      }
    }

    // In reveal mode, update the current reveal points as the user types
    if (revealTelevoteLowestToHighest) {
      confirm({
        key: 'manual-televote-warning',
        title: t('simulation.confirmWarningTitle'),
        description: t('simulation.manualTelevotePointsWarning'),
        onConfirm: () => {
          setCurrentRevealTelevotePoints(votingPoints);
        },
      });

      return;
    }

    const vote = () => {
      setEnteredPoints('');
      setError('');
      setDisableLimit(false); // Reset the limit disable state after voting

      giveTelevotePoints(votingCountryCode ?? '', votingPoints);
    };

    confirm({
      key: 'manual-televote-warning',
      title: t('simulation.confirmWarningTitle'),
      description: t('simulation.manualTelevotePointsWarning'),
      onConfirm: () => {
        vote();
      },
    });
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

      if (nextCountry && nextCountry.country) {
        setCurrentRevealTelevotePoints(nextCountry.points ?? 0);
        setEnteredPoints((nextCountry.points ?? 0).toString());
      }
    }
  }, [
    revealTelevoteLowestToHighest,
    getNextLowestTelevoteCountry,
    setCurrentRevealTelevotePoints,
    televotingProgress,
  ]);

  return {
    t,
    countries,
    televotingProgress,
    televoteProgress,
    shouldLimitManualTelevotePoints,
    revealTelevoteLowestToHighest,
    currentRevealTelevotePoints,
    enteredPoints,
    error,
    disableLimit,
    setDisableLimit,
    disableLimitForShow,
    setDisableLimitForShow,
    handleInputChange,
    handleVoting,
    isVoteDisabled:
      enteredPoints === '' ||
      (error !== '' && !disableLimit && !disableLimitForShow) ||
      (revealTelevoteLowestToHighest &&
        enteredPoints === currentRevealTelevotePoints?.toString()),
  };
};
