import React, { useMemo } from 'react';

import type { Option } from '@/components/common/customSelect/CustomSelect';
import { useCountriesStore } from '@/state/countriesStore';
import { useGeneralStore } from '@/state/generalStore';
import { getHostingCountryLogo } from '@/theme/hosting';

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

/** Every country as a hosting-country option, with its hosting logo. */
export const useHostingCountryOptions = () => {
  // Built-in names: these details may be another contest's.
  const getCanonicalCountries = useCountriesStore(
    (state) => state.getCanonicalCountries,
  );
  const shouldUse2026WhiteHeartFlags = useGeneralStore(
    (state) => state.settings.shouldUse2026WhiteHeartFlags,
  );

  return useMemo(
    () =>
      getCanonicalCountries(false).map((country) => {
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
      }),
    [getCanonicalCountries, shouldUse2026WhiteHeartFlags],
  );
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
