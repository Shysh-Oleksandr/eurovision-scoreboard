import React, { useEffect, useMemo, useState } from 'react';
import { createPortal } from 'react-dom';

import { useMediaQuery } from '@/hooks/useMediaQuery';

export const ANIMATION_DURATION = 200;

interface ModalProps {
  isOpen: boolean;
  onClose?: () => void;
  onClosed?: () => void;
  children: React.ReactNode;
  topContent?: React.ReactNode;
  bottomContent?: React.ReactNode;
  containerClassName?: string;
  contentClassName?: string;
  overlayClassName?: string;
  openDelay?: number; // Delay in milliseconds before opening the modal
  dataTheme?: string;
  ref?: React.RefObject<HTMLDivElement | null>;
}

const Modal: React.FC<ModalProps> = ({
  isOpen,
  onClose,
  onClosed,
  children,
  topContent,
  bottomContent,
  containerClassName = '',
  contentClassName = '',
  overlayClassName = '',
  openDelay,
  ref,
  dataTheme,
}) => {
  const [isMounted, setIsMounted] = useState(false);
  const [isActive, setIsActive] = useState(false);

  const isMobileInLandscape = useMediaQuery(
    '(max-height: 480px) and (orientation: landscape)',
  );

  useEffect(() => {
    let openTimeoutId: number;
    let closeTimeoutId: number;

    if (isOpen) {
      setIsMounted(true);
      const timeout = openDelay ?? 50;

      openTimeoutId = window.setTimeout(() => {
        setIsActive(true);
      }, timeout);
    } else {
      setIsActive(false);
      closeTimeoutId = window.setTimeout(() => {
        setIsMounted(false);
        if (onClosed) {
          onClosed();
        }
      }, ANIMATION_DURATION);
    }

    return () => {
      window.clearTimeout(openTimeoutId);
      window.clearTimeout(closeTimeoutId);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen, openDelay]);

  const modalHeightStyle = useMemo(() => {
    if (isMobileInLandscape) {
      if (topContent) return '!max-h-[calc(80vh-140px)]';

      return '!max-h-[calc(80vh-100px)]';
    }

    return 'sm:!max-h-[calc(90vh-70px)] max-h-[calc(90vh-110px)]';
  }, [isMobileInLandscape, topContent]);

  if (!isMounted) {
    return null;
  }

  const modalContent = (
    <div
      className={`fixed inset-0 flex items-center justify-center z-[100] transition-colors duration-[200ms] ${
        isActive ? 'bg-black bg-opacity-60' : 'bg-opacity-0'
      } ${overlayClassName}`}
      onClick={isActive ? onClose : undefined}
      style={{ pointerEvents: isActive ? 'auto' : 'none' }}
    >
      <div
        data-theme={dataTheme}
        className={`bg-primary-950 bg-gradient-to-bl from-primary-950 to-primary-900 overflow-hidden rounded-lg lg:max-w-5xl md:max-w-4xl md:mx-10 xs:mx-6 mx-3 w-full transition-all duration-[200ms] ${
          isActive ? 'scale-100 opacity-100' : 'scale-95 opacity-0'
        } ${containerClassName}`}
        onClick={(e) => e.stopPropagation()}
        ref={ref}
      >
        {topContent}
        <div
          className={`overflow-y-auto md:p-6 xs:p-5 p-3 py-5 narrow-scrollbar ${modalHeightStyle} ${contentClassName}`}
        >
          {children}
        </div>
        {bottomContent}
      </div>
    </div>
  );

  // Use portal to render modal at document body level to avoid nesting issues
  return createPortal(modalContent, document.body);
};

export default Modal;
