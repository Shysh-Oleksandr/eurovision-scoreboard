import { useTranslations } from 'next-intl';
import React from 'react';

import Button from './Button';

import AppleIcon from '@/assets/icons/AppleIcon';
import GoogleIcon from '@/assets/icons/GoogleIcon';
import { nativePlatform } from '@/native/platform';
import { useAuthStore } from '@/state/useAuthStore';

type Props = {
  /** Button size preset; omit for the legacy responsive size. */
  size?: 'md';
};

/**
 * "Continue with Google" and "Continue with Apple". Apple appears on the
 * website and in the iOS app (App Store guideline 4.8), not in the Android
 * app. Its button follows Apple's white style for dark backgrounds; the two
 * stack at one width so Apple's is never the smaller one (Apple's HIG).
 */
const SignInButtons = ({ size }: Props) => {
  const t = useTranslations('widgets.profile');
  const { login, isSigningIn } = useAuthStore();
  const iconClass = size ? 'size-5 flex-none' : 'w-6 h-6 flex-none';

  return (
    <div className="flex flex-col w-fit gap-2">
      <Button
        label={t('continueWithGoogle')}
        Icon={<GoogleIcon className={iconClass} />}
        variant="tertiary"
        size={size}
        className="normal-case w-full justify-center"
        onClick={() => login('google')}
        disabled={isSigningIn}
      />
      {nativePlatform() !== 'android' && (
        <Button
          label={t('continueWithApple')}
          Icon={<AppleIcon className={iconClass} />}
          variant="apple"
          size={size}
          className="w-full justify-center"
          onClick={() => login('apple')}
          disabled={isSigningIn}
        />
      )}
    </div>
  );
};

export default SignInButtons;
