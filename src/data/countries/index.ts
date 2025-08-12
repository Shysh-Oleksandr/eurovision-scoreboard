export { COMMON_COUNTRIES } from './common-countries';

export { COUNTRIES_2004 } from './countries-2004';
export { COUNTRIES_2005 } from './countries-2005';
export { COUNTRIES_2006 } from './countries-2006';
export { COUNTRIES_2007 } from './countries-2007';
export { COUNTRIES_2008 } from './countries-2008';
export { COUNTRIES_2009 } from './countries-2009';
export { COUNTRIES_2010 } from './countries-2010';
export { COUNTRIES_2011 } from './countries-2011';
export { COUNTRIES_2012 } from './countries-2012';
export { COUNTRIES_2013 } from './countries-2013';
export { COUNTRIES_2014 } from './countries-2014';
export { COUNTRIES_2015 } from './countries-2015';
export { COUNTRIES_2016 } from './countries-2016';
export { COUNTRIES_2017 } from './countries-2017';
export { COUNTRIES_2018 } from './countries-2018';
export { COUNTRIES_2019 } from './countries-2019';
export { COUNTRIES_2020 } from './countries-2020';
export { COUNTRIES_2021 } from './countries-2021';
export { COUNTRIES_2022 } from './countries-2022';
export { COUNTRIES_2023 } from './countries-2023';
export { COUNTRIES_2024 } from './countries-2024';
export { COUNTRIES_2025 } from './countries-2025';

// JESC
export { JUNIOR_COUNTRIES_2023 } from './junior-countries-2023';
export { JUNIOR_COUNTRIES_2024 } from './junior-countries-2024';

/*
From https://eurovisionworld.com/eurovision/2022
Script for getting countries from the table:
Array.from(document.querySelectorAll(".v_table tbody tr")).map(tr => {
  return tr.querySelectorAll("td")[1]?.querySelector("a")?.textContent.trim();
}).filter(Boolean);
*/

/* 
Script for getting GF odds from the table:
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
  
Script for getting SF odds from the table:

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

/*
From https://en.wikipedia.org/wiki/Eurovision_Song_Contest_2025#Spokespersons
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
