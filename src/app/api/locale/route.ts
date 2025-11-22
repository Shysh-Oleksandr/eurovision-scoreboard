import type { NextRequest } from 'next/server';
import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { normalizeLocale } from '@/i18n/request';

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
