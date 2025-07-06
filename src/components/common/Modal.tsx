import React, { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';

interface ModalProps {
  isOpen: boolean;
  onClose?: () => void;
  children: React.ReactNode;
  topContent?: React.ReactNode;
  bottomContent?: React.ReactNode;
  containerClassName?: string;
  contentClassName?: string;
  overlayClassName?: string;
  openDelay?: number; // Delay in milliseconds before opening the modal
}

const Modal: React.FC<ModalProps> = ({
  isOpen,
  onClose,
  children,
  topContent,
  bottomContent,
  containerClassName = '',
  contentClassName = '',
  overlayClassName = '',
  openDelay,
}) => {
  const [isMounted, setIsMounted] = useState(false);
  const [isActive, setIsActive] = useState(false);

  useEffect(() => {
    let openTimeoutId: number;
    let closeTimeoutId: number;

    if (isOpen) {
      setIsMounted(true);
      const timeout = openDelay ?? 10;

      openTimeoutId = window.setTimeout(() => {
        setIsActive(true);
      }, timeout);
    } else {
      setIsActive(false);
      closeTimeoutId = window.setTimeout(() => {
        setIsMounted(false);
      }, 200); // Animation duration
    }

    return () => {
      window.clearTimeout(openTimeoutId);
      window.clearTimeout(closeTimeoutId);
    };
  }, [isOpen, openDelay]);

  if (!isMounted) {
    return null;
  }

  const modalContent = (
    <div
      className={`fixed inset-0 flex items-center justify-center z-[100] transition-all duration-[200ms] ${
        isActive ? 'bg-black bg-opacity-60' : 'bg-opacity-0'
      } ${overlayClassName}`}
      onClick={isActive ? onClose : undefined}
      style={{ pointerEvents: isActive ? 'auto' : 'none' }}
    >
      <div
        className={`bg-primary-950 bg-gradient-to-bl from-primary-950 to-primary-900 overflow-hidden rounded-lg lg:max-w-5xl md:max-w-4xl md:mx-10 xs:mx-6 mx-4 w-full transition-all duration-[200ms] ${
          isActive ? 'scale-100 opacity-100' : 'scale-95 opacity-0'
        } ${containerClassName}`}
        onClick={(e) => e.stopPropagation()}
      >
        {topContent}
        <div
          className={`overflow-y-auto sm:max-h-[calc(90vh-70px)] max-h-[calc(95vh-70px)] md:p-6 xs:p-5 p-3 py-5 ${contentClassName}`}
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
