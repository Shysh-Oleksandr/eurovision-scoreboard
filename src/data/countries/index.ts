export { COUNTRIES_2013 } from './countries-2013';
export { COUNTRIES_2014 } from './countries-2014';
export { COUNTRIES_2015 } from './countries-2015';
export { COUNTRIES_2016 } from './countries-2016';
export { COUNTRIES_2017 } from './countries-2017';
export { COUNTRIES_2018 } from './countries-2018';
export { COUNTRIES_2019 } from './countries-2019';
export { COUNTRIES_2021 } from './countries-2021';
export { COUNTRIES_2022 } from './countries-2022';
export { COUNTRIES_2023 } from './countries-2023';
export { COUNTRIES_2024 } from './countries-2024';
export { COUNTRIES_2025 } from './countries-2025';

/*
From https://eurovisionworld.com/eurovision/2022
Script for getting countries from the table:
Array.from(document.querySelectorAll(".v_table tbody tr")).map(tr => {
  return tr.querySelectorAll("td")[1]?.querySelector("a")?.textContent.trim();
}).filter(Boolean);
*/
