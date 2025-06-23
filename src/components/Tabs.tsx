import React from 'react';

import { useMediaQuery } from '../hooks/useMediaQuery';

interface TabsProps {
  tabs: {
    label: string;
    value: string;
  }[];
  activeTab: string;
  setActiveTab: (tab: string) => void;
  containerClassName?: string;
  buttonClassName?: string;
}

const Tabs: React.FC<TabsProps> = ({
  tabs,
  activeTab,
  setActiveTab,
  containerClassName,
  buttonClassName,
}) => {
  const isSmallScreen =
    useMediaQuery('(max-width: 640px)') || window.innerWidth < 640;

  const activeTabIndex = tabs.findIndex((tab) => tab.value === activeTab);

  return (
    <nav
      className={`flex sm:flex-row flex-col overflow-x-auto items-center p-1 px-2 gap-1 md:text-lg text-base text-gray-700 bg-primary-900 rounded-xl w-full relative ${containerClassName}`}
    >
      <div
        className="absolute top-1 left-2 h-10 bg-gradient-to-tr from-[20%] from-primary-800 to-primary-700/70 rounded-lg shadow transition-all duration-[400ms] ease-in-out"
        style={{
          width: isSmallScreen
            ? 'calc(100% - 14px)'
            : `calc(100% / ${tabs.length} - ${14 / tabs.length}px)`, // 14px is the horizontal padding of `nav` element
          transform: isSmallScreen
            ? `translateY(${activeTabIndex * 100 + activeTabIndex * 10}%)`
            : `translateX(${activeTabIndex * 100}%)`,
        }}
      />

      {tabs.map((tab) => (
        <button
          key={tab.value}
          role="tab"
          type="button"
          className={`flex whitespace-nowrap items-center justify-center h-10 px-3 w-full font-medium rounded-lg outline-none transition-colors duration-300 relative z-10 ${
            activeTab === tab.value
              ? 'text-white'
              : 'text-gray-400 hover:text-white'
          } ${buttonClassName}`}
          aria-selected={activeTab === tab.value}
          onClick={() => setActiveTab(tab.value)}
        >
          {tab.label}
        </button>
      ))}
    </nav>
  );
};

export default Tabs;
