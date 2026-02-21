'use client';

import { UserPlus } from 'lucide-react';
import { useTranslations } from 'next-intl';
import React from 'react';
import { toast } from 'react-toastify';

import {
  useFollowingStatusQuery,
  useFollowMutation,
  useUnfollowMutation,
} from '@/api/follows';
import { UserCheckIcon } from '@/assets/icons/UserCheckIcon';
import Button from '@/components/common/Button';
import { cn } from '@/helpers/utils';
import { useAuthStore } from '@/state/useAuthStore';

interface FollowButtonProps {
  userId: string;
  variant?: 'sm' | 'md';
  onFollowChange?: () => void;
}

const FollowButton: React.FC<FollowButtonProps> = ({
  userId,
  variant = 'md',
  onFollowChange,
}) => {
  const t = useTranslations();
  const user = useAuthStore((state) => state.user);
  const { data: status, isLoading } = useFollowingStatusQuery(userId);

  const followMutation = useFollowMutation();
  const unfollowMutation = useUnfollowMutation();

  const isOwnProfile = !!user && user._id === userId;
  const isAuthenticated = !!user;

  if (isOwnProfile) return null;

  if (!isAuthenticated) {
    return (
      <Button
        label={t('widgets.profile.follow')}
        variant="tertiary"
        disabled
        title={t('widgets.profile.signInToFollow')}
        className={
          variant === 'sm' ? '!py-1.5 !px-2 !text-xs' : '!py-2 !px-3 !text-sm'
        }
      />
    );
  }

  const isFollowing = status?.isFollowing ?? false;
  const isMutating = followMutation.isPending || unfollowMutation.isPending;

  const handleClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (isMutating) return;
    if (isFollowing) {
      unfollowMutation.mutate(userId, { onSuccess: onFollowChange });
      toast.success(t('widgets.profile.unfollowedUser'));
    } else {
      followMutation.mutate(userId, { onSuccess: onFollowChange });
      toast.success(t('widgets.profile.followedUser'));
    }
  };

  return (
    <div onClick={(e) => e.stopPropagation()} role="presentation">
      <Button
        label={
          isFollowing
            ? t('widgets.profile.following')
            : t('widgets.profile.follow')
        }
        variant={isFollowing ? 'primary' : 'tertiary'}
        onClick={handleClick}
        disabled={isLoading || isMutating}
        isLoading={isMutating}
        className={cn(
          '!gap-1.5 min-w-[80px] !py-2.5 !px-3',
          variant === 'sm' ? '!text-xs' : '!text-sm',
        )}
        Icon={
          isFollowing ? (
            <UserCheckIcon
              className={`${
                variant === 'sm' ? 'w-4 h-4' : 'w-5 h-5'
              } flex-none`}
            />
          ) : (
            <UserPlus
              className={`${
                variant === 'sm' ? 'w-4 h-4' : 'w-5 h-5'
              } flex-none`}
            />
          )
        }
      />
    </div>
  );
};

export default FollowButton;
