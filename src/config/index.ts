export const years = [
  '2013',
  '2014',
  '2015',
  '2016',
  '2017',
  '2018',
  '2019',
  '2021',
  '2022',
  '2023',
  '2024',
  '2025',
] as const;

export type Year = (typeof years)[number];
