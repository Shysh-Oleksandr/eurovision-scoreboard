import React, {
  useRef,
  useEffect,
  useState,
  useCallback,
  ReactNode,
  useMemo,
} from 'react';

interface TabItem {
  label: string | ReactNode;
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
    const activeTabItem = tabs.find((tab) => tab.value === activeTab);

    return activeTabItem?.content || null;
  }

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
  const isSmallScreen = false;

  const containerRef = useRef<HTMLElement | null>(null);
  const [tabDimensions, setTabDimensions] = useState<
    { width: number; left: number }[]
  >([]);
  const [isInitialized, setIsInitialized] = useState(false);
  const tabRefs = useRef<(HTMLButtonElement | null)[]>([]);

  const activeTabStyle = useMemo(() => {
    const activeTabIndex = tabs.findIndex((tab) => tab.value === activeTab);
    const { width: activeTabWidth, left: activeTabLeft } = tabDimensions[
      activeTabIndex
    ] || { width: 0, left: 0 };

    return {
      width: isSmallScreen ? 'calc(100% - 10px)' : activeTabWidth || 0,
      left: isSmallScreen ? '5px' : `${activeTabLeft}px`,
    };
  }, [tabs, tabDimensions, isSmallScreen, activeTab]);

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

    let cancelled = false;

    if (document.fonts && typeof document.fonts.ready?.then === 'function') {
      document.fonts.ready.then(() => {
        if (!cancelled) {
          requestAnimationFrame(() => measureTabs());
        }
      });
    }

    return () => {
      cancelled = true;
    };
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

  useEffect(() => {
    const containerEl = containerRef.current;

    if (!containerEl || typeof ResizeObserver === 'undefined') return;

    const observer = new ResizeObserver(() => {
      requestAnimationFrame(() => measureTabs());
    });

    observer.observe(containerEl);
    tabRefs.current.forEach((ref) => ref && observer.observe(ref));

    return () => observer.disconnect();
  }, [measureTabs, tabs.length]);

  return (
    <nav
      role="tablist"
      ref={containerRef}
      className={`flex ${
        alwaysHorizontal ? 'flex-row' : 'xs:flex-row flex-col'
      } overflow-x-auto items-center py-[7px] px-[5px] gap-[6px] bg-black/25 border border-white/[0.10] rounded-[14px] w-full relative ${containerClassName}`}
    >
      {isInitialized && (
        <div
          className={`absolute inset-y-[4px] bg-gradient-to-b from-primary-700 to-primary-800 rounded-[10px] transition-all duration-[350ms] ease-in-out ${overlayClassName}`}
          style={{
            ...activeTabStyle,
            boxShadow:
              '0 1px 0 rgba(255,255,255,0.10) inset, 0 6px 16px rgba(0,0,0,0.30)',
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
          className={`flex flex-1 whitespace-nowrap items-center justify-center px-[18px] py-[11px] text-[15px] font-bold rounded-[10px] outline-none transition-colors duration-200 relative z-10 ${
            activeTab === tab.value
              ? 'text-white'
              : 'text-white/55 hover:text-white/80'
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
