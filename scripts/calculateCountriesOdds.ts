/* 
From https://eurovisionworld.com/eurovision/2025

Script for getting finalists odds from the table:
Array.from(document.querySelectorAll('.v_table tbody tr'))
  .map((tr) => {
    const tds = tr.querySelectorAll('td');
    const name = tds[1]?.querySelector('a')?.textContent?.trim();
    const televoteText = tds[4]?.querySelector('div')?.textContent?.trim();
    const juryText = tds[5]?.textContent?.trim();
    
    const juryPoints = juryText ? parseInt(juryText, 10) : null;
    const televotePoints = televoteText ? parseInt(televoteText, 10) : null;

    return name && juryPoints !== null && televotePoints !== null
      ? { name, juryPoints, televotePoints }
      : null;
  })
  .filter(Boolean);

  ------------------------------------------------------------
  
Script for getting non-finalists odds from the table:

Array.from(document.querySelectorAll('.v_table.v_table_out tbody tr'))
.map((tr) => {
  const tds = tr.querySelectorAll('td');
  const name = tds[1]?.querySelector('a')?.textContent?.trim();
  const pointsText = tds[3]?.textContent?.trim();
  
  const points = pointsText ? parseInt(pointsText, 10) : null;

  return name && points !== null
    ? { name, points }
    : null;
})
.filter(Boolean);
*/

const finalists: {
  name: string;
  juryPoints: number;
  televotePoints: number;
}[] = [
  {
    name: 'Austria',
    juryPoints: 258,
    televotePoints: 178,
  },
  {
    name: 'Israel',
    juryPoints: 60,
    televotePoints: 297,
  },
  {
    name: 'Estonia',
    juryPoints: 98,
    televotePoints: 258,
  },
  {
    name: 'Sweden',
    juryPoints: 126,
    televotePoints: 195,
  },
  {
    name: 'Italy',
    juryPoints: 159,
    televotePoints: 97,
  },
  {
    name: 'Greece',
    juryPoints: 105,
    televotePoints: 126,
  },
  {
    name: 'France',
    juryPoints: 180,
    televotePoints: 50,
  },
  {
    name: 'Albania',
    juryPoints: 45,
    televotePoints: 173,
  },
  {
    name: 'Ukraine',
    juryPoints: 60,
    televotePoints: 158,
  },
  {
    name: 'Switzerland',
    juryPoints: 214,
    televotePoints: 0,
  },
  {
    name: 'Finland',
    juryPoints: 88,
    televotePoints: 108,
  },
  {
    name: 'Netherlands',
    juryPoints: 133,
    televotePoints: 42,
  },
  {
    name: 'Latvia',
    juryPoints: 116,
    televotePoints: 42,
  },
  {
    name: 'Poland',
    juryPoints: 17,
    televotePoints: 139,
  },
  {
    name: 'Germany',
    juryPoints: 77,
    televotePoints: 74,
  },
  {
    name: 'Lithuania',
    juryPoints: 34,
    televotePoints: 62,
  },
  {
    name: 'Malta',
    juryPoints: 83,
    televotePoints: 8,
  },
  {
    name: 'Norway',
    juryPoints: 22,
    televotePoints: 67,
  },
  {
    name: 'United KingdomUK',
    juryPoints: 88,
    televotePoints: 0,
  },
  {
    name: 'Armenia',
    juryPoints: 42,
    televotePoints: 30,
  },
  {
    name: 'Portugal',
    juryPoints: 37,
    televotePoints: 13,
  },
  {
    name: 'Luxembourg',
    juryPoints: 23,
    televotePoints: 24,
  },
  {
    name: 'Denmark',
    juryPoints: 45,
    televotePoints: 2,
  },
  {
    name: 'Spain',
    juryPoints: 27,
    televotePoints: 10,
  },
  {
    name: 'Iceland',
    juryPoints: 0,
    televotePoints: 33,
  },
  {
    name: 'San Marino',
    juryPoints: 9,
    televotePoints: 18,
  },
];

const nonFinalists: { name: string; points: number }[] = [
  {
    name: 'Cyprus',
    points: 44,
  },
  {
    name: 'Australia',
    points: 41,
  },
  {
    name: 'Croatia',
    points: 28,
  },
  {
    name: 'Czechia',
    points: 29,
  },
  {
    name: 'Ireland',
    points: 28,
  },
  {
    name: 'Serbia',
    points: 28,
  },
  {
    name: 'Georgia',
    points: 28,
  },
  {
    name: 'Slovenia',
    points: 23,
  },
  {
    name: 'Belgium',
    points: 23,
  },
  {
    name: 'Montenegro',
    points: 12,
  },
  {
    name: 'Azerbaijan',
    points: 7,
  },
];

function roundToHalf(n: number) {
  return Math.round(n * 2) / 2;
}

const main = () => {
  const TARGET_MIN_ODDS = 1;
  const TARGET_MAX_ODDS = 99;
  const NON_FINALIST_MAX_ODDS = 20;
  const FINALIST_MIN_ODDS = 20;

  const normalize = (
    value: number,
    min: number,
    max: number,
    targetMin: number,
    targetMax: number,
  ) => {
    if (max - min === 0) {
      return (targetMin + targetMax) / 2;
    }

    return roundToHalf(
      targetMin + ((value - min) * (targetMax - targetMin)) / (max - min),
    );
  };

  // Process Finalists
  const finalistJuryPoints = finalists.map((c) => c.juryPoints);
  const minFinalistJuryPoints = Math.min(...finalistJuryPoints);
  const maxFinalistJuryPoints = Math.max(...finalistJuryPoints);

  const finalistTelevotePoints = finalists.map((c) => c.televotePoints);
  const minFinalistTelevotePoints = Math.min(...finalistTelevotePoints);
  const maxFinalistTelevotePoints = Math.max(...finalistTelevotePoints);

  const finalistResults = finalists.map((country) => {
    const juryOdds = normalize(
      country.juryPoints,
      minFinalistJuryPoints,
      maxFinalistJuryPoints,
      FINALIST_MIN_ODDS,
      TARGET_MAX_ODDS,
    );

    const televoteOdds = normalize(
      country.televotePoints,
      minFinalistTelevotePoints,
      maxFinalistTelevotePoints,
      FINALIST_MIN_ODDS,
      TARGET_MAX_ODDS,
    );

    return {
      name: country.name,
      juryOdds,
      televoteOdds,
    };
  });

  // Process Non-Finalists
  const nonFinalistSplitPoints = nonFinalists.map((c) => c.points / 2);
  const minNonFinalistPoints = Math.min(...nonFinalistSplitPoints);
  const maxNonFinalistPoints = Math.max(...nonFinalistSplitPoints);

  const nonFinalistResults = nonFinalists.map((country) => {
    const points = country.points / 2;

    const juryOdds = normalize(
      points,
      minNonFinalistPoints,
      maxNonFinalistPoints,
      TARGET_MIN_ODDS,
      NON_FINALIST_MAX_ODDS,
    );

    const televoteOdds = normalize(
      points,
      minNonFinalistPoints,
      maxNonFinalistPoints,
      TARGET_MIN_ODDS,
      NON_FINALIST_MAX_ODDS,
    );

    return {
      name: country.name,
      juryOdds,
      televoteOdds,
    };
  });

  const allCountriesWithOdds = [...finalistResults, ...nonFinalistResults];

  allCountriesWithOdds.sort(
    (a, b) => b.juryOdds + b.televoteOdds - (a.juryOdds + a.televoteOdds),
  );

  // eslint-disable-next-line no-console
  console.log(JSON.stringify(allCountriesWithOdds, null, 2));
};

main();
