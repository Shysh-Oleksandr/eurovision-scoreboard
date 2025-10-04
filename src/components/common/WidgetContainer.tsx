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
      className={`min-w-[200px] flex-1 bg-primary-900 rounded-lg p-3 text-white border border-primary-800 shadow-lg border-solid ${
        disabled
          ? 'opacity-50 !cursor-not-allowed'
          : 'hover:bg-primary-800 transition-colors duration-300 cursor-pointer'
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
