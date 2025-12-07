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
      case 'In stage':
        return t('inStage');
      case 'Other stage':
        return t('otherStage');
      case 'Not participating':
        return t('notParticipating');
      case 'Auto-Q':
        return t('autoQ');
      default:
        return category;
    }
  };

  return getCategoryLabel;
};
