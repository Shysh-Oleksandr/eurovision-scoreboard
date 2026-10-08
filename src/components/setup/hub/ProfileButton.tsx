'use client';
import { useTranslations } from 'next-intl';
import React, { useState } from 'react';

import dynamic from 'next/dynamic';
import Image from 'next/image';

import { useMyProfileSummaryQuery } from '@/api/profiles';
import { UserIcon } from '@/assets/icons/UserIcon';
import { isGoogleAvatarUrl } from '@/helpers/isGoogleAvatarUrl';
import { useAuthStore } from '@/state/useAuthStore';

const ProfileModal = dynamic(
  () => import('../widgets-section/profile/ProfileModal'),
  { ssr: false },
);

type Props = {
  className?: string;
};

/**
 * Identity button in the hub header (replaces the Profile widget): avatar,
 * display name and the followers count when signed in, "Sign in" otherwise.
 * Opens the Profile modal, which also hosts the Google sign-in.
 */
const ProfileButton: React.FC<Props> = ({ className = '' }) => {
  const t = useTranslations('widgets.profile');
  const user = useAuthStore((s) => s.user);
  const { data: summary } = useMyProfileSummaryQuery(!!user);
  const [open, setOpen] = useState(false);
  const [loaded, setLoaded] = useState(false);

  return (
    <>
      <button
        type="button"
        className={`dp-act dp-profile-btn text-white ${className}`}
        aria-label={user ? t('title') : t('signIn')}
        onClick={(e) => {
          e.stopPropagation();
          setOpen(true);
        }}
      >
        {user ? (
          <Image
            src={user.avatarUrl || '/img/ProfileAvatarPlaceholder.png'}
            alt=""
            width={34}
            height={34}
            unoptimized={isGoogleAvatarUrl(user.avatarUrl)}
            onError={(e) => {
              e.currentTarget.src = '/img/ProfileAvatarPlaceholder.png';
            }}
          />
        ) : (
          <span className="dp-profile-ph" aria-hidden="true">
            <UserIcon className="size-[18px]" />
          </span>
        )}
        <span className="dp-profile-txt">
          <b>{user ? user.name || user.username : t('signIn')}</b>
          {user && summary && (
            <small>{t('followers', { count: summary.followersCount })}</small>
          )}
        </span>
      </button>
      {(open || loaded) && (
        <ProfileModal
          isOpen={open}
          onClose={() => setOpen(false)}
          onLoaded={() => setLoaded(true)}
        />
      )}
    </>
  );
};

export default ProfileButton;
