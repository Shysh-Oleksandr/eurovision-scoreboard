import React from 'react';

interface SectionWrapperProps {
  title: string;
  countriesCount?: number;
  children: React.ReactNode;
}

const SectionWrapper: React.FC<SectionWrapperProps> = ({
  children,
  title,
  countriesCount,
}) => {
  return (
    <div className="bg-primary-800 bg-gradient-to-tl from-primary-900 to-primary-800 p-4 rounded-lg">
      <div className="flex justify-between items-center mb-2">
        <h3 className="text-lg font-semibold text-white">{title}</h3>
        {countriesCount !== undefined && (
          <span className="bg-primary-800 text-white px-2 py-1 rounded-md shadow text-sm">
            {countriesCount} countries
          </span>
        )}
      </div>

      {children}
    </div>
  );
};

export default SectionWrapper;
