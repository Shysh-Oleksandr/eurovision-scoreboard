import { Ban, Trash2 } from 'lucide-react';
import { useTranslations } from 'next-intl';
import React, { useState } from 'react';
import { toast } from 'react-toastify';

import dynamic from 'next/dynamic';

import SignInMethodsSection from './SignInMethodsSection';

import { LogoutIcon } from '@/assets/icons/LogoutIcon';
import Button from '@/components/common/Button';
import Modal from '@/components/common/Modal/Modal';
import { useConfirmation } from '@/hooks/useConfirmation';
import { useEffectOnce } from '@/hooks/useEffectOnce';
import { useAuthStore } from '@/state/useAuthStore';

const BlockedUsersModal = dynamic(
  () => import('@/components/moderation/BlockedUsersModal'),
  { ssr: false },
);

interface AccountModalProps {
  isOpen: boolean;
  onClose: () => void;
  onLoaded: () => void;
}

/**
 * Profile → Account: how you sign in, who you've blocked, logging out and
 * deleting the account. Everything here takes effect at once (with its own
 * confirmation where it can't be taken back), so there is no Save: only
 * Close. What other fans see of you is edited in EditProfileModal.
 */
const AccountModal: React.FC<AccountModalProps> = ({
  isOpen,
  onClose,
  onLoaded,
}) => {
  const t = useTranslations();
  const logout = useAuthStore((s) => s.logout);
  const deleteAccount = useAuthStore((s) => s.deleteAccount);
  const isAuthBusy = useAuthStore((s) => s.isBusy);
  const { confirm } = useConfirmation();
  const [isBlockedUsersOpen, setIsBlockedUsersOpen] = useState(false);
  const [busy, setBusy] = useState<'logout' | 'delete' | null>(null);

  useEffectOnce(onLoaded);

  const handleLogout = () => {
    confirm({
      key: 'logout',
      title: t('widgets.profile.areYouSureYouWantToLogout'),
      onConfirm: async () => {
        setBusy('logout');
        try {
          await logout();
        } finally {
          setBusy(null);
        }
        onClose();
      },
    });
  };

  const handleDeleteAccount = () => {
    confirm({
      key: 'delete-account',
      type: 'danger',
      title: t('moderation.deleteAccountConfirmTitle'),
      description: t('moderation.deleteAccountConfirmDescription'),
      onConfirm: async () => {
        setBusy('delete');
        try {
          await deleteAccount();
        } catch {
          toast.error(t('moderation.deleteAccountFailed'));

          return;
        } finally {
          setBusy(null);
        }
        toast.success(t('moderation.accountDeleted'));
        onClose();
      },
    });
  };

  const isBusy = !!busy || isAuthBusy;

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      containerClassName="!w-[min(100%,500px)]"
      contentClassName="text-white narrow-scrollbar dp-flat"
      overlayClassName="!z-[1001]"
      fullScreenOnPhone
      bottomContent={
        <div className="flex items-center gap-2.5 bg-primary-900 px-3.5 pt-[10px] pb-[calc(10px+var(--modal-safe-bottom,0px))] 2cols:px-5 z-30">
          <Button
            variant="ghost"
            size="lg"
            className="px-[18px]"
            Icon={<LogoutIcon className="size-[18px] flex-none" />}
            onClick={handleLogout}
            isLoading={busy === 'logout'}
            disabled={isBusy}
            snowEffect="left"
          >
            {t('widgets.profile.logout')}
          </Button>
          <Button
            variant="ghost"
            size="lg"
            className="flex-1 min-w-0 justify-center"
            onClick={onClose}
            snowEffect="right"
          >
            {t('common.close')}
          </Button>
        </div>
      }
    >
      <h3 className="text-2xl font-bold mb-5">{t('moderation.account')}</h3>

      <SignInMethodsSection isOpen={isOpen} className="space-y-4" />

      <section className="mt-6 pt-5 border-t border-white/10">
        <div className="flex items-center justify-between gap-3">
          <h4 className="text-lg font-bold min-w-0">
            {t('moderation.blockedUsers')}
          </h4>
          <Button
            variant="surface"
            size="md"
            className="flex-none"
            Icon={<Ban className="size-4 flex-none" />}
            onClick={() => setIsBlockedUsersOpen(true)}
          >
            {t('moderation.manageBlocked')}
          </Button>
        </div>
        <p className="text-white/60 text-sm leading-snug mt-1">
          {t('moderation.blockedUsersDescription')}
        </p>
      </section>

      <section className="mt-6 pt-4 border-t border-white/10">
        <Button
          variant="surface"
          size="md"
          className="dp-act--quiet dp-act--danger -ml-3"
          Icon={<Trash2 className="size-4 flex-none" />}
          isLoading={busy === 'delete'}
          disabled={isBusy}
          onClick={handleDeleteAccount}
        >
          {t('moderation.deleteAccount')}
        </Button>
        <p className="text-white/60 text-sm leading-snug mt-1">
          {t('moderation.deleteAccountDescription')}
        </p>
      </section>

      {isBlockedUsersOpen && (
        <BlockedUsersModal
          isOpen={isBlockedUsersOpen}
          onClose={() => setIsBlockedUsersOpen(false)}
        />
      )}
    </Modal>
  );
};

export default AccountModal;
