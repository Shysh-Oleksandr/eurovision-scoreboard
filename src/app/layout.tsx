import './globals.css';

import type { Metadata } from 'next';

import { UmamiAnalytics } from './analytics';
import AppBootstrap from './app-bootstrap';
import Providers from './providers';
import ToastRoot from './toast-root';

export const metadata: Metadata = {
  metadataBase: new URL('https://douzepoints.app'),
  title: 'DouzePoints - Eurovision Scoreboard Simulator',
  description:
    'Experience the excitement of Eurovision with DouzePoints, the interactive scoreboard simulator. Vote for countries, watch points accumulate, and relive the magic of Eurovision Song Contest from 2004-2025.',
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
    title: 'DouzePoints - Eurovision Scoreboard Simulator',
    description:
      'Experience the excitement of Eurovision with DouzePoints, the interactive scoreboard simulator. Vote for countries, watch points accumulate, and relive the magic of Eurovision Song Contest from 2004-2025.',
    siteName: 'DouzePoints',
    locale: 'en_US',
    images: ['https://cdn.douzepoints.app/general/new-og-image.png'],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'DouzePoints - Eurovision Scoreboard Simulator',
    description:
      'Experience the excitement of Eurovision with DouzePoints, the interactive scoreboard simulator. Vote for countries, watch points accumulate, and relive the magic of Eurovision Song Contest from 2004-2025.',
    images: ['https://cdn.douzepoints.app/general/new-og-image.png'],
  },
  icons: {
    icon: [
      { url: '/img/favicon-16x16.png', sizes: '16x16', type: 'image/png' },
      { url: '/img/favicon-32x32.png', sizes: '32x32', type: 'image/png' },
      { url: '/img/favicon-64x64.png', sizes: '64x64', type: 'image/png' },
      { url: '/img/favicon-128x128.png', sizes: '128x128', type: 'image/png' },
      { url: '/img/favicon-256x256.png', sizes: '256x256', type: 'image/png' },
      { url: '/img/favicon-512x512.png', sizes: '512x512', type: 'image/png' },
    ],
    apple: '/img/apple-touch-icon.png',
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body>
        {/* <Script id="theme-fouc-prevention" strategy="beforeInteractive">{`
          try {
            var stored = localStorage.getItem('general-storage');
            if (stored) {
              var parsed = JSON.parse(stored);
              var state = parsed.state || parsed;
              var customTheme = state?.customTheme;
              var themeYear = state?.themeYear || '2025';
              if (customTheme) {
                document.documentElement.setAttribute('data-theme', 'custom');
              } else if (themeYear) {
                document.documentElement.setAttribute('data-theme', themeYear);
              }
            }
          } catch (e) { console.error('Failed to apply stored theme:', e); }
        `}</Script> */}

        <Providers>
          <AppBootstrap />
          {children}
          <ToastRoot />
          <UmamiAnalytics />
        </Providers>
      </body>
    </html>
  );
}
