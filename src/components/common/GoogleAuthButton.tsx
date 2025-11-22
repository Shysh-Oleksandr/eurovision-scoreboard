import { useTranslations } from 'next-intl';
import React from 'react';

import Button from './Button';

import GoogleIcon from '@/assets/icons/GoogleIcon';
import { useAuthStore } from '@/state/useAuthStore';

const GoogleAuthButton = () => {
  const t = useTranslations('widgets.profile');
  const { login } = useAuthStore();

  return (
    <Button
      label={t('continueWithGoogle')}
      Icon={<GoogleIcon className="w-6 h-6 flex-none" />}
      variant="tertiary"
      onClick={login}
    />
  );
};

export default GoogleAuthButton;
