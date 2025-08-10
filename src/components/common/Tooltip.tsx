import React, { useState, useRef, useEffect } from 'react';
import { createPortal } from 'react-dom';

import { useOnClickOutside } from '@/hooks/useOnClickOutside';
import { useTouchDevice } from '@/hooks/useTouchDevice';

interface TooltipProps {
  content: React.ReactNode;
  children: React.ReactElement;
  className?: string;
  position?: 'left' | 'right' | 'center';
}

export const Tooltip: React.FC<TooltipProps> = ({
  children,
  content,
  className = '',
  position = 'left',
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [tooltipStyle, setTooltipStyle] = useState<React.CSSProperties>({});
  const isTouchDevice = useTouchDevice();
  const triggerRef = useRef<HTMLDivElement>(null);
  const tooltipRef = useRef<HTMLDivElement>(null);

  useOnClickOutside(tooltipRef, () => setIsOpen(false), isTouchDevice);

  // Calculate tooltip position when it opens
  useEffect(() => {
    if (isOpen && triggerRef.current) {
      const triggerRect = triggerRef.current.getBoundingClientRect();
      const tooltipElement = tooltipRef.current;

      if (tooltipElement) {
        const tooltipRect = tooltipElement.getBoundingClientRect();

        let left: number;

        // Calculate top position (below the trigger)
        const top = triggerRect.bottom + window.scrollY + 8; // 8px margin

        // Calculate left position based on position prop
        switch (position) {
          case 'left':
            left = triggerRect.right + window.scrollX - triggerRect.width;
            break;
          case 'right':
            left =
              triggerRect.left +
              window.scrollX -
              tooltipRect.width +
              triggerRect.width;
            break;
          case 'center':
          default:
            left =
              triggerRect.left +
              window.scrollX +
              triggerRect.width / 2 -
              tooltipRect.width / 2;
            break;
        }

        // Ensure tooltip doesn't go off-screen
        const viewportWidth = window.innerWidth;
        const tooltipWidth = tooltipRect.width;

        if (left < 0) {
          left = 8; // 8px margin from left edge
        } else if (left + tooltipWidth > viewportWidth) {
          left = viewportWidth - tooltipWidth - 8; // 8px margin from right edge
        }

        setTooltipStyle({
          position: 'fixed',
          left: `${left}px`,
          top: `${top}px`,
          zIndex: 9999,
        });
      }
    }
  }, [isOpen, position]);

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
    <>
      <div
        ref={triggerRef}
        className="relative flex items-center double-clickable-area"
        onMouseEnter={handleMouseEnter}
        onMouseLeave={handleMouseLeave}
        onClick={handleToggle}
      >
        {children}
      </div>
      {isOpen &&
        createPortal(
          <div
            ref={tooltipRef}
            className={`bg-primary-900 bg-gradient-to-tl from-primary-900 to-primary-800/70 text-white text-sm rounded-md px-3 py-2 w-[min(300px,80vw)] shadow-xl ${className}`}
            style={tooltipStyle}
          >
            {content}
          </div>,
          document.body,
        )}
    </>
  );
};
