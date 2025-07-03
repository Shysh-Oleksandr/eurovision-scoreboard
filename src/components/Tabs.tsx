import React, { useRef, useEffect, useState, useCallback } from 'react';

import { useMediaQuery } from '../hooks/useMediaQuery';

interface TabsProps {
  tabs: {
    label: string;
    value: string;
    showIndicator?: boolean;
  }[];
  activeTab: string;
  setActiveTab: (tab: string) => void;
  containerClassName?: string;
  buttonClassName?: string;
  overlayClassName?: string;
}

const Tabs: React.FC<TabsProps> = ({
  tabs,
  activeTab,
  setActiveTab,
  containerClassName = '',
  buttonClassName = '',
  overlayClassName = '',
}) => {
  const isSmallScreen =
    useMediaQuery('(max-width: 479px)') || window.innerWidth < 480;

  const [tabWidths, setTabWidths] = useState<number[]>([]);
  const [activeTabLeft, setActiveTabLeft] = useState(0);
  const [isInitialized, setIsInitialized] = useState(false);
  const tabRefs = useRef<(HTMLButtonElement | null)[]>([]);

  const activeTabIndex = tabs.findIndex((tab) => tab.value === activeTab);

  const measureTabs = useCallback(() => {
    const widths: number[] = [];
    let leftPosition = 0;

    tabRefs.current.forEach((ref, index) => {
      if (ref) {
        const width = ref.offsetWidth;

        widths.push(width);

        if (index === activeTabIndex) {
          leftPosition = ref.offsetLeft;
        }
      }
    });

    setTabWidths(widths);
    setActiveTabLeft(leftPosition);
  }, [activeTabIndex]);

  useEffect(() => {
    measureTabs();
    setIsInitialized(true);
  }, [tabs, measureTabs]);

  useEffect(() => {
    const handleResize = () => {
      measureTabs();
    };

    window.addEventListener('resize', handleResize);

    return () => window.removeEventListener('resize', handleResize);
  }, [measureTabs]);

  return (
    <nav
      role="tablist"
      className={`flex xs:flex-row flex-col overflow-x-auto items-center p-1 px-2 gap-1 md:text-lg text-base text-gray-700 bg-primary-900 rounded-xl w-full relative ${containerClassName}`}
    >
      {isInitialized && (
        <div
          className={`absolute top-1 md:h-12 h-10 bg-gradient-to-tr from-[20%] from-primary-800 to-primary-700/70 rounded-lg shadow transition-all duration-[400ms] ease-in-out ${overlayClassName}`}
          style={{
            width: isSmallScreen
              ? 'calc(100% - 14px)'
              : tabWidths[activeTabIndex] || 0,
            left: isSmallScreen ? '6px' : `${activeTabLeft}px`,
            transform: isSmallScreen
              ? `translateY(${activeTabIndex * 100 + activeTabIndex * 10}%)`
              : 'none',
          }}
        />
      )}

      {tabs.map((tab, index) => (
        <button
          key={tab.value}
          ref={(el) => (tabRefs.current[index] = el)}
          role="tab"
          type="button"
          className={`flex whitespace-nowrap items-center justify-center md:h-12 h-10 px-3 w-full font-medium rounded-lg outline-none transition-colors duration-300 relative z-10 ${
            activeTab === tab.value
              ? 'text-white'
              : 'text-gray-400 hover:text-white'
          } ${buttonClassName}`}
          aria-selected={activeTab === tab.value}
          onClick={() => setActiveTab(tab.value)}
        >
          <span className="relative">
            {tab.label}
            {tab.showIndicator && (
              <div className="absolute -top-1 -right-4 w-3.5 h-3.5 bg-primary-700 rounded-full animate-pulse" />
            )}
          </span>
        </button>
      ))}
    </nav>
  );
};

export default Tabs;
