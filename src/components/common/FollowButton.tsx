'use client';

import { Check, Plus } from 'lucide-react';
import { useTranslations } from 'next-intl';
import React from 'react';

import { useBlockedUserIds } from '@/api/blocks';
import {
  useFollowingStatusQuery,
  useFollowMutation,
  useUnfollowMutation,
} from '@/api/follows';
import Button from '@/components/common/Button';
import { toast } from '@/helpers/toast';
import { cn } from '@/helpers/utils';
import { useIsOffline } from '@/state/connectivityStore';
import { useAuthStore } from '@/state/useAuthStore';

interface FollowButtonProps {
  userId: string;
  /**
   * `block`: the profile's one filled button (46px, accent while not
   * following, a surface button once following); `className` sizes it.
   */
  variant?: 'sm' | 'md' | 'block';
  pill?: boolean;
  onFollowChange?: () => void;
  className?: string;
}

const FollowButton: React.FC<FollowButtonProps> = ({
  userId,
  variant = 'md',
  pill = false,
  onFollowChange,
  className = '',
}) => {
  const t = useTranslations();
  const user = useAuthStore((state) => state.user);
  const { data: status, isLoading } = useFollowingStatusQuery(userId);

  const followMutation = useFollowMutation();
  const unfollowMutation = useUnfollowMutation();

  const isBlocked = useBlockedUserIds().has(userId);
  const offline = useIsOffline();

  const isOwnProfile = !!user && user._id === userId;
  const isAuthenticated = !!user;

  // Blocking ends the follow both ways and the server refuses new ones.
  if (isOwnProfile || isBlocked) return null;

  const isFollowing = status?.isFollowing ?? false;
  const isMutating = followMutation.isPending || unfollowMutation.isPending;

  const handleClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (isMutating) return;
    // The button turning into Following (or back) is the confirmation; a
    // toast only when it didn't go through.
    const onError = () => toast.error(t('common.didntGoThrough'));

    if (isFollowing) {
      unfollowMutation.mutate(userId, { onSuccess: onFollowChange, onError });
    } else {
      followMutation.mutate(userId, { onSuccess: onFollowChange, onError });
    }
  };

  if (variant === 'block') {
    const following = isAuthenticated && isFollowing;

    return (
      <div
        onClick={(e) => e.stopPropagation()}
        role="presentation"
        className={className}
      >
        <Button
          variant={following || !isAuthenticated ? 'surface' : 'cta'}
          size="lg"
          className="w-full justify-center"
          onClick={isAuthenticated ? handleClick : undefined}
          disabled={!isAuthenticated || isLoading || offline}
          isLoading={isMutating}
          Icon={
            following ? (
              <Check className="size-[18px] flex-none" />
            ) : (
              <Plus className="size-[18px] flex-none" />
            )
          }
        >
          {/* Signed out, the button itself says why it can't be pressed
              (a title doesn't show on touch or on a disabled button). */}
          {!isAuthenticated
            ? t('widgets.profile.signInToFollow')
            : following
            ? t('widgets.profile.following')
            : t('widgets.profile.follow')}
        </Button>
      </div>
    );
  }

  if (!isAuthenticated) {
    if (pill) {
      return (
        <button
          type="button"
          disabled
          className="inline-flex items-center gap-2 rounded-full bg-white/[0.08] border border-white/[0.12] text-white/40 text-[12.5px] font-bold uppercase tracking-wide px-4 py-2 cursor-not-allowed"
          title={t('widgets.profile.signInToFollow')}
        >
          <Plus className="w-5 h-5  flex-none" />
          {t('widgets.profile.follow')}
        </button>
      );
    }

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

  if (pill) {
    return (
      <div onClick={(e) => e.stopPropagation()} role="presentation">
        <button
          type="button"
          onClick={handleClick}
          disabled={isLoading || isMutating || offline}
          className={`inline-flex items-center gap-2 rounded-full text-[12.5px] font-bold uppercase tracking-wide px-4 py-2 border transition-colors disabled:opacity-50 disabled:cursor-not-allowed ${
            isFollowing
              ? 'bg-transparent border-white/[0.12] text-white/40 hover:text-white/60'
              : 'bg-white/[0.08] border-white/[0.12] text-white/80 hover:bg-white/[0.14] hover:text-white'
          }`}
        >
          {isFollowing ? (
            <Check className="w-5 h-5 flex-none" />
          ) : (
            <Plus className="w-5 h-5  flex-none" />
          )}
          {isFollowing
            ? t('widgets.profile.following')
            : t('widgets.profile.follow')}
        </button>
      </div>
    );
  }

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
        disabled={isLoading || isMutating || offline}
        isLoading={isMutating}
        className={cn(
          '!gap-2 min-w-[80px] !py-2.5 !px-3',
          variant === 'sm' ? '!text-xs' : '!text-sm',
        )}
        Icon={
          isFollowing ? (
            <Check
              className={`${
                variant === 'sm' ? 'w-4 h-4' : 'w-5 h-5'
              } flex-none`}
            />
          ) : (
            <Plus
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
