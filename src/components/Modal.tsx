import React, { useEffect, useState } from 'react';

interface ModalProps {
  isOpen: boolean;
  onClose?: () => void;
  children: React.ReactNode;
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
  bottomContent,
  containerClassName,
  contentClassName,
  overlayClassName,
  openDelay,
}) => {
  const [shouldShow, setShouldShow] = useState(false);
  // TODO: fix animation
  const [isAnimating, setIsAnimating] = useState(false);

  useEffect(() => {
    if (isOpen) {
      if (openDelay) {
        // If delay is specified, wait before showing
        const timer = setTimeout(() => {
          setShouldShow(true);
          setIsAnimating(true);
        }, openDelay);

        return () => clearTimeout(timer);
      }
      // No delay, show immediately
      setShouldShow(true);
      setIsAnimating(true);
    } else {
      // Hide immediately when isOpen becomes false
      setShouldShow(false);
      setIsAnimating(false);
    }
  }, [isOpen, openDelay]);

  if (!shouldShow) return null;

  return (
    <div
      className={`fixed inset-0 flex items-center justify-center z-[100] transition-opacity duration-300 ${
        isAnimating ? 'bg-black bg-opacity-60' : 'bg-black bg-opacity-0'
      } ${overlayClassName}`}
      onClick={onClose}
    >
      <div
        className={`bg-primary-950 bg-gradient-to-bl from-primary-950 to-primary-900 overflow-hidden rounded-lg lg:max-w-5xl md:max-w-4xl md:mx-10 xs:mx-6 mx-4 w-full transition-transform duration-300 ${
          isAnimating ? 'scale-100' : 'scale-95'
        } ${containerClassName}`}
        onClick={(e) => e.stopPropagation()}
      >
        <div
          className={`max-h-[80vh] overflow-y-auto scrollbar md:p-6 xs:p-5 p-3 py-5 ${contentClassName}`}
        >
          {children}
        </div>
        {bottomContent}
      </div>
    </div>
  );
};

export default Modal;
