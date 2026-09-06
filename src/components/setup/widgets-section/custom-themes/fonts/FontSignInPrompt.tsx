import { useTranslations } from 'next-intl';
import React from 'react';

import GoogleAuthButton from '@/components/common/GoogleAuthButton';

const FontSignInPrompt: React.FC = () => {
  const t = useTranslations('widgets.themes.fonts');

  return (
    <div className="text-white text-center sm:py-8 py-4 flex flex-col items-center gap-4">
      <p className="text-white/70">{t('signInToUpload')}</p>
      <GoogleAuthButton />
    </div>
  );
};

export default FontSignInPrompt;
