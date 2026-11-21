import { ChevronRight } from 'lucide-react';
import { useLocale, useTranslations } from 'next-intl';
import React, { useRef, useState } from 'react';

import Image from 'next/image';

import FollowersModal from './FollowersModal';

import { useFollowingStatusQuery } from '@/api/follows';
import { UserIcon } from '@/assets/icons/UserIcon';
import { isGoogleAvatarUrl } from '@/helpers/isGoogleAvatarUrl';
import { fitStepAttributes, useFitStep } from '@/hooks/useFitStep';
import { languageTag } from '@/i18n/catalog';
import { useGeneralStore } from '@/state/generalStore';
import { getHostingCountryLogo } from '@/theme/hosting';
import type { ThemeCreator } from '@/types/customTheme';

interface UserProfileHeaderProps {
  user: ThemeCreator;
  /** `ProfileActions` with Follow / Edit profile / Share / … */
  actions?: React.ReactNode;
  /** The top-right corner (the ⋯ menu on another fan's profile). */
  corner?: React.ReactNode;
  /** How many public themes, contests and designs the fan has. */
  publicItems?: number;
  /** Under the actions: an offline note, your profile's views. */
  children?: React.ReactNode;
}

/**
 * Who the profile belongs to: avatar, name with the heart flag, @username,
 * joined date, followers (opens the list) and public items, then the
 * actions. A band on top of the list on phones; from 1024px the column
 * beside it (`dp-profile-id`, like the simulation's spokesperson column).
 */
const UserProfileHeader: React.FC<UserProfileHeaderProps> = ({
  user,
  actions,
  corner,
  publicItems,
  children,
}) => {
  const [isFollowersModalOpen, setIsFollowersModalOpen] = useState(false);
  const [avatarFailed, setAvatarFailed] = useState(false);
  const t = useTranslations('widgets.profile');
  const locale = useLocale();
  const { data: followStatus } = useFollowingStatusQuery(user._id);
  const shouldUse2026WhiteHeartFlags = useGeneralStore(
    (state) => state.settings.shouldUse2026WhiteHeartFlags,
  );
  const { logo, isExisting } = getHostingCountryLogo(
    user.country || 'WW',
    true,
    shouldUse2026WhiteHeartFlags,
  );

  const followerCount = followStatus?.followerCount ?? user.followerCount ?? 0;

  const joinedOn = user.createdAt
    ? new Date(user.createdAt).toLocaleDateString(languageTag(locale), {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
      })
    : null;

  const showAvatar = !!user.avatarUrl && !avatarFailed;

  return (
    <section
      className={`dp-profile-id text-white ${corner ? 'has-corner' : ''}`}
    >
      {corner && <div className="dp-profile-corner">{corner}</div>}

      <div className="dp-profile-who">
        {showAvatar ? (
          <Image
            src={user.avatarUrl!}
            alt=""
            className="dp-profile-av"
            width={88}
            height={88}
            unoptimized={isGoogleAvatarUrl(user.avatarUrl)}
            onError={() => setAvatarFailed(true)}
          />
        ) : (
          <span className="dp-profile-av dp-profile-ph" aria-hidden="true">
            <UserIcon className="w-[42%] h-[42%]" />
          </span>
        )}
        <div className="min-w-0">
          <h2 className="dp-profile-name">
            {user.name || user.username || 'Anonymous'}
            {user.country && logo && (
              <Image
                src={logo}
                alt={user.country}
                className={`dp-profile-flag ${
                  isExisting ? 'w-[22px] h-[22px]' : 'w-7 h-5 object-cover'
                }`}
                width={24}
                height={24}
                unoptimized
              />
            )}
          </h2>
          <p className="dp-profile-meta">@{user.username}</p>
          {joinedOn && (
            <p className="dp-profile-meta">
              {t('joinedOn')} {joinedOn}
            </p>
          )}
        </div>
      </div>

      <div className="dp-profile-stats">
        <button type="button" onClick={() => setIsFollowersModalOpen(true)}>
          {t('followers', { count: followerCount })}
          <ChevronRight className="size-4" aria-hidden="true" />
        </button>
        {publicItems !== undefined && (
          <span>{t('publicItems', { count: publicItems })}</span>
        )}
      </div>

      {actions}
      {children}

      <FollowersModal
        isOpen={isFollowersModalOpen}
        onClose={() => setIsFollowersModalOpen(false)}
        userId={user._id}
      />
    </section>
  );
};

/**
 * Every label while they fit (and always in the column), then the buttons
 * after the first one keep only their icon.
 */
const ACTION_STEPS = [{ acts: 'labels' }, { acts: 'icons' }] as const;

/**
 * The profile's buttons: one row on phones, the first one stretching
 * (`dp-profile-main`); a stack in the column. Put a button's label in a
 * `dp-act-label` span so it can drop it.
 */
export const ProfileActions: React.FC<{ children: React.ReactNode }> = ({
  children,
}) => {
  const ref = useRef<HTMLDivElement>(null);
  const step = useFitStep(ref, ACTION_STEPS);

  return (
    <div
      ref={ref}
      {...fitStepAttributes(ACTION_STEPS[step])}
      className="dp-profile-acts"
    >
      {children}
    </div>
  );
};

export default UserProfileHeader;
