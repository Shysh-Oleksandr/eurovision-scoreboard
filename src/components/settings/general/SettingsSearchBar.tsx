import { Search, X } from 'lucide-react';
import { useTranslations } from 'next-intl';
import React from 'react';

interface SettingsSearchBarProps {
  value: string;
  onChange: (value: string) => void;
}

export const SettingsSearchBar: React.FC<SettingsSearchBarProps> = ({
  value,
  onChange,
}) => {
  const t = useTranslations();

  return (
    <div className="sticky top-0 z-20 -mx-2 px-2 pb-2 pt-1 backdrop-blur-sm mb-2">
      <div className="flex h-11 items-center gap-2 rounded-[12px] border border-white/10 bg-black/25 px-3 focus-within:border-white/30">
        <Search size={18} className="shrink-0 text-white/40" />
        <input
          type="text"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={t('settings.general2.searchPlaceholder')}
          className="h-full w-full bg-transparent text-[14.5px] font-semibold text-white outline-none placeholder:text-white/40"
        />
        {value && (
          <button
            type="button"
            aria-label={t('common.clear')}
            onClick={() => onChange('')}
            className="shrink-0 text-white/40 transition-colors hover:text-white"
          >
            <X size={18} />
          </button>
        )}
      </div>
    </div>
  );
};
