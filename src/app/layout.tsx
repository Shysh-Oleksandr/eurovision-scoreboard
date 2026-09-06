import './globals.css';

import type { Metadata } from 'next';
import ReactDOM from 'react-dom';

import Script from 'next/script';
import { getLocale, getTranslations } from 'next-intl/server';

import { UmamiAnalytics } from './analytics';
import AppBootstrap from './app-bootstrap';
import AppIntlProvider from './AppIntlProvider';
import IntlProvider from './IntlProvider';
import Providers from './providers';
import ToastRoot from './toast-root';
import { WebVitals } from './web-vitals';

import { INITIAL_COUNTRIES_URL } from '@/data/countries/countriesDataUrl';
import {
  pickMessageNamespaces,
  SHELL_NAMESPACES,
  SupportedLocale,
} from '@/i18n/catalog';
import { MESSAGES_CATALOG } from '@/i18n/messagesManifest.generated';
import { getMergedMessages } from '@/i18n/serverMessages';
import {
  FONT_ALIAS_ALLOWLIST,
  getFontFamilyStackCss,
} from '@/theme/fontAliases';

const FOUC_FONT_ALLOWED_LITERAL = `{${FONT_ALIAS_ALLOWLIST.map(
  (a) => `'${a}':1`,
).join(',')}}`;

/** alias → font-family stack, so the FOUC script can build fallback stacks for custom fonts. */
const FOUC_FONT_STACKS_LITERAL = JSON.stringify(
  Object.fromEntries(
    FONT_ALIAS_ALLOWLIST.map((a) => [a, getFontFamilyStackCss(a)]),
  ),
);

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: 'Metadata' });

  return {
    title: t('title'),
    metadataBase: new URL('https://douzepoints.app'),
    description: t('description'),
    keywords: [
      'Eurovision',
      'Eurovision Song Contest',
      'ESC',
      'scoreboard',
      'voting',
      'simulator',
      'interactive',
      'Europe',
      'music competition',
      'national selection',
      'national final',
      'points',
      'douze points',
      'televote',
      'jury vote',
    ],
    authors: [{ name: 'DouzePoints' }],
    robots: { index: true, follow: true },
    applicationName: 'DouzePoints',
    appleWebApp: { statusBarStyle: 'default', title: 'DouzePoints' },
    alternates: { canonical: '/' },
    openGraph: {
      type: 'website',
      url: 'https://douzepoints.app/',
      title: t('title'),
      description: t('description'),
      siteName: 'DouzePoints',
      locale: 'en_US',
      images: ['https://cdn.douzepoints.app/general/og-image-2026.jpeg'],
    },
    twitter: {
      card: 'summary_large_image',
      title: t('title'),
      description: t('description'),
      images: ['https://cdn.douzepoints.app/general/og-image-2026.jpeg'],
    },
    icons: {
      icon: [
        { url: '/img/favicon-32x32.ico', sizes: '32x32', type: 'image/x-icon' },
        { url: '/img/favicon-64x64.png', sizes: '64x64', type: 'image/png' },
        {
          url: '/img/favicon-128x128.png',
          sizes: '128x128',
          type: 'image/png',
        },
        {
          url: '/img/favicon-256x256.png',
          sizes: '256x256',
          type: 'image/png',
        },
        {
          url: '/img/favicon-512x512.png',
          sizes: '512x512',
          type: 'image/png',
        },
      ],
      apple: '/img/apple-touch-icon.png',
    },
  } as Metadata;
}

export default async function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const locale = (await getLocale()) as SupportedLocale;

  // The message catalog no longer ships inline in the flight payload (it was
  // ~70 KB in every document — the entire network cost of a repeat visit).
  // The document inlines only the shell namespaces; the client fetches the
  // full catalog as a hashed static JSON, immutably cached via
  // public/_headers. Dev runs without the prebuild-generated files, so it
  // fetches from the always-current API route instead.
  const shellMessages = pickMessageNamespaces(
    await getMergedMessages(locale),
    SHELL_NAMESPACES,
  );
  const catalogUrl =
    process.env.NODE_ENV === 'development'
      ? `/api/messages/${locale}`
      : MESSAGES_CATALOG[locale].url;

  // The countries preset gates the *useful* first render — the setup screen
  // can only lay out its stages once it arrives — but the store only requests
  // it after the eager bundle has evaluated, a whole round trip later.
  // Preloading it alongside the bundle removes that serialized hop, and with
  // it a first-visit layout shift (the screen no longer paints country-less
  // and then fills in). The catalog preload rides the same reasoning: ~20 KB
  // downloading in parallel with the ~300 KB JS can never be the critical
  // path, and without it the fetch would serialize behind hydration.
  ReactDOM.preload(INITIAL_COUNTRIES_URL, {
    as: 'fetch',
    crossOrigin: 'anonymous',
  });
  ReactDOM.preload(catalogUrl, {
    as: 'fetch',
    crossOrigin: 'anonymous',
  });

  return (
    <html
      lang={locale}
      suppressHydrationWarning
      className="notranslate"
      translate="no"
    >
      <body suppressHydrationWarning translate="no" className="notranslate">
        {/* Prevent FOUC by applying stored theme */}
        <Script id="theme-fouc-prevention" strategy="beforeInteractive">{`
          try {
            var stored = localStorage.getItem('general-storage');

            if (stored) {
              var parsed = JSON.parse(stored);
              var state = parsed.state || parsed;
              var customTheme = state?.customTheme;
              var themeYear = state?.themeYear || '2026';

              var settings = state?.settings || {};
              var allowedFont = ${FOUC_FONT_ALLOWED_LITERAL};
              var fa = 'montserrat';

              if (settings.overrideThemeFont) {
                fa = (settings.overrideThemeFontAlias || 'montserrat').toLowerCase();
                if (!allowedFont[fa]) fa = 'montserrat';
              } else if (customTheme) {
                fa = (customTheme.fontAlias || 'montserrat').toLowerCase();
                if (!allowedFont[fa]) fa = 'montserrat';
              } else if (state.theme && state.theme.themeSpecifics && state.theme.themeSpecifics.fontAlias) {
                fa = String(state.theme.themeSpecifics.fontAlias).toLowerCase();
                if (!allowedFont[fa]) fa = 'montserrat';
              }

              if (customTheme) {
                document.documentElement.setAttribute('data-theme', 'custom');
                document.documentElement.style.backgroundImage = "url(" + customTheme.backgroundImageUrl + ")";
              } else if (themeYear) {
                document.documentElement.setAttribute('data-theme', themeYear);
                document.documentElement.style.backgroundImage = "url(" + state.theme.backgroundImage + ")";
              }

              document.documentElement.setAttribute('data-font', fa);

              // Custom (uploaded) fonts: inject @font-face rules and set the same
              // inline variables applyDocumentFonts() writes after hydration.
              // Mirrors buildFontFaceCss() in src/theme/customFonts.ts — keep in sync.
              var stacks = ${FOUC_FONT_STACKS_LITERAL};
              var hs = document.documentElement.style;
              var faceCss = function (s) {
                var out = [];
                for (var i = 0; i < (s.faces || []).length; i++) {
                  var f = s.faces[i];
                  if (!f || typeof f.url !== 'string' || f.url.indexOf('https://') !== 0 || /["\\\\\\s]/.test(f.url)) continue;
                  var r = f.weightRange || [f.weight, f.weight];
                  out.push("@font-face{font-family:'dp-font-" + s._id + "';src:url(\\"" + f.url + "\\") format('" + (f.format === 'woff' ? 'woff' : 'woff2') + "');font-weight:" + r[0] + " " + r[1] + ";font-style:normal;font-display:swap}");
                }
                return out.join('\\n');
              };
              var inject = function (s) {
                var id = 'dp-font-faces-' + s._id;
                if (document.getElementById(id)) return;
                var css = faceCss(s);
                if (!css) return;
                var st = document.createElement('style');
                st.id = id;
                st.textContent = css;
                document.head.appendChild(st);
              };
              var usable = function (id, s) {
                return !!(id && s && s._id === id && s.faces && s.faces.length);
              };
              if (!settings.overrideThemeFont && customTheme) {
                var cf = customTheme.customFonts || {};
                var uiStack = stacks[fa] || stacks.montserrat;
                if (usable(customTheme.fontId, cf.ui)) {
                  inject(cf.ui);
                  hs.setProperty('--dp-font-family', "'dp-font-" + cf.ui._id + "', " + uiStack);
                  hs.setProperty('--dp-font-synthesis', 'none');
                }
                var sbAlias = String(customTheme.scoreboardFontAlias || '').toLowerCase();
                var sbStack = allowedFont[sbAlias] ? stacks[sbAlias] : uiStack;
                if (usable(customTheme.scoreboardFontId, cf.scoreboard)) {
                  inject(cf.scoreboard);
                  hs.setProperty('--dp-scoreboard-font-family', "'dp-font-" + cf.scoreboard._id + "', " + sbStack);
                  hs.setProperty('--dp-scoreboard-font-synthesis', 'none');
                } else if (allowedFont[sbAlias]) {
                  hs.setProperty('--dp-scoreboard-font-family', sbStack);
                }
              } else if (!settings.overrideThemeFont && state.theme && state.theme.themeSpecifics && state.theme.themeSpecifics.scoreboardFontAlias) {
                var ysb = String(state.theme.themeSpecifics.scoreboardFontAlias).toLowerCase();
                if (allowedFont[ysb]) hs.setProperty('--dp-scoreboard-font-family', stacks[ysb]);
              }

              document.documentElement.style.backgroundSize = 'cover';
              document.documentElement.style.backgroundPosition = 'center';
              document.documentElement.style.backgroundRepeat = 'no-repeat';
            }
          } catch (e) { console.error('Failed to apply stored theme:', e); }
        `}</Script>

        <AppIntlProvider
          locale={locale}
          shellMessages={shellMessages}
          catalogUrl={catalogUrl}
        >
          <Providers>
            <AppBootstrap />
            {children}
            <ToastRoot />
            <UmamiAnalytics />
            <WebVitals />
            <IntlProvider />
          </Providers>
        </AppIntlProvider>
      </body>
    </html>
  );
}
