import React, {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import { Flipped, Flipper } from 'react-flip-toolkit';

import { animated, useSpring } from '@react-spring/web';

import { ANIMATION_DURATION, POINTS_ARRAY } from '../../data/data';
import { useReorderCountries } from '../../hooks/useReorderCountries';
import { Country } from '../../models';
import { useCountriesStore } from '../../state/countriesStore';
import { useScoreboardStore } from '../../state/scoreboardStore';

import BoardHeader from './BoardHeader';
import CountryItem from './CountryItem';

const MAX_COUNTRY_WITH_POINTS = POINTS_ARRAY.length;

const Board = (): JSX.Element => {
  const {
    countries,
    winnerCountry,
    shouldShowLastPoints,
    qualifiedCountries,
    resetLastPoints,
    giveJuryPoints,
    eventPhase,
    restartCounter,
    showAllParticipants,
    setCanDisplayPlaceAnimation,
  } = useScoreboardStore();

  const [showPlace, setShowPlace] = useState(false);
  const isVotingOver = !!winnerCountry || qualifiedCountries.length > 0;

  const timerId = useRef<NodeJS.Timeout | null>(null);
  const { getVotingCountry, selectedCountries, getSemiFinalPoints } =
    useCountriesStore();

  // Get all countries to display when showAllParticipants is true
  // TODO: move outside
  const allCountriesToDisplay = useMemo(() => {
    if (!showAllParticipants || !winnerCountry) {
      return countries;
    }

    const allEventParticipants = selectedCountries.map((country) => {
      // Find if this country already has points from the current voting
      const existingCountry = countries.find((c) => c.code === country.code);

      return {
        ...country,
        points: existingCountry?.points ?? -1,
        lastReceivedPoints: existingCountry?.lastReceivedPoints ?? 0,
        isVotingFinished: existingCountry?.isVotingFinished ?? true,
      };
    });

    return allEventParticipants;
  }, [countries, showAllParticipants, winnerCountry, selectedCountries]);

  const sortedCountries = useMemo(() => {
    const countriesToSort = [...allCountriesToDisplay];

    if (showAllParticipants && winnerCountry) {
      // When showing all participants, sort grand-finalists by grand final points
      // and non-qualifiers by their semi-final points
      return countriesToSort.sort((a, b) => {
        // If both countries have grand final points, sort by grand final points
        if (a.points >= 0 && b.points >= 0) {
          return b.points - a.points;
        }

        // If one has grand final points and the other doesn't, grand finalist comes first
        if (a.points >= 0 && b.points === -1) {
          return -1;
        }
        if (a.points === -1 && b.points >= 0) {
          return 1;
        }

        // If both are non-qualifiers, sort by semi-final points
        const aSemiPoints = getSemiFinalPoints(a.code);
        const bSemiPoints = getSemiFinalPoints(b.code);

        const pointsComparison = bSemiPoints - aSemiPoints;

        return pointsComparison !== 0
          ? pointsComparison
          : a.name.localeCompare(b.name);
      });
    }

    // Default sorting by points
    return countriesToSort.sort((a, b) => {
      const pointsComparison = b.points - a.points;

      return pointsComparison !== 0
        ? pointsComparison
        : a.name.localeCompare(b.name);
    });
  }, [
    allCountriesToDisplay,
    showAllParticipants,
    winnerCountry,
    getSemiFinalPoints,
  ]);

  const [displayOrder, setDisplayOrder] = useState<string[]>(
    sortedCountries.map((c) => c.code),
  );
  const timeoutRef = useRef<NodeJS.Timeout>();

  const countriesToRender = useMemo(() => {
    // Preserve the display order while mapping to the latest country data
    const countryMap = new Map(allCountriesToDisplay.map((c) => [c.code, c]));

    return displayOrder
      .map((code) => countryMap.get(code))
      .filter((c): c is Country => !!c);
  }, [displayOrder, allCountriesToDisplay]);

  const reorderedCountries = useReorderCountries(countriesToRender);

  const countriesWithPointsLength = useMemo(
    () =>
      countries.filter((country) => country.lastReceivedPoints !== null).length,
    [countries],
  );
  const wasTheFirstPointsAwarded = useMemo(
    () => countries.some((country) => country.points > 0),
    [countries],
  );

  const votingCountry = getVotingCountry();
  const hasCountryFinishedVoting = useMemo(
    () => countriesWithPointsLength === MAX_COUNTRY_WITH_POINTS,
    [countriesWithPointsLength],
  );

  const flipMoveDelay = useMemo(() => {
    if (!wasTheFirstPointsAwarded || isVotingOver) return 0;

    return hasCountryFinishedVoting ? 1000 : 500;
  }, [hasCountryFinishedVoting, wasTheFirstPointsAwarded, isVotingOver]);

  const handleResetPoints = useCallback(() => {
    if (timerId.current) {
      clearTimeout(timerId.current);
      timerId.current = null;
    }

    resetLastPoints();
  }, [resetLastPoints]);

  const onClick = useCallback(
    (countryCode: string) => {
      if (countriesWithPointsLength >= MAX_COUNTRY_WITH_POINTS) {
        handleResetPoints();
      }

      if (countriesWithPointsLength === MAX_COUNTRY_WITH_POINTS - 1) {
        timerId.current = setTimeout(handleResetPoints, ANIMATION_DURATION);
      }

      giveJuryPoints(countryCode);
    },
    [countriesWithPointsLength, giveJuryPoints, handleResetPoints],
  );

  const renderItem = useCallback(
    (country: Country) => (
      <Flipped key={country.code} flipId={country.code}>
        {(props) => (
          <CountryItem
            country={country}
            votingCountryCode={votingCountry?.code}
            onClick={onClick}
            index={sortedCountries.findIndex((c) => c.code === country.code)}
            {...props}
            showPlaceAnimation={showPlace}
          />
        )}
      </Flipped>
    ),
    [votingCountry?.code, onClick, showPlace, sortedCountries],
  );

  useEffect(() => {
    if (!shouldShowLastPoints && timerId.current) {
      clearTimeout(timerId.current);
      timerId.current = null;
    }
  }, [shouldShowLastPoints]);

  const [finalCountries, setFinalCountries] = useState<Country[]>([]);

  const flipKey = useMemo(
    () => `${finalCountries.map((c) => c.code).join(',')}-${isVotingOver}`,
    [finalCountries, isVotingOver],
  );

  useEffect(() => {
    timeoutRef.current = setTimeout(() => {
      const newOrder = sortedCountries.map((c) => c.code);

      if (
        newOrder.length !== displayOrder.length ||
        newOrder.some((code, i) => code !== displayOrder[i])
      ) {
        setDisplayOrder(newOrder);
      }
    }, flipMoveDelay);

    return () => {
      clearTimeout(timeoutRef.current);
    };
  }, [sortedCountries, flipMoveDelay, displayOrder]);

  useEffect(() => {
    setFinalCountries(reorderedCountries);
  }, [reorderedCountries]);

  useEffect(() => {
    if (isVotingOver) {
      const timer = setTimeout(() => {
        setShowPlace(true);
      }, 3050);

      return () => clearTimeout(timer);
    }
    if (!winnerCountry) {
      setShowPlace(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isVotingOver]);

  useEffect(() => {
    if (winnerCountry) {
      setTimeout(() => {
        setCanDisplayPlaceAnimation(false);
      }, 4050);
    }
  }, [setCanDisplayPlaceAnimation, winnerCountry]);

  const [containerAnimation, api] = useSpring(() => ({
    from: { opacity: 0, transform: 'translateY(15px)' },
    config: { duration: 350 },
  }));

  useEffect(() => {
    api.start({
      to: { opacity: 1, transform: 'translateY(0px)' },
      from: { opacity: 0, transform: 'translateY(15px)' },
    });
  }, [api, eventPhase, restartCounter, showAllParticipants]);

  return (
    <div className={`${isVotingOver ? '' : 'md:w-2/3'} w-full h-full`}>
      <BoardHeader onClick={onClick} />
      <animated.div
        style={containerAnimation}
        className={`container-wrapping-flipper ${
          showAllParticipants ? 'show-all-participants' : ''
        }`}
      >
        <Flipper
          key={`${eventPhase}-${restartCounter}-${showAllParticipants}`}
          flipKey={flipKey}
          spring={{ damping: 5, stiffness: 25, overshootClamping: true }}
        >
          {finalCountries.map(renderItem)}
        </Flipper>
      </animated.div>
    </div>
  );
};

export default React.memo(Board);
