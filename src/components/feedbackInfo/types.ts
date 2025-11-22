export interface UpdateItem {
  date?: string;
  title: string;
  approximateDates?: { start: string; end: string };
}

export const formatDate = (dateString: string, locale: string) => {
  const date = new Date(dateString);

  return date.toLocaleDateString(locale, {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });
};

export const getDateLabel = (item: UpdateItem, locale: string) => {
  if (item.date) {
    return formatDate(item.date, locale);
  }

  if (item.approximateDates) {
    return `${formatDate(item.approximateDates.start, locale)} - ${formatDate(
      item.approximateDates.end,
      locale,
    )}`;
  }

  return '';
};
