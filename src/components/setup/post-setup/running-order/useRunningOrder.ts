import { useEffect, useMemo, useState } from 'react';

import type { Country } from '@/models';
import { shuffle } from '@/state/allocationDraw/rng';

type UseRunningOrderParams = {
  isOpen: boolean;
  stageId: string;
  stageCountries: Country[];
  savedRunningOrder?: string[];
  /** Allocation-draw halves: size of the first half, if the stage has halves. */
  savedFirstHalfSize?: number;
};

export const useRunningOrder = ({
  isOpen,
  stageId,
  stageCountries,
  savedRunningOrder,
  savedFirstHalfSize,
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

  // Halves only make sense while the saved split still fits the line-up.
  const initialFirstHalfSize = useMemo(() => {
    if (
      savedFirstHalfSize === undefined ||
      savedFirstHalfSize < 0 ||
      savedFirstHalfSize > initialOrderedCodes.length ||
      initialOrderedCodes.length < 2
    ) {
      return null;
    }

    return savedFirstHalfSize;
  }, [savedFirstHalfSize, initialOrderedCodes.length]);

  const [orderedCodes, setOrderedCodes] =
    useState<string[]>(initialOrderedCodes);
  const [firstHalfSize, setFirstHalfSize] = useState<number | null>(
    initialFirstHalfSize,
  );

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
    setFirstHalfSize(initialFirstHalfSize);
  }, [isOpen, stageId, initialOrderedCodes, initialFirstHalfSize]);

  const orderedCountries = useMemo(() => {
    const byCode = new Map(stageCountries.map((c) => [c.code, c]));

    return orderedCodes
      .map((code) => byCode.get(code))
      .filter((c): c is Country => c !== undefined && c !== null);
  }, [stageCountries, orderedCodes]);

  /**
   * Drag reorder. Across the halves divider the moved country adopts the half
   * of the country it displaced, so the split moves with it. Returns the half
   * it ended up in when that changed (for a toast), else null.
   */
  const handleRunningOrderSortEnd = (
    oldIndex: number,
    newIndex: number,
  ): 1 | 2 | null => {
    let movedToHalf: 1 | 2 | null = null;

    setOrderedCodes((prev) => {
      const next = [...prev];
      const [removed] = next.splice(oldIndex, 1);

      next.splice(newIndex, 0, removed);

      return next;
    });

    if (firstHalfSize !== null && oldIndex !== newIndex) {
      const fromFirst = oldIndex < firstHalfSize;
      const toFirst = newIndex < firstHalfSize;

      if (fromFirst && !toFirst) {
        setFirstHalfSize(firstHalfSize - 1);
        movedToHalf = 2;
      } else if (!fromFirst && toFirst) {
        setFirstHalfSize(firstHalfSize + 1);
        movedToHalf = 1;
      }
    }

    return movedToHalf;
  };

  /**
   * Draw halves the Eurovision way: a random order, ⌊n/2⌋ in the first half,
   * ⌈n/2⌉ in the second (the host's exact slot included). Returns the sizes.
   */
  const handleDrawHalves = (): { first: number; second: number } => {
    const shuffled = shuffle(orderedCodes);
    const first = Math.floor(shuffled.length / 2);

    setOrderedCodes(shuffled);
    setFirstHalfSize(first);

    return { first, second: shuffled.length - first };
  };

  const handleRemoveHalves = () => setFirstHalfSize(null);

  /** Moves a country to the first position of the other half; returns that half. */
  const handleMoveToOtherHalf = (code: string): 1 | 2 | null => {
    if (firstHalfSize === null) return null;

    const index = orderedCodes.indexOf(code);

    if (index === -1) return null;

    const toSecond = index < firstHalfSize;
    const next = orderedCodes.filter((c) => c !== code);

    if (toSecond) {
      next.splice(firstHalfSize - 1, 0, code);
      setFirstHalfSize(firstHalfSize - 1);
    } else {
      next.splice(firstHalfSize, 0, code);
      setFirstHalfSize(firstHalfSize + 1);
    }
    setOrderedCodes(next);

    return toSecond ? 2 : 1;
  };

  const handleQuickSort = (sort: 'az' | 'za' | 'shuffle' | 'reset') => {
    if (sort === 'reset') {
      setOrderedCodes(initialOrderedCodes);
      setFirstHalfSize(initialFirstHalfSize);

      return;
    }

    setOrderedCodes((prev) => {
      const byCode = new Map(stageCountries.map((c) => [c.code, c]));
      const nameOf = (code: string) => byCode.get(code)?.name ?? code;
      const sortPart = (codes: string[]) => {
        if (sort === 'shuffle') return shuffle(codes);

        return [...codes].sort((a, b) =>
          sort === 'az'
            ? nameOf(a).localeCompare(nameOf(b))
            : nameOf(b).localeCompare(nameOf(a)),
        );
      };

      // With halves, every sort stays inside its half.
      if (firstHalfSize !== null) {
        return [
          ...sortPart(prev.slice(0, firstHalfSize)),
          ...sortPart(prev.slice(firstHalfSize)),
        ];
      }

      return sortPart(prev);
    });
  };

  return {
    initialOrderedCodes,
    orderedCodes,
    setOrderedCodes,
    orderedCountries,
    firstHalfSize,
    setFirstHalfSize,
    handleRunningOrderSortEnd,
    handleQuickSort,
    handleDrawHalves,
    handleRemoveHalves,
    handleMoveToOtherHalf,
  };
};
