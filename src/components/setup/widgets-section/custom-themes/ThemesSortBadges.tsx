import { useTranslations } from 'next-intl';
import React from 'react';

import Badge from '@/components/common/Badge';

export type PublicSortKey = 'latest' | 'oldest' | 'likes' | 'saves' | 'copies';

interface ThemesSortBadgesProps {
  value: PublicSortKey;
  onChange: (key: PublicSortKey) => void;
  className?: string;
}

const ThemesSortBadges: React.FC<ThemesSortBadgesProps> = ({
  value,
  onChange,
  className,
}) => {
  const t = useTranslations('widgets.sortBadges');

  return (
    <div
      className={`flex items-center flex-wrap justify-start gap-2 ${
        className || ''
      }`}
    >
      <Badge
        label={t('latest')}
        onClick={() => onChange('latest')}
        isActive={value === 'latest'}
      />
      <Badge
        label={t('oldest')}
        onClick={() => onChange('oldest')}
        isActive={value === 'oldest'}
      />
      <Badge
        label={t('mostLiked')}
        onClick={() => onChange('likes')}
        isActive={value === 'likes'}
      />
      <Badge
        label={t('mostSaved')}
        onClick={() => onChange('saves')}
        isActive={value === 'saves'}
      />
      <Badge
        label={t('mostCopied')}
        onClick={() => onChange('copies')}
        isActive={value === 'copies'}
      />
    </div>
  );
};

export default ThemesSortBadges;
