import React from 'react';

import Image from 'next/image';

import { getHostingCountryLogo } from '@/theme/hosting';
import type { ThemeCreator } from '@/types/customTheme';

type Size = 'sm' | 'md' | 'lg';

interface UserInfoProps {
  user?: ThemeCreator;
  size?: Size;
}

const sizeMap: Record<
  Size,
  {
    avatar: string;
    name: string;
    username: string;
    flag: string;
    flagExisting: string;
  }
> = {
  sm: {
    avatar: 'w-9 h-9',
    name: 'text-sm',
    username: 'text-xs',
    flag: 'w-6 h-4',
    flagExisting: 'w-6 h-6',
  },
  md: {
    avatar: 'w-10 h-10',
    name: 'text-base',
    username: 'text-sm',
    flag: 'w-7 h-5',
    flagExisting: 'w-6 h-6',
  },
  lg: {
    avatar: 'w-12 h-12',
    name: 'text-lg',
    username: 'text-base',
    flag: 'w-7 h-5',
    flagExisting: 'w-7 h-7',
  },
};

const UserInfo: React.FC<UserInfoProps> = ({ user, size = 'md' }) => {
  const s = sizeMap[size];

  if (!user) return null;
  const { logo, isExisting } = getHostingCountryLogo(user?.country || 'WW');

  return (
    <div className="flex items-center gap-2.5">
      <Image
        src={user.avatarUrl || '/img/ProfileAvatarPlaceholder.png'}
        alt={user.username || 'avatar'}
        className={`${s.avatar} rounded-full object-cover`}
        width={24}
        height={24}
        onError={(e) => {
          e.currentTarget.src = '/img/ProfileAvatarPlaceholder.png';
        }}
      />
      <div>
        <div className="flex items-center gap-1.5">
          <div className={`font-semibold ${s.name}`}>
            {user.name || 'Anonymous'}
          </div>
          {user.country && logo && (
            <Image
              src={logo}
              alt={`${user.country} flag`}
              className={`flex-none rounded-sm pointer-events-none ${
                isExisting ? s.flagExisting : `${s.flag} object-cover`
              }`}
              width={24}
              height={24}
            />
          )}
        </div>
        <span className={`${s.username} text-white/70`}>@{user.username}</span>
      </div>
    </div>
  );
};

export default UserInfo;
