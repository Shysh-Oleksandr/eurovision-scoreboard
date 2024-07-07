export const years = ['2023', '2024'] as const;

export type Year = (typeof years)[number];
