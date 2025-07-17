import React, { useState, useRef } from 'react';

import { useOnClickOutside } from '@/hooks/useOnClickOutside';
import { useTouchDevice } from '@/hooks/useTouchDevice';

interface TooltipProps {
  content: React.ReactNode;
  children: React.ReactElement;
  className?: string;
}

export const Tooltip: React.FC<TooltipProps> = ({
  children,
  content,
  className,
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const isTouchDevice = useTouchDevice();
  const tooltipRef = useRef<HTMLDivElement>(null);

  useOnClickOutside(tooltipRef, () => setIsOpen(false), isTouchDevice);

  const handleMouseEnter = () => {
    if (!isTouchDevice) {
      setIsOpen(true);
    }
  };

  const handleMouseLeave = () => {
    if (!isTouchDevice) {
      setIsOpen(false);
    }
  };

  const handleToggle = () => {
    if (isTouchDevice) {
      setIsOpen((prev) => !prev);
    }
  };

  return (
    <div
      ref={tooltipRef}
      className="relative flex items-center double-clickable-area"
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
      onClick={handleToggle}
    >
      {children}
      {isOpen && (
        <div
          className={`absolute top-full right-0 mt-2 bg-primary-900 bg-gradient-to-tl from-primary-900 to-primary-800/70 text-white text-sm rounded-md px-3 py-2 z-50 w-[min(300px,80vw)] shadow-xl ${className}`}
        >
          {content}
        </div>
      )}
    </div>
  );
};
