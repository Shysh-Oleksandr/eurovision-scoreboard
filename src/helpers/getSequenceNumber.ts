export function getSequenceNumber(num: number) {
  if (num === 1) return '1st';

  if (num === 2) return '2nd';

  return `${num}th`;
}
