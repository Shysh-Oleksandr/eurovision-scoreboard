export const toFixedIfDecimal = (value: number | string) => {
  if (typeof value === 'string') {
    value = parseFloat(value);
  }

  if (isNaN(value)) return '0';
  if (value % 1 === 0) return value.toFixed(0);

  return value.toFixed(2);
};

export const toFixedIfDecimalFloat = (value: number): number => {
  return parseFloat(toFixedIfDecimal(value));
};
