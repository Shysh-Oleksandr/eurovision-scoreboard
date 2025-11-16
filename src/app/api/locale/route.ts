import type { NextRequest } from 'next/server';
import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';

const SUPPORTED_LOCALES = ['en', 'es'] as const;

type SupportedLocale = (typeof SUPPORTED_LOCALES)[number];

const DEFAULT_LOCALE: SupportedLocale = 'en';

function normalizeLocale(raw: string | null | undefined): SupportedLocale {
  if (!raw) return DEFAULT_LOCALE;
  const lower = raw.toLowerCase();

  if (lower.startsWith('es')) return 'es';
  if (lower.startsWith('en')) return 'en';

  return DEFAULT_LOCALE;
}

export async function POST(request: NextRequest) {
  const body = await request.json().catch(() => ({}));
  const requestedLocale = typeof body.locale === 'string' ? body.locale : null;
  const locale = normalizeLocale(requestedLocale);

  const cookieStore = await cookies();
  cookieStore.set('locale', locale, {
    path: '/',
    maxAge: 60 * 60 * 24 * 365,
  });

  return NextResponse.json({ locale });
}
