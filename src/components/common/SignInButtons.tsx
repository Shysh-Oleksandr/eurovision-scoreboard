import { useTranslations } from 'next-intl';
import React from 'react';

import Button from './Button';

import AppleIcon from '@/assets/icons/AppleIcon';
import GoogleIcon from '@/assets/icons/GoogleIcon';
import { PRIVACY_POLICY_URL, TERMS_OF_USE_URL } from '@/helpers/shareUrl';
import { nativePlatform } from '@/native/platform';
import { useAuthStore } from '@/state/useAuthStore';

type Props = {
  /** Button size preset; omit for the legacy responsive size. */
  size?: 'md';
};

const legalLinkClass = 'underline hover:text-white transition-colors';

/**
 * "Continue with Google" and "Continue with Apple". Apple appears on the
 * website and in the iOS app (App Store guideline 4.8), not in the Android
 * app. Its button follows Apple's white style for dark backgrounds; the two
 * stack at one width so Apple's is never the smaller one (Apple's HIG).
 * Signing in creates the account, so the Terms of Use (which forbid
 * objectionable content, App Store guideline 1.2) are agreed to here.
 */
const SignInButtons = ({ size }: Props) => {
  const t = useTranslations('widgets.profile');
  const { login, isSigningIn } = useAuthStore();
  const iconClass = size ? 'size-5 flex-none' : 'w-6 h-6 flex-none';

  return (
    <div className="flex flex-col items-center gap-3">
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
      <p className="max-w-[300px] text-center text-xs leading-relaxed text-white/55">
        {t.rich('legalAgreement', {
          terms: (chunks) => (
            <a
              href={TERMS_OF_USE_URL}
              target="_blank"
              rel="noopener noreferrer"
              className={legalLinkClass}
            >
              {chunks}
            </a>
          ),
          privacy: (chunks) => (
            <a
              href={PRIVACY_POLICY_URL}
              target="_blank"
              rel="noopener noreferrer"
              className={legalLinkClass}
            >
              {chunks}
            </a>
          ),
        })}
      </p>
    </div>
  );
};

export default SignInButtons;
