import React, { useMemo } from 'react';

import { useTranslations } from 'next-intl';

import type { Option } from '@/components/common/customSelect/CustomSelect';
import type { BaseCountry } from '@/models';
import { useCountriesStore } from '@/state/countriesStore';
import { useGeneralStore } from '@/state/generalStore';
import { getHostingCountryLogo, isCustomEntryCode } from '@/theme/hosting';

/**
 * Form parts shared by the contest dialogs (save / edit details, Next year):
 * fields drawn as recessed wells with their name as a caption inside.
 */
export const Field = ({
  label,
  htmlFor,
  invalid,
  className = '',
  children,
}: {
  label: string;
  htmlFor: string;
  invalid?: boolean;
  className?: string;
  children: React.ReactNode;
}) => (
  <label
    htmlFor={htmlFor}
    data-invalid={invalid || undefined}
    className={`dp-field flex flex-col justify-center gap-[3px] min-h-[48px] rounded-xl px-3 py-1.5 cursor-text ${className}`}
  >
    <span className="text-[12px] font-semibold leading-none text-white/75">
      {label}
    </span>
    {children}
  </label>
);

export const INPUT_CLASS =
  'w-full min-w-0 bg-transparent p-0 border-0 outline-none text-[16px] md:text-[14.5px] font-bold leading-[1.3] text-white';

export const FieldError = ({
  id,
  children,
}: {
  id: string;
  children: string;
}) => (
  <p
    id={id}
    role="alert"
    className="-mt-1 px-1 text-[12.5px] font-bold text-[var(--badge-red-ink)]"
  >
    {children}
  </p>
);

/**
 * Every country as a hosting-country option, with its hosting logo, and the
 * custom entries (the account's own and the open contest's) as a group of
 * their own above them: a custom entry that wins hosts next year. `extra`
 * keeps a host that isn't among them (another contest's custom entry)
 * pickable and shown.
 */
export const useHostingCountryOptions = (extra?: BaseCountry | null) => {
  const t = useTranslations('widgets.contests');
  // Built-in names: these details may be another contest's.
  const getCanonicalCountries = useCountriesStore(
    (state) => state.getCanonicalCountries,
  );
  const customCountries = useCountriesStore((state) => state.customCountries);
  const shouldUse2026WhiteHeartFlags = useGeneralStore(
    (state) => state.settings.shouldUse2026WhiteHeartFlags,
  );

  return useMemo(() => {
    const toOption = (country: BaseCountry): Option => {
      const { logo, isExisting } = getHostingCountryLogo(
        country,
        true,
        shouldUse2026WhiteHeartFlags,
      );

      return {
        label: country.name,
        value: country.code,
        imageUrl: logo,
        isExisting,
      };
    };
    const countries = getCanonicalCountries(false).map(toOption);
    const customs = [
      ...customCountries,
      ...(extra && isCustomEntryCode(extra.code) ? [extra] : []),
    ]
      .filter(
        (entry, index, all) =>
          all.findIndex((other) => other.code === entry.code) === index,
      )
      .map(toOption);

    return {
      options: [...customs, ...countries],
      groups:
        customs.length > 0
          ? [
              { label: t('hostingCustomEntries'), options: customs },
              { label: t('hostingCountries'), options: countries },
            ]
          : undefined,
    };
  }, [
    getCanonicalCountries,
    customCountries,
    extra,
    shouldUse2026WhiteHeartFlags,
    t,
  ]);
};

/** Logo sizes for the hosting-country select (`getImageClassName`). */
export const hostingOptionImageClassName = (
  option: Option,
  type: 'display' | 'select',
) =>
  type === 'display'
    ? option.isExisting
      ? '!object-contain'
      : '!h-4 rounded-[2px]'
    : option.isExisting
    ? 'w-8 h-8 !object-contain'
    : 'w-8 h-6';
