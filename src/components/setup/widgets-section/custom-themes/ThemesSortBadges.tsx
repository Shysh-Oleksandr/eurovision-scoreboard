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
  return (
    <div
      className={`flex items-center flex-wrap justify-start gap-2 ${
        className || ''
      }`}
    >
      <Badge
        label="Latest"
        onClick={() => onChange('latest')}
        isActive={value === 'latest'}
      />
      <Badge
        label="Oldest"
        onClick={() => onChange('oldest')}
        isActive={value === 'oldest'}
      />
      <Badge
        label="Most Liked"
        onClick={() => onChange('likes')}
        isActive={value === 'likes'}
      />
      <Badge
        label="Most Saved"
        onClick={() => onChange('saves')}
        isActive={value === 'saves'}
      />
      <Badge
        label="Most Copied"
        onClick={() => onChange('copies')}
        isActive={value === 'copies'}
      />
    </div>
  );
};

export default ThemesSortBadges;
