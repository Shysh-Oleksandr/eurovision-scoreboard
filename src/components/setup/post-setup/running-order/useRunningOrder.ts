import { useEffect, useMemo, useState } from 'react';

import type { Country } from '@/models';

type UseRunningOrderParams = {
  isOpen: boolean;
  stageId: string;
  stageCountries: Country[];
  savedRunningOrder?: string[];
};

export const useRunningOrder = ({
  isOpen,
  stageId,
  stageCountries,
  savedRunningOrder,
}: UseRunningOrderParams) => {
  const initialOrderedCodes = useMemo(() => {
    const baseOrder =
      savedRunningOrder && savedRunningOrder.length > 0
        ? savedRunningOrder
        : stageCountries
            .slice()
            .sort((a, b) => a.name.localeCompare(b.name))
            .map((c) => c.code);
    const currentCodes = stageCountries.map((c) => c.code);
    const newCodes = currentCodes
      .filter((c) => !baseOrder.includes(c))
      .sort((a, b) => {
        const aCountry = stageCountries.find((x) => x.code === a);
        const bCountry = stageCountries.find((x) => x.code === b);

        return (aCountry?.name ?? a).localeCompare(bCountry?.name ?? b);
      });

    return [...baseOrder.filter((c) => currentCodes.includes(c)), ...newCodes];
  }, [savedRunningOrder, stageCountries]);

  const [orderedCodes, setOrderedCodes] = useState<string[]>(initialOrderedCodes);

  useEffect(() => {
    if (!isOpen) return;

    setOrderedCodes((prev) => {
      if (
        prev.length === initialOrderedCodes.length &&
        prev.every((c, i) => c === initialOrderedCodes[i])
      ) {
        return prev;
      }

      return initialOrderedCodes;
    });
  }, [isOpen, stageId, initialOrderedCodes]);

  const orderedCountries = useMemo(() => {
    const byCode = new Map(stageCountries.map((c) => [c.code, c]));

    return orderedCodes
      .map((code) => byCode.get(code))
      .filter((c): c is Country => c !== undefined && c !== null);
  }, [stageCountries, orderedCodes]);

  const handleRunningOrderSortEnd = (oldIndex: number, newIndex: number) => {
    setOrderedCodes((prev) => {
      const next = [...prev];
      const [removed] = next.splice(oldIndex, 1);

      next.splice(newIndex, 0, removed);

      return next;
    });
  };

  const handleQuickSort = (sort: 'az' | 'za' | 'shuffle' | 'reset') => {
    if (sort === 'reset') {
      setOrderedCodes(initialOrderedCodes);
      return;
    }

    setOrderedCodes((prev) => {
      const next = [...prev];
      const byCode = new Map(stageCountries.map((c) => [c.code, c]));

      next.sort((a, b) => {
        if (sort === 'az') {
          const aName = byCode.get(a)?.name ?? a;
          const bName = byCode.get(b)?.name ?? b;

          return aName.localeCompare(bName);
        }

        if (sort === 'za') {
          const aName = byCode.get(a)?.name ?? a;
          const bName = byCode.get(b)?.name ?? b;

          return bName.localeCompare(aName);
        }

        return Math.random() - 0.5;
      });

      return next;
    });
  };

  return {
    initialOrderedCodes,
    orderedCodes,
    setOrderedCodes,
    orderedCountries,
    handleRunningOrderSortEnd,
    handleQuickSort,
  };
};

