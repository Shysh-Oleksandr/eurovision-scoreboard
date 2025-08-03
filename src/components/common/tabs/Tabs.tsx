import React, {
  useRef,
  useEffect,
  useState,
  useCallback,
  ReactNode,
} from 'react';

import { useMediaQuery } from '../../../hooks/useMediaQuery';

interface TabItem {
  label: string;
  value: string;
  showIndicator?: boolean;
  content?: ReactNode;
}

interface TabsProps {
  tabs: TabItem[];
  activeTab: string;
  setActiveTab: (tab: string) => void;
  containerClassName?: string;
  buttonClassName?: string;
  overlayClassName?: string;
  alwaysHorizontal?: boolean;
}

interface TabContentProps {
  tabs: TabItem[];
  activeTab: string;
  preserveContent?: boolean;
}

const TabContent: React.FC<TabContentProps> = ({
  tabs,
  activeTab,
  preserveContent = false,
}) => {
  if (!preserveContent) {
    // Return only the active tab content
    const activeTabItem = tabs.find((tab) => tab.value === activeTab);

    return activeTabItem?.content || null;
  }

  // Preserve all tab content, only hide inactive ones
  return (
    <>
      {tabs.map((tab) => (
        <div
          key={tab.value}
          className={`${tab.value === activeTab ? 'block' : 'hidden'}`}
        >
          {tab.content}
        </div>
      ))}
    </>
  );
};

const Tabs: React.FC<TabsProps> = ({
  tabs,
  activeTab,
  setActiveTab,
  containerClassName = '',
  buttonClassName = '',
  overlayClassName = '',
  alwaysHorizontal = true,
}) => {
  const isSmallScreen =
    useMediaQuery('(max-width: 479px)') && !alwaysHorizontal;

  const [tabDimensions, setTabDimensions] = useState<
    { width: number; left: number }[]
  >([]);
  const [isInitialized, setIsInitialized] = useState(false);
  const tabRefs = useRef<(HTMLButtonElement | null)[]>([]);

  const activeTabIndex = tabs.findIndex((tab) => tab.value === activeTab);
  const { width: activeTabWidth, left: activeTabLeft } = tabDimensions[
    activeTabIndex
  ] || { width: 0, left: 0 };

  const measureTabs = useCallback(() => {
    const dimensions = tabRefs.current.map((ref) => {
      if (!ref) return { width: 0, left: 0 };

      return { width: ref.offsetWidth, left: ref.offsetLeft };
    });

    setTabDimensions(dimensions);
    setIsInitialized(true);
  }, []);

  useEffect(() => {
    measureTabs();
  }, [tabs, measureTabs]);

  useEffect(() => {
    let timeoutId: number;
    const handleResize = () => {
      clearTimeout(timeoutId);
      timeoutId = window.setTimeout(() => measureTabs(), 150);
    };

    window.addEventListener('resize', handleResize);

    return () => {
      clearTimeout(timeoutId);
      window.removeEventListener('resize', handleResize);
    };
  }, [measureTabs]);

  return (
    <nav
      role="tablist"
      className={`flex ${
        alwaysHorizontal ? 'flex-row' : 'xs:flex-row flex-col'
      } overflow-x-auto items-center p-1 px-2 gap-1 md:text-lg text-base text-gray-700 bg-primary-900 rounded-xl w-full relative ${containerClassName}`}
    >
      {isInitialized && (
        <div
          className={`absolute top-1 md:h-12 h-10 bg-gradient-to-tr from-[20%] from-primary-800 to-primary-700/70 rounded-lg shadow transition-all duration-[400ms] ease-in-out ${overlayClassName}`}
          style={{
            width: isSmallScreen ? 'calc(100% - 14px)' : activeTabWidth || 0,
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
          ref={(el) => {
            tabRefs.current[index] = el;
          }}
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

export { TabContent };
export default Tabs;
