import React from 'react';

type WidgetContainerProps = {
  onClick: () => void;
  title: string;
  description: string;
  icon: React.ReactNode;
  disabled?: boolean;
  children?: React.ReactNode;
};

const WidgetContainer = ({
  onClick,
  title,
  description,
  icon,
  disabled,
  children,
}: WidgetContainerProps) => {
  return (
    <div
      className={`bg-primary-900 rounded-lg p-3 text-white border border-primary-800 shadow-lg border-solid hover:bg-primary-800 transition-colors duration-300 cursor-pointer ${
        disabled ? 'opacity-50 !cursor-not-allowed' : ''
      }`}
      onClick={() => {
        if (disabled) return;

        onClick();
      }}
    >
      <div className="flex items-center justify-center gap-2">
        {icon}
        <h5 className="text-base font-semibold">{title}</h5>
      </div>
      <p className="text-sm text-white/50 text-center">{description}</p>
      {children}
    </div>
  );
};

export default WidgetContainer;
