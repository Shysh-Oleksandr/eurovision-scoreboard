'use client';

import { useLocale } from 'next-intl';
import { useEffect } from 'react';

export default function IntlProvider() {
  const locale = useLocale();

  useEffect(() => {
    if (typeof document === 'undefined') return;

    document.cookie = `locale=${locale}; path=/; max-age=${60 * 60 * 24 * 365}`;
  }, [locale]);

  return null;
}
