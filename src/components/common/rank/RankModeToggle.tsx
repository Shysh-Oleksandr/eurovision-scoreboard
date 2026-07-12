import React from 'react';

export interface RankModeTab<T extends string> {
  value: T;
  label: string;
}

interface RankModeToggleProps<T extends string> {
  tabs: RankModeTab<T>[];
  activeTab: T;
  onChange: (tab: T) => void;
  className?: string;
}

/**
 * Underlined segmented toggle used to switch between an entry view and a
 * drag-to-rank view (e.g. "Numbers | Rank" in odds settings, "Detailed | Rank"
 * in the voting predefinition modal). Extracted so both features stay in sync.
 */
export function RankModeToggle<T extends string>({
  tabs,
  activeTab,
  onChange,
  className,
}: RankModeToggleProps<T>) {
  return (
    <div className={`flex gap-6 ${className ?? ''}`}>
      {tabs.map((tab) => (
        <button
          key={tab.value}
          type="button"
          onClick={() => onChange(tab.value)}
          className="relative pb-3 pt-1.5 text-[14px] font-bold bg-transparent border-none cursor-pointer transition-colors duration-150"
          style={{
            color: activeTab === tab.value ? '#fff' : 'rgba(255,255,255,.46)',
          }}
        >
          {tab.label}
          {activeTab === tab.value && (
            <span className="absolute left-0 right-0 bottom-0 h-[2px] rounded-t-[2px] bg-primary-700/80" />
          )}
        </button>
      ))}
    </div>
  );
}

export default RankModeToggle;
