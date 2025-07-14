/* 
From https://eurovisionworld.com/eurovision/2025

Script for getting finalists odds(2016-now) from the table:
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
Finalists before 2016:

Array.from(document.querySelectorAll('.v_table_main tbody tr'))
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

const finalists: (
  | {
      name: string;
      juryPoints: number;
      televotePoints: number;
    }
  | {
      name: string;
      points: number;
    }
)[] = [
  {
    name: 'Ukraine',
    points: 280,
  },
  {
    name: 'Serbia & Montenegro',
    points: 263,
  },
  {
    name: 'Greece',
    points: 252,
  },
  {
    name: 'Turkey',
    points: 195,
  },
  {
    name: 'Cyprus',
    points: 170,
  },
  {
    name: 'Sweden',
    points: 170,
  },
  {
    name: 'Albania',
    points: 106,
  },
  {
    name: 'Germany',
    points: 93,
  },
  {
    name: 'Bosnia & Herzegovina.',
    points: 91,
  },
  {
    name: 'Spain',
    points: 87,
  },
  {
    name: 'Russia',
    points: 67,
  },
  {
    name: 'Malta',
    points: 50,
  },
  {
    name: 'Croatia',
    points: 50,
  },
  {
    name: 'North MacedoniaN.Macedonia',
    points: 47,
  },
  {
    name: 'France',
    points: 40,
  },
  {
    name: 'United KingdomUK',
    points: 29,
  },
  {
    name: 'Poland',
    points: 27,
  },
  {
    name: 'Romania',
    points: 18,
  },
  {
    name: 'Iceland',
    points: 16,
  },
  {
    name: 'Netherlands',
    points: 11,
  },
  {
    name: 'Austria',
    points: 9,
  },
  {
    name: 'Belgium',
    points: 7,
  },
  {
    name: 'Ireland',
    points: 7,
  },
  {
    name: 'Norway',
    points: 3,
  },
];

const nonFinalists: { name: string; points: number }[] = [
  {
    name: 'Estonia',
    points: 57,
  },
  {
    name: 'Israel',
    points: 57,
  },
  {
    name: 'Denmark',
    points: 56,
  },
  {
    name: 'Finland',
    points: 51,
  },
  {
    name: 'Portugal',
    points: 38,
  },
  {
    name: 'Lithuania',
    points: 26,
  },
  {
    name: 'Latvia',
    points: 23,
  },
  {
    name: 'Andorra',
    points: 12,
  },
  {
    name: 'Belarus',
    points: 10,
  },
  {
    name: 'Monaco',
    points: 10,
  },
  {
    name: 'Slovenia',
    points: 5,
  },
  {
    name: 'Switzerland',
    points: 0,
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

  const processedFinalists = finalists.map((country) => {
    if ('points' in country) {
      return {
        ...country,
        juryPoints: country.points / 2,
        televotePoints: country.points / 2,
      };
    }

    return country;
  });

  // Process Finalists
  const finalistJuryPoints = processedFinalists.map((c) => c.juryPoints);
  const minFinalistJuryPoints = Math.min(...finalistJuryPoints);
  const maxFinalistJuryPoints = Math.max(...finalistJuryPoints);

  const finalistTelevotePoints = processedFinalists.map(
    (c) => c.televotePoints,
  );
  const minFinalistTelevotePoints = Math.min(...finalistTelevotePoints);
  const maxFinalistTelevotePoints = Math.max(...finalistTelevotePoints);

  const finalistResults = processedFinalists.map((country) => {
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

    return {
      name: country.name,
      juryOdds,
      televoteOdds: juryOdds, // odds are the same for non-finalists as we don't have separate data
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
