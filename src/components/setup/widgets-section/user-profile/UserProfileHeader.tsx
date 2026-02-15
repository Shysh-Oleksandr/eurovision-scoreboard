import { useLocale, useTranslations } from 'next-intl';
import React from 'react';

import Image from 'next/image';

import { getHostingCountryLogo } from '@/theme/hosting';
import type { ThemeCreator } from '@/types/customTheme';

interface UserProfileHeaderProps {
  user: ThemeCreator;
  additionalContent?: React.ReactNode;
}

const UserProfileHeader: React.FC<UserProfileHeaderProps> = ({
  user,
  additionalContent,
}) => {
  const t = useTranslations('widgets.profile');
  const locale = useLocale();
  const { logo, isExisting } = getHostingCountryLogo(user?.country || 'WW');

  const joinedOn = user.createdAt
    ? new Date(user.createdAt).toLocaleDateString(locale, {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
      })
    : null;

  return (
    <div className="flex items-center flex-wrap justify-between w-full gap-3 px-4 py-3 rounded-lg bg-gradient-to-b from-primary-900/60 to-primary-800/50 border border-white/10 shadow-lg">
      <div className="flex items-center gap-3">
        <Image
          src={user.avatarUrl || '/img/ProfileAvatarPlaceholder.png'}
          alt={user.username || 'avatar'}
          className="sm:w-[64px] sm:h-[64px] w-[56px] h-[56px] rounded-full object-cover flex-none"
          width={64}
          height={64}
          onError={(e) => {
            e.currentTarget.src = '/img/ProfileAvatarPlaceholder.png';
          }}
        />
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="font-semibold text-lg text-white">
              {user.name || 'Anonymous'}
            </span>
            {user.country && logo && (
              <Image
                src={logo}
                alt={`${user.country} flag`}
                className={`flex-none rounded-sm pointer-events-none ${
                  isExisting ? 'w-6 h-6' : 'w-7 h-5 object-cover'
                }`}
                width={24}
                height={24}
                unoptimized
              />
            )}
          </div>
          <span className="text-white/70 text-sm">@{user.username}</span>
          {joinedOn && (
            <p className="text-white/60 text-sm mt-1">
              {t('joinedOn')} {joinedOn}
            </p>
          )}
        </div>
      </div>

      {additionalContent}
    </div>
  );
};

export default UserProfileHeader;
