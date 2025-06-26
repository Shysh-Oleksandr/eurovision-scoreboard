export interface UpdateItem {
  date?: string;
  title: string;
  approximateDates?: { start: string; end: string };
}

export const formatDate = (dateString: string) => {
  const date = new Date(dateString);

  return date.toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });
};

export const getDateLabel = (item: UpdateItem) => {
  if (item.date) {
    return formatDate(item.date);
  }

  if (item.approximateDates) {
    return `${formatDate(item.approximateDates.start)} - ${formatDate(
      item.approximateDates.end,
    )}`;
  }

  return '';
};
