import React from 'react';

import Link from 'next/link';

import { ArrowIcon } from '@/assets/icons/ArrowIcon';

/** Contact address published on the website and in the store listings. */
export const CONTACT_EMAIL = 'sasha.shysh23@gmail.com';

/** Shared frame of the website-only legal pages (privacy, terms). */
export const LegalPage: React.FC<{
  title: string;
  updated: string;
  children: React.ReactNode;
}> = ({ title, updated, children }) => (
  <div className="bg-gradient-to-br text-white from-primary-950 via-primary-900 to-primary-800 h-full overflow-y-auto safe-area-padding">
    <div className="mx-auto px-4 py-8 max-w-4xl">
      <div className="bg-primary-800/50 backdrop-blur-sm rounded-2xl border border-primary-700/50 shadow-2xl overflow-hidden">
        <header className="bg-gradient-to-br from-primary-700/40 to-primary-800/60 sm:px-8 px-5 py-6 border-b border-primary-700/30">
          <Link
            href="/"
            className="text-primary-200 hover:text-white text-base mb-4 inline-flex items-center gap-2 bg-primary-900/40 hover:bg-primary-900/60 rounded-lg px-3 py-2 transition-all duration-200 border border-primary-700/30"
          >
            <ArrowIcon className="w-5 h-5 rotate-180" />
            Back
          </Link>
          <h1 className="text-4xl font-bold text-white mt-4 mb-3">{title}</h1>
          <p className="text-primary-300 text-base">Last updated: {updated}</p>
        </header>

        <div className="sm:px-8 px-5 py-8 text-primary-200 leading-relaxed space-y-4">
          {children}
        </div>
      </div>
    </div>
  </div>
);

export const H2: React.FC<{ id?: string; children: React.ReactNode }> = ({
  id,
  children,
}) => (
  <h2
    id={id}
    className="text-2xl font-bold text-white !mt-10 mb-4 border-b border-primary-700/40 pb-3 scroll-mt-4"
  >
    {children}
  </h2>
);

export const H3: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <h3 className="text-lg font-semibold text-white !mt-6">{children}</h3>
);

export const List: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <ul className="list-disc pl-6 space-y-2 marker:text-primary-400">
    {children}
  </ul>
);

export const Strong: React.FC<{ children: React.ReactNode }> = ({
  children,
}) => <strong className="text-white font-semibold">{children}</strong>;

export const A: React.FC<{ href: string; children: React.ReactNode }> = ({
  href,
  children,
}) => {
  const external = /^(https?:|mailto:)/.test(href);

  return (
    <a
      href={href}
      className="text-primary-300 hover:text-white underline transition-colors"
      {...(external && !href.startsWith('mailto:')
        ? { target: '_blank', rel: 'noopener noreferrer' }
        : {})}
    >
      {children}
    </a>
  );
};

export const Summary: React.FC<{ children: React.ReactNode }> = ({
  children,
}) => (
  <div className="bg-primary-900/40 rounded-xl p-5 border border-primary-700/30">
    {children}
  </div>
);
