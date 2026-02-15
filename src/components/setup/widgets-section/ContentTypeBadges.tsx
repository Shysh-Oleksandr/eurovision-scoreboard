import { useTranslations } from 'next-intl';
import React from 'react';

import type { UserContentType } from '@/api/userContent';
import Badge from '@/components/common/Badge';

export const CONTENT_TYPE_OPTIONS: { id: UserContentType; labelKey: string }[] =
  [
    { id: 'all', labelKey: 'widgets.contentType.all' },
    { id: 'themes', labelKey: 'widgets.contentType.themes' },
    { id: 'contests', labelKey: 'widgets.contentType.contests' },
  ];

interface ContentTypeBadgesProps {
  value: UserContentType;
  onChange: (type: UserContentType) => void;
  options?: { id: UserContentType; labelKey: string }[];
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
        />
      ))}
    </div>
  );
};

export default ContentTypeBadges;
