import React from 'react';

type SelectBoxProps = {
  options: { label: string; value: string }[];
  value: string;
  onChange: (event: React.ChangeEvent<HTMLSelectElement>) => void;
  className?: string;
  id?: string;
};

/**
 * A select box component.
 *
 * @param options - An array of objects containing the label and value of each option.
 * @param value - The current value of the select box.
 * @param onChange - The change handler function for the select box.
 * @returns The select box component.
 */
const SelectBox: React.FC<SelectBoxProps> = ({
  options,
  value,
  onChange,
  className,
  id,
}) => {
  return (
    <select
      id={id}
      value={value}
      onChange={onChange}
      className={`select lg:text-base md:text-sm text-xs lg:px-5 md:px-4 sm:px-3 px-3 lg:py-3 py-[10px] w-[120px] ${className}`}
    >
      {options.map((option) => (
        <option key={option.value} value={option.value}>
          {option.label}
        </option>
      ))}
    </select>
  );
};

export default SelectBox;
