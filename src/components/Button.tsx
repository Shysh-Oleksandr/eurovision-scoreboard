import React from 'react';

type Props = {
  label: string;
  className?: string;
  onClick: () => void;
};

const Button = ({ label, className, onClick }: Props) => {
  return (
    <button
      className={`bg-blue-900 px-5 py-3 text-white font-medium uppercase rounded-md shadow-lg transition-colors duration-300 hover:bg-blue-800 ${className}`}
      onClick={onClick}
    >
      {label}
    </button>
  );
};

export default Button;
