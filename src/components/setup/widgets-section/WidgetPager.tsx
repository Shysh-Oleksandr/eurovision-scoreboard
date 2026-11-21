import { ChevronLeft, ChevronRight } from 'lucide-react';
import { useTranslations } from 'next-intl';
import React from 'react';

interface WidgetPagerProps {
  page: number;
  totalPages: number;
  onPrev: () => void;
  onNext: () => void;
}

const pagerBtnClass =
  'inline-flex items-center gap-1.5 h-10 rounded-xl bg-white/[0.06] border border-white/10 text-white text-[13px] font-bold transition-colors hover:bg-white/[0.11] focus-visible:outline focus-visible:outline-2 focus-visible:outline-accent disabled:opacity-40 disabled:cursor-not-allowed disabled:hover:bg-white/[0.06]';

/** Previous / "Page 2 of 6" / Next under a library or profile list. */
const WidgetPager: React.FC<WidgetPagerProps> = ({
  page,
  totalPages,
  onPrev,
  onNext,
}) => {
  const t = useTranslations();

  return (
    <div className="flex items-center justify-center gap-3 pt-2">
      <button
        type="button"
        onClick={onPrev}
        disabled={page === 1}
        className={`${pagerBtnClass} pl-2.5 pr-3.5`}
      >
        <ChevronLeft className="size-4" aria-hidden="true" />
        {t('widgets.previous')}
      </button>
      <span className="text-[13px] font-semibold text-white/70 tabular-nums">
        {t('widgets.pageNOfM', { page, totalPages })}
      </span>
      <button
        type="button"
        onClick={onNext}
        disabled={page === totalPages}
        className={`${pagerBtnClass} pl-3.5 pr-2.5`}
      >
        {t('widgets.next')}
        <ChevronRight className="size-4" aria-hidden="true" />
      </button>
    </div>
  );
};

export default WidgetPager;
