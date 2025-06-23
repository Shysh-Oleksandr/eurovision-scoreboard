import React from 'react';

interface ModalProps {
  isOpen: boolean;
  onClose?: () => void;
  children: React.ReactNode;
  bottomContent?: React.ReactNode;
  containerClassName?: string;
  contentClassName?: string;
  overlayClassName?: string;
}

const Modal: React.FC<ModalProps> = ({
  isOpen,
  onClose,
  children,
  bottomContent,
  containerClassName,
  contentClassName,
  overlayClassName,
}) => {
  if (!isOpen) return null;

  return (
    <div
      className={`fixed inset-0 bg-black bg-opacity-60 flex items-center justify-center z-[100] ${overlayClassName}`}
      onClick={onClose}
    >
      <div
        className={`bg-primary-950 bg-gradient-to-bl from-primary-950 to-primary-900 overflow-hidden rounded-lg lg:max-w-5xl md:max-w-4xl md:mx-10 xs:mx-6 mx-4 w-full ${containerClassName}`}
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
