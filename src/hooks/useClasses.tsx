import clsx, { ClassValue } from 'clsx';
import { useMemo } from 'react';
import { extendTailwindMerge } from 'tailwind-merge';

const customTwMerge = extendTailwindMerge({});

export const tailwindMerge = (...classes: ClassValue[]) =>
  customTwMerge(clsx(classes));

const useClasses = (...classes: ClassValue[]) => {
  return useMemo(() => tailwindMerge(classes), [classes]);
};

export default useClasses;
