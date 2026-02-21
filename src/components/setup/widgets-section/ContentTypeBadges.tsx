import { useTranslations } from 'next-intl';
import React from 'react';

import type { UserContentType } from '@/api/userContent';
import { ThemeIcon } from '@/assets/icons/ThemeIcon';
import { TrophyIcon } from '@/assets/icons/TrophyIcon';
import Badge from '@/components/common/Badge';

export const CONTENT_TYPE_OPTIONS: {
  id: UserContentType;
  labelKey: string;
  Icon?: React.ReactNode;
}[] = [
  { id: 'all', labelKey: 'widgets.contentType.all' },
  {
    id: 'themes',
    labelKey: 'widgets.contentType.themes',
    Icon: <ThemeIcon className="w-4 h-4 flex-none" />,
  },
  {
    id: 'contests',
    labelKey: 'widgets.contentType.contests',
    Icon: <TrophyIcon className="w-4 h-4 flex-none" />,
  },
];

interface ContentTypeBadgesProps {
  value: UserContentType;
  onChange: (type: UserContentType) => void;
  options?: { id: UserContentType; labelKey: string; Icon?: React.ReactNode }[];
  className?: string;
}

const ContentTypeBadges: React.FC<ContentTypeBadgesProps> = ({
  value,
  onChange,
  options = CONTENT_TYPE_OPTIONS,
  className = '',
}) => {
  const t = useTranslations();

  return (
    <div className={`flex flex-wrap items-center gap-2 ${className}`}>
      {options.map((opt) => (
        <Badge
          key={opt.id}
          label={t(opt.labelKey)}
          onClick={() => onChange(opt.id)}
          isActive={value === opt.id}
          Icon={opt.Icon}
        />
      ))}
    </div>
  );
};

export default ContentTypeBadges;
