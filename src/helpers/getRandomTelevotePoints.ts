import { AVERAGE_VOTING_POINTS, QUALIFIED_COUNTRIES } from '../data';

export function getRandomTelevotePoints(countryJuryPlace: number) {
  const randomNumber = Math.random();

  const inFirstHalfByJury = countryJuryPlace < QUALIFIED_COUNTRIES.length / 2;

  const isBigNumber = randomNumber > 0.65 || inFirstHalfByJury;
  const isHugeNumber =
    randomNumber > 0.95 || (randomNumber > 0.8 && inFirstHalfByJury);
  const isSmallNumber = randomNumber < 0.15;

  const bigRandomNumber = Math.random() * (isHugeNumber ? 150 : 75);
  const bigNumberCoefficient = isBigNumber
    ? bigRandomNumber
    : randomNumber * 60;
  const smallNumberCoefficient = Math.random() * 40;

  const randomVotingPoints = Math.round(
    isSmallNumber ? smallNumberCoefficient : bigNumberCoefficient,
  );

  const points = Math.round(
    (AVERAGE_VOTING_POINTS / 20) *
      Math.round(Math.random() * randomVotingPoints),
  );

  return points;
}
