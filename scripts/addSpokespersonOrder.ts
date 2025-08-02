/* 
From https://en.wikipedia.org/wiki/Eurovision_Song_Contest_2024#Spokespersons

Script for getting spokesperson order from the list:
Array.from(document.querySelectorAll(".div-col ol li")).map((item, index) => {
  const text = item.textContent.trim();
  const name = text.split("–")[0].trim(); // get the part before the en dash
  return {
    name,
    order: index
  };
});
*/

const { COUNTRIES_2024 } = require('../src/data/countries/countries-2024');

const spokespersons: { name: string; order: number }[] = [
  {
    name: 'Ukraine',
    order: 0,
  },
  {
    name: 'United Kingdom',
    order: 1,
  },
  {
    name: 'Luxembourg',
    order: 2,
  },
  {
    name: 'Azerbaijan',
    order: 3,
  },
  {
    name: 'San Marino',
    order: 4,
  },
  {
    name: 'Malta',
    order: 5,
  },
  {
    name: 'Croatia',
    order: 6,
  },
  {
    name: 'Albania',
    order: 7,
  },
  {
    name: 'Czechia',
    order: 8,
  },
  {
    name: 'Israel',
    order: 9,
  },
  {
    name: 'Australia',
    order: 10,
  },
  {
    name: 'Denmark',
    order: 11,
  },
  {
    name: 'Spain',
    order: 12,
  },
  {
    name: 'Norway',
    order: 13,
  },
  {
    name: 'Germany',
    order: 14,
  },
  {
    name: 'Armenia',
    order: 15,
  },
  {
    name: 'Slovenia',
    order: 16,
  },
  {
    name: 'Georgia',
    order: 17,
  },
  {
    name: 'Switzerland',
    order: 18,
  },
  {
    name: 'Moldova',
    order: 19,
  },
  {
    name: 'Greece',
    order: 20,
  },
  {
    name: 'Estonia',
    order: 21,
  },
  {
    name: 'Netherlands',
    order: 22,
  },
  {
    name: 'Austria',
    order: 23,
  },
  {
    name: 'France',
    order: 24,
  },
  {
    name: 'Italy',
    order: 25,
  },
  {
    name: 'Finland',
    order: 26,
  },
  {
    name: 'Portugal',
    order: 27,
  },
  {
    name: 'Belgium',
    order: 28,
  },
  {
    name: 'Iceland',
    order: 29,
  },
  {
    name: 'Latvia',
    order: 30,
  },
  {
    name: 'Ireland',
    order: 31,
  },
  {
    name: 'Poland',
    order: 32,
  },
  {
    name: 'Cyprus',
    order: 33,
  },
  {
    name: 'Lithuania',
    order: 34,
  },
  {
    name: 'Serbia',
    order: 35,
  },
  {
    name: 'Sweden',
    order: 36,
  },
];

const main = () => {
  function applySpokespersonOrder(
    data: any[],
    orders: { name: string; order: number }[],
  ) {
    const orderMap = new Map(orders.map(({ name, order }) => [name, order]));

    return data.map((item) => ({
      ...item,
      spokespersonOrder: orderMap.get(item.name) ?? null,
    }));
  }

  const countriesWithSpokespersonOrder = applySpokespersonOrder(
    COUNTRIES_2024,
    spokespersons,
  );

  // Output in the exact format needed for the TypeScript file
  console.log('// Copy this into your countries-2024.ts file:');
  console.log('');

  countriesWithSpokespersonOrder.forEach((country) => {
    const properties = [
      `...COMMON_COUNTRIES.${country.name.replace(/\s+/g, '')}`,
      `isQualified: ${country.isQualified}`,
    ];

    if (country.isAutoQualified) {
      properties.push(`isAutoQualified: true`);
    }

    if (country.semiFinalGroup) {
      properties.push(`semiFinalGroup: '${country.semiFinalGroup}'`);
    }

    if (country.juryOdds !== undefined) {
      properties.push(`juryOdds: ${country.juryOdds}`);
    }

    if (country.televoteOdds !== undefined) {
      properties.push(`televoteOdds: ${country.televoteOdds}`);
    }

    if (country.spokespersonOrder !== null) {
      properties.push(`spokespersonOrder: ${country.spokespersonOrder}`);
    }

    console.log(`  {
    ${properties.join(',\n    ')},
  },`);
  });
};

main();
