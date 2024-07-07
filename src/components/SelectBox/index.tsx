import React, { useState } from 'react';

/**
 * A select box component.
 *
 * @param options - An array of objects containing the label and value of each option.
 * @param defaultValue - The default value of the select box.
 * @returns The select box component.
 */
const SelectBox: React.FC<{
  options: { label: string; value: string }[];
  defaultValue: string;
}> = ({ options, defaultValue }): JSX.Element => {
  const [selectedValue, setSelectedValue] = useState<string>(defaultValue);

  const handleChange = (event: React.ChangeEvent<HTMLSelectElement>): void => {
    setSelectedValue(event.target.value);
  };

  return (
    <select
      value={selectedValue}
      onChange={handleChange}
      className="select lg:text-base md:text-sm text-xs lg:px-5 md:px-4 sm:px-3 px-3 lg:py-3 py-[10px] w-[120px]"
    >
      {options.map((option) => (
        <option key={option.label} value={option.value}>
          {option.label}
        </option>
      ))}
    </select>
  );
};

export default SelectBox;
