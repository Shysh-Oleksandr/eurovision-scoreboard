'use client';
import { Share2, UserCog } from 'lucide-react';
import { useTranslations } from 'next-intl';
import React, { useCallback, useId, useMemo, useRef, useState } from 'react';

import dynamic from 'next/dynamic';

import { useHandleShare } from '../../hooks/useHandleShare';
import { useLoadContest } from '../../hooks/useLoadContest';
import { ProfileHeader } from '../user-profile/ProfileModalChrome';
import UserContentSection from '../user-profile/UserContentSection';
import UserProfileHeader, {
  ProfileActions,
} from '../user-profile/UserProfileHeader';
import {
  PROFILE_MODAL_CONTAINER,
  usePublicItemsCount,
} from '../user-profile/UserProfileModal';

import FollowingFeedSection from './FollowingFeedSection';

import { PencilIcon } from '@/assets/icons/PencilIcon';
import Button from '@/components/common/Button';
import Modal from '@/components/common/Modal/Modal';
import SignInButtons from '@/components/common/SignInButtons';
import { TabContent } from '@/components/common/tabs/Tabs';
import { useEffectOnce } from '@/hooks/useEffectOnce';
import { playHaptic } from '@/native/haptics';
import { useIsOffline } from '@/state/connectivityStore';
import { useGeneralStore } from '@/state/generalStore';
import { useAuthStore } from '@/state/useAuthStore';
import { stripCopySuffix } from '@/theme/themeFingerprint';
import { Contest } from '@/types/contest';
import { CustomTheme } from '@/types/customTheme';

const EditProfileModal = dynamic(() => import('./EditProfileModal'), {
  ssr: false,
});

const AccountModal = dynamic(() => import('./AccountModal'), {
  ssr: false,
});

enum ProfileTab {
  YOUR_PROFILE = 'your-profile',
  FOLLOWING = 'following',
}

const VIEWS = [ProfileTab.YOUR_PROFILE, ProfileTab.FOLLOWING];

/**
 * Your profile / Following feed as the segmented well, like the libraries'
 * places: in the header beside the title from `2cols`, in a bar at the
 * bottom on phones. Real tabs: the arrow keys, Home and End move between
 * them.
 */
const ProfileViews: React.FC<{
  value: ProfileTab;
  onChange: (tab: ProfileTab) => void;
  ariaLabelledBy: string;
  /** The phones' bottom bar: 44px segments that share its width. */
  bar?: boolean;
}> = ({ value, onChange, ariaLabelledBy, bar = false }) => {
  const t = useTranslations('widgets.profile');
  const refs = useRef<(HTMLButtonElement | null)[]>([]);
  const labels: Record<ProfileTab, string> = {
    [ProfileTab.YOUR_PROFILE]: t('yourProfile'),
    [ProfileTab.FOLLOWING]: t('followingFeed'),
  };

  const select = (next: ProfileTab, focus = false) => {
    if (next !== value) {
      playHaptic({ id: 'selection' });
      onChange(next);
    }
    if (focus) refs.current[VIEWS.indexOf(next)]?.focus();
  };

  const onKeyDown = (e: React.KeyboardEvent) => {
    const index = VIEWS.indexOf(value);
    const last = VIEWS.length - 1;
    const target =
      e.key === 'ArrowRight'
        ? index === last
          ? 0
          : index + 1
        : e.key === 'ArrowLeft'
        ? index === 0
          ? last
          : index - 1
        : e.key === 'Home'
        ? 0
        : e.key === 'End'
        ? last
        : null;

    if (target === null) return;
    e.preventDefault();
    select(VIEWS[target], true);
  };

  return (
    <div
      role="tablist"
      aria-labelledby={ariaLabelledBy}
      onKeyDown={onKeyDown}
      className={`dp-profile-views dp-sim-seg ${bar ? 'is-bar' : 'is-header'}`}
    >
      {VIEWS.map((view, i) => {
        const isOn = view === value;

        return (
          <button
            key={view}
            ref={(el) => {
              refs.current[i] = el;
            }}
            type="button"
            role="tab"
            aria-selected={isOn}
            tabIndex={isOn ? 0 : -1}
            onClick={() => select(view)}
            className={isOn ? 'is-on' : 'text-white/70 hover:text-white'}
          >
            {labels[view]}
          </button>
        );
      })}
    </div>
  );
};

interface ProfileModalProps {
  isOpen: boolean;
  onClose: () => void;
  onLoaded: () => void;
}

const ProfileModal: React.FC<ProfileModalProps> = ({
  isOpen,
  onClose,
  onLoaded,
}) => {
  const t = useTranslations('widgets.profile');
  const tOffline = useTranslations('offline');
  const tModeration = useTranslations('moderation');
  const user = useAuthStore((s) => s.user);
  // Offline the account stays on screen from this device's copy; editing it
  // and the account settings (signing out revokes the session on the
  // server) wait.
  const offline = useIsOffline();

  const [isEditProfileModalOpen, setIsEditProfileModalOpen] = useState(false);
  const [isEditProfileModalLoaded, setIsEditProfileModalLoaded] =
    useState(false);
  const [isAccountModalOpen, setIsAccountModalOpen] = useState(false);
  const [isAccountModalLoaded, setIsAccountModalLoaded] = useState(false);

  const [activeTab, setActiveTab] = useState<ProfileTab>(
    ProfileTab.YOUR_PROFILE,
  );

  const onLoadContest = useLoadContest();

  // Remix and Edit hand the theme or contest to the Themes / Contests modal,
  // which opens its editor (same as UserProfileModal in EventSetupModal).
  // Profile closes first so the editor isn't stacked under it.
  const setIsThemesModalOpen = useGeneralStore((s) => s.setIsThemesModalOpen);
  const setThemeToDuplicate = useGeneralStore((s) => s.setThemeToDuplicate);
  const setThemeToEdit = useGeneralStore((s) => s.setThemeToEdit);
  const setIsContestsModalOpen = useGeneralStore(
    (s) => s.setIsContestsModalOpen,
  );
  const setContestToEdit = useGeneralStore((s) => s.setContestToEdit);

  const onDuplicateTheme = useCallback(
    (theme: CustomTheme) => {
      onClose();
      setThemeToDuplicate({ ...theme, name: stripCopySuffix(theme.name) });
      setIsThemesModalOpen(true);
    },
    [onClose, setThemeToDuplicate, setIsThemesModalOpen],
  );

  const onEditTheme = useCallback(
    (theme: CustomTheme) => {
      onClose();
      setThemeToEdit(theme);
      setIsThemesModalOpen(true);
    },
    [onClose, setThemeToEdit, setIsThemesModalOpen],
  );

  const onEditContest = useCallback(
    (contest: Contest) => {
      onClose();
      setContestToEdit(contest);
      setIsContestsModalOpen(true);
    },
    [onClose, setContestToEdit, setIsContestsModalOpen],
  );

  const isAuthenticated = !!user;

  const handleShare = useHandleShare();
  const titleId = useId();
  const publicItems = usePublicItemsCount(user?._id ?? '', isAuthenticated);

  // Both views stay mounted (switching keeps each list's filters and page).
  const views = useMemo(
    () => [
      {
        value: ProfileTab.YOUR_PROFILE,
        label: t('yourProfile'),
        content: (
          <UserContentSection
            userId={user?._id ?? ''}
            onDuplicate={onDuplicateTheme}
            onEditTheme={onEditTheme}
            onEditContest={onEditContest}
            onLoadContest={onLoadContest}
          />
        ),
      },
      {
        value: ProfileTab.FOLLOWING,
        label: t('followingFeed'),
        content: (
          <FollowingFeedSection
            onDuplicate={onDuplicateTheme}
            onEditTheme={onEditTheme}
            onEditContest={onEditContest}
            onLoadContest={onLoadContest}
          />
        ),
      },
    ],
    [user?._id, t, onDuplicateTheme, onEditTheme, onEditContest, onLoadContest],
  );

  useEffectOnce(() => {
    onLoaded();
  });

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      containerClassName={
        isAuthenticated ? PROFILE_MODAL_CONTAINER : '!w-[min(100%,750px)]'
      }
      fullScreenOnPhone
      contentClassName="dp-flat"
      fixedHeight
      overlayClassName="!z-[1001]"
      withBlur
      ariaLabelledBy={titleId}
      topContent={
        <ProfileHeader
          title={t('title')}
          titleId={titleId}
          onClose={onClose}
          tabs={
            isAuthenticated ? (
              <ProfileViews
                value={activeTab}
                onChange={setActiveTab}
                ariaLabelledBy={titleId}
              />
            ) : undefined
          }
        />
      }
      bottomContent={
        isAuthenticated ? (
          // Phones: the two views under the thumb.
          <div className="dp-profile-foot 2cols:hidden px-3 pt-2.5 pb-[calc(10px+var(--modal-safe-bottom,0px))]">
            <ProfileViews
              value={activeTab}
              onChange={setActiveTab}
              ariaLabelledBy={titleId}
              bar
            />
          </div>
        ) : undefined
      }
    >
      {user ? (
        <div className="dp-profile-layout">
          <aside className="dp-profile-aside">
            <UserProfileHeader
              user={user}
              publicItems={publicItems}
              actions={
                <ProfileActions>
                  <Button
                    variant="surface"
                    size="lg"
                    className="dp-profile-main"
                    onClick={() => setIsEditProfileModalOpen(true)}
                    disabled={offline}
                    Icon={<PencilIcon className="size-[18px] flex-none" />}
                  >
                    {t('editProfile')}
                  </Button>
                  <Button
                    variant="surface"
                    size="lg"
                    onClick={() => setIsAccountModalOpen(true)}
                    disabled={offline}
                    aria-label={tModeration('account')}
                    Icon={<UserCog className="size-[18px] flex-none" />}
                  >
                    <span className="dp-act-label">
                      {tModeration('account')}
                    </span>
                  </Button>
                  <Button
                    variant="surface"
                    size="lg"
                    onClick={() =>
                      handleShare('profile', user._id, user.name || '')
                    }
                    aria-label={t('shareProfile')}
                    Icon={<Share2 className="size-[18px] flex-none" />}
                  >
                    <span className="dp-act-label">{t('shareProfile')}</span>
                  </Button>
                </ProfileActions>
              }
            >
              {offline && (
                <p className="dp-profile-note">{tOffline('needsConnection')}</p>
              )}
            </UserProfileHeader>
          </aside>
          <div className="dp-profile-main-pane">
            <TabContent tabs={views} activeTab={activeTab} preserveContent />
          </div>
        </div>
      ) : (
        <div className="flex flex-col items-center gap-4 mt-8">
          <p className="text-base text-white/80">{t('authDescription')}</p>
          <SignInButtons />
        </div>
      )}

      {(isEditProfileModalOpen || isEditProfileModalLoaded) && (
        <EditProfileModal
          isOpen={isEditProfileModalOpen}
          onClose={() => setIsEditProfileModalOpen(false)}
          onLoaded={() => setIsEditProfileModalLoaded(true)}
        />
      )}

      {isAuthenticated && (isAccountModalOpen || isAccountModalLoaded) && (
        <AccountModal
          isOpen={isAccountModalOpen}
          onClose={() => setIsAccountModalOpen(false)}
          onLoaded={() => setIsAccountModalLoaded(true)}
        />
      )}
    </Modal>
  );
};

export default ProfileModal;
