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

------------------------------------------------------------
Script for getting Junior countries odds from the table(https://eurovisionworld.com/junior-eurovision/2024):

Array.from(document.querySelectorAll('.national_table tbody tr'))
  .map((tr) => {
    const tds = tr.querySelectorAll('td');
    const name = tds[1]?.querySelector('a')?.textContent?.trim();
    const televoteText = tds[4]?.querySelector('a')?.textContent?.trim();
    const juryText = tds[5]?.querySelector('a')?.textContent?.trim();
    
    const juryPoints = juryText ? parseInt(juryText, 10) : null;
    const televotePoints = televoteText ? parseInt(televoteText, 10) : null;

    return name && juryPoints !== null && televotePoints !== null
      ? { name, juryPoints, televotePoints }
      : null;
  })
  .filter(Boolean);

*/

const IS_JESC = true;

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
    "name": "Georgia",
    "juryPoints": 180,
    "televotePoints": 59
  },
  {
    "name": "Portugal",
    "juryPoints": 96,
    "televotePoints": 117
  },
  {
    "name": "Ukraine",
    "juryPoints": 122,
    "televotePoints": 81
  },
  {
    "name": "France",
    "juryPoints": 103,
    "televotePoints": 74
  },
  {
    "name": "Malta",
    "juryPoints": 74,
    "televotePoints": 79
  },
  {
    "name": "Spain",
    "juryPoints": 80,
    "televotePoints": 64
  },
  {
    "name": "Albania",
    "juryPoints": 82,
    "televotePoints": 44
  },
  {
    "name": "Armenia",
    "juryPoints": 76,
    "televotePoints": 49
  },
  {
    "name": "Italy",
    "juryPoints": 52,
    "televotePoints": 46
  },
  {
    "name": "Netherlands",
    "juryPoints": 34,
    "televotePoints": 57
  },
  {
    "name": "Germany",
    "juryPoints": 14,
    "televotePoints": 57
  },
  {
    "name": "Poland",
    "juryPoints": 13,
    "televotePoints": 48
  },
  {
    "name": "Cyprus",
    "juryPoints": 10,
    "televotePoints": 50
  },
  {
    "name": "Estonia",
    "juryPoints": 14,
    "televotePoints": 41
  },
  {
    "name": "Ireland",
    "juryPoints": 15,
    "televotePoints": 40
  },
  {
    "name": "North MacedoniaN.Macedonia",
    "juryPoints": 20,
    "televotePoints": 34
  },
  {
    "name": "San Marino",
    "juryPoints": 1,
    "televotePoints": 46
  }
]

const nonFinalists: { name: string; points: number }[] = IS_JESC ? [] : [
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
  const FINALIST_MIN_ODDS = IS_JESC ? 5 : 20;

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
