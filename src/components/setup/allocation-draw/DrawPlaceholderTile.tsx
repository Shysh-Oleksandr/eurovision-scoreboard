'use client';
import { Dices, TriangleAlert } from 'lucide-react';
import { useTranslations } from 'next-intl';
import React from 'react';

/** "+N from the draw" cell at the end of a semi in draw mode; red when over capacity. */
const DrawPlaceholderTile: React.FC<{ remaining: number }> = ({
  remaining,
}) => {
  const t = useTranslations('setup.allocationDraw');
  const over = remaining < 0;

  return (
    <div
      className={`dp-tile-ph ${
        over ? 'dp-tile-ph--over' : ''
      } flex items-center gap-[9px] px-[9px] py-2 rounded-[10px] min-w-0 select-none cursor-default`}
      aria-label={
        over
          ? t('tooManyFixed', { count: -remaining })
          : t('fromTheDraw', { count: remaining })
      }
    >
      {over ? (
        <TriangleAlert className="size-4 flex-none" />
      ) : (
        <Dices className="size-4 flex-none" />
      )}
      <span className="flex-1 min-w-0 text-[13px] font-extrabold text-white truncate">
        {over
          ? t('tooManyFixed', { count: -remaining })
          : t('fromTheDraw', { count: remaining })}
      </span>
    </div>
  );
};

export default DrawPlaceholderTile;
