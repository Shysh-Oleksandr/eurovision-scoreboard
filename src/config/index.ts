export const years = [
  '2004',
  '2005',
  '2006',
  '2007',
  '2008',
  '2009',
  '2010',
  '2011',
  '2012',
  '2013',
  '2014',
  '2015',
  '2016',
  '2017',
  '2018',
  '2019',
  '2020',
  '2021',
  '2022',
  '2023',
  '2024',
  '2025',
] as const;

export type Year = (typeof years)[number];

// export const API_BASE_URL = (import.meta as any).env?.VITE_API_URL || 'http://localhost:8001';
export const API_BASE_URL = 'https://api.douzepoints.app';
