import { useTranslations } from 'next-intl';

export const useGetCategoryLabel = () => {
  const t = useTranslations('setup.categories');

  const getCategoryLabel = (category: string) => {
    switch (category) {
      case 'Custom':
        return t('custom');
      case 'All-Time Participants':
        return t('allTimeParticipants');
      case 'Asia':
        return t('asia');
      case 'Africa':
        return t('africa');
      case 'North America':
        return t('northAmerica');
      case 'South America':
        return t('southAmerica');
      case 'Oceania':
        return t('oceania');
      case 'Rest of Europe':
        return t('restOfEurope');
      default:
        return category;
    }
  };

  return getCategoryLabel;
};
