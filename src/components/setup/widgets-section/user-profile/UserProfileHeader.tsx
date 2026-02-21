import { ChevronRight, Share2 } from 'lucide-react';
import { useLocale, useTranslations } from 'next-intl';
import React, { useState } from 'react';

import Image from 'next/image';

import { useHandleShare } from '../../hooks/useHandleShare';

import FollowersModal from './FollowersModal';

import { useFollowingStatusQuery } from '@/api/follows';
import Button from '@/components/common/Button';
import FollowButton from '@/components/common/FollowButton';
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
  const [isFollowersModalOpen, setIsFollowersModalOpen] = useState(false);
  const t = useTranslations();
  const locale = useLocale();
  const { data: followStatus } = useFollowingStatusQuery(user._id);
  const { logo, isExisting } = getHostingCountryLogo(user?.country || 'WW');

  const followerCount = followStatus?.followerCount ?? user.followerCount ?? 0;

  const handleShare = useHandleShare();

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
        <div className="min-w-0 flex-1 flex flex-col">
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
              {t('widgets.profile.joinedOn')} {joinedOn}
            </p>
          )}
          <button
            type="button"
            onClick={() => setIsFollowersModalOpen(true)}
            className="text-white/60 text-sm mt-1 hover:text-white/80 transition-colors text-left flex items-center gap-1"
          >
            {t('widgets.profile.followers', { count: followerCount })}
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>
      </div>

      <FollowersModal
        isOpen={isFollowersModalOpen}
        onClose={() => setIsFollowersModalOpen(false)}
        userId={user._id}
      />

      <div className="flex flex-wrap items-center gap-2 flex-shrink-0 ml-auto">
        <FollowButton userId={user._id} variant="md" />
        <Button
          variant="tertiary"
          onClick={() => handleShare('profile', user._id, user.name || '')}
          className={`!py-2 !px-4 !text-base`}
          Icon={<Share2 className="sm:size-6 size-5" />}
        ></Button>
        {additionalContent}
      </div>
    </div>
  );
};

export default UserProfileHeader;
