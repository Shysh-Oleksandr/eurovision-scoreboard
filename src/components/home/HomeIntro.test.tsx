import { readFileSync } from 'fs';
import path from 'path';

import { NextIntlClientProvider } from 'next-intl';
import { afterEach, describe, expect, it } from 'vitest';

import { cleanup, render, screen } from '@testing-library/react';

import HomeIntro from './HomeIntro';

import { JUNIOR_SUPPORTED_YEARS, SUPPORTED_YEARS } from '@/data/data';
import { SUPPORTED_LOCALES } from '@/i18n/catalog';

const readMessages = (locale: string) =>
  JSON.parse(
    readFileSync(
      path.join(__dirname, '..', '..', '..', 'messages', `${locale}.json`),
      'utf8',
    ),
  );

const YEARS = [
  SUPPORTED_YEARS[0],
  SUPPORTED_YEARS[SUPPORTED_YEARS.length - 1],
  JUNIOR_SUPPORTED_YEARS[0],
  JUNIOR_SUPPORTED_YEARS[JUNIOR_SUPPORTED_YEARS.length - 1],
];

afterEach(cleanup);

describe('HomeIntro', () => {
  it.each(SUPPORTED_LOCALES)(
    'renders the %s text with plain years',
    (locale) => {
      const messages = readMessages(locale);

      render(
        <NextIntlClientProvider
          locale={locale}
          messages={messages}
          onError={(error) => {
            throw error;
          }}
        >
          <HomeIntro />
        </NextIntlClientProvider>,
      );

      expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent(
        'DouzePoints',
      );

      const text = document.body.textContent ?? '';

      for (const year of YEARS) expect(text).toContain(String(year));
      // Number arguments would come out grouped ("2,004" / "2.004").
      expect(text).not.toMatch(/\d[,.\s]\d{3}/);
      expect(text).not.toMatch(/[{}]/);
      expect(text).toContain(messages.Metadata.notAffiliated);
    },
  );
});
