export function getSequenceNumber(num: number) {
  if (num === 1) return '1st';

  if (num === 2) return '2nd';

  if (num === 3) return '3rd';

  return `${num}th`;
}
