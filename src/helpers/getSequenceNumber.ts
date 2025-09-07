export function getSequenceNumber(num: number) {
const endsWithSt = num % 10 === 1 && num !== 11;
const endsWithNd = num % 10 === 2 && num !== 12;
const endsWithRd = num % 10 === 3 && num !== 13;

  if (endsWithSt) return `${num}st`;

  if (endsWithNd) return `${num}nd`;

  if (endsWithRd) return `${num}rd`;

  return `${num}th`;
}
