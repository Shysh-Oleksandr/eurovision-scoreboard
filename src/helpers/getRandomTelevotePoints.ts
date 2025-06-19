import { getAverageVotingPoints } from '../data/data';

export function getRandomTelevotePoints(
  countryJuryPlace: number,
  qualifiedCountriesLength: number,
  countriesLength: number,
) {
  const randomNumber = Math.random();

  const inFirstHalfByJury = countryJuryPlace < qualifiedCountriesLength / 2;

  const isBigNumber = randomNumber > 0.75 || inFirstHalfByJury;
  const isHugeNumber =
    randomNumber > 0.95 || (randomNumber > 0.8 && inFirstHalfByJury);
  const isSmallNumber = randomNumber < 0.2;

  const bigRandomNumber = Math.random() * (isHugeNumber ? 150 : 75);
  const bigNumberCoefficient = isBigNumber
    ? bigRandomNumber
    : randomNumber * 50;
  const smallNumberCoefficient = Math.random() * 30;

  const randomVotingPoints = Math.round(
    isSmallNumber ? smallNumberCoefficient : bigNumberCoefficient,
  );

  const points = Math.round(
    (getAverageVotingPoints(countriesLength) / 20) *
      Math.round(Math.random() * randomVotingPoints),
  );

  return points;
}
