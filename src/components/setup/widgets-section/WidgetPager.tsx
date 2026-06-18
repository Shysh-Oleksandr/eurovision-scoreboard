import { useTranslations } from 'next-intl';
import React from 'react';

interface WidgetPagerProps {
  page: number;
  totalPages: number;
  onPrev: () => void;
  onNext: () => void;
}

const pagerBtnClass =
  'text-[13px] font-bold tracking-[0.06em] uppercase text-white/70 bg-white/[0.06] border border-white/[0.10] rounded-[10px] px-[18px] py-[9px] transition-colors hover:text-white hover:bg-white/[0.10] disabled:opacity-40 disabled:cursor-not-allowed';

const WidgetPager: React.FC<WidgetPagerProps> = ({
  page,
  totalPages,
  onPrev,
  onNext,
}) => {
  const t = useTranslations();

  return (
    <div className="flex items-center justify-center gap-[14px] pt-2">
      <button
        type="button"
        onClick={onPrev}
        disabled={page === 1}
        className={pagerBtnClass}
      >
        {t('widgets.previous')}
      </button>
      <span className="text-[13px] font-semibold text-white/55">
        {t('widgets.pageNOfM', { page, totalPages })}
      </span>
      <button
        type="button"
        onClick={onNext}
        disabled={page === totalPages}
        className={pagerBtnClass}
      >
        {t('widgets.next')}
      </button>
    </div>
  );
};

export default WidgetPager;
