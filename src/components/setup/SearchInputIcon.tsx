import React from 'react';

interface SearchInputIconProps {
  showClearIcon: boolean;
  onClick: () => void;
}

const SearchIcon = () => (
  <svg
    width="20"
    height="20"
    viewBox="0 0 15 15"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
  >
    <path
      d="M10 6.5C10 8.433 8.433 10 6.5 10C4.567 10 3 8.433 3 6.5C3 4.567 4.567 3 6.5 3C8.433 3 10 4.567 10 6.5ZM9.30884 10.0159C8.53901 10.6318 7.56251 11 6.5 11C4.01472 11 2 8.98528 2 6.5C2 4.01472 4.01472 2 6.5 2C8.98528 2 11 4.01472 11 6.5C11 7.56251 10.6318 8.53901 10.0159 9.30884L12.8536 12.1464C13.0488 12.3417 13.0488 12.6583 12.8536 12.8536C12.6583 13.0488 12.3417 13.0488 12.1464 12.8536L9.30884 10.0159Z"
      fill="#fff"
      fillRule="evenodd"
      clipRule="evenodd"
    ></path>
  </svg>
);

const ClearIcon = () => (
  <svg
    width="20"
    height="20"
    viewBox="0 0 15 15"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
  >
    <path
      d="M12.8536 2.85355C13.0488 2.65829 13.0488 2.34171 12.8536 2.14645C12.6583 1.95118 12.3417 1.95118 12.1464 2.14645L7.5 6.79289L2.85355 2.14645C2.65829 1.95118 2.34171 1.95118 2.14645 2.14645C1.95118 2.34171 1.95118 2.65829 2.14645 2.85355L6.79289 7.5L2.14645 12.1464C1.95118 12.3417 1.95118 12.6583 2.14645 12.8536C2.34171 13.0488 2.65829 13.0488 2.85355 12.8536L7.5 8.20711L12.1464 12.8536C12.3417 13.0488 12.6583 13.0488 12.8536 12.8536C13.0488 12.6583 13.0488 12.3417 12.8536 12.1464L8.20711 7.5L12.8536 2.85355Z"
      fill="#fff"
      fillRule="evenodd"
      clipRule="evenodd"
    ></path>
  </svg>
);

const SearchInputIcon: React.FC<SearchInputIconProps> = ({
  showClearIcon,
  onClick,
}) => {
  return (
    <div
      className={`absolute right-0 top-0 bottom-0 flex items-center justify-center pr-3 ${
        showClearIcon ? 'cursor-pointer' : 'pointer-events-none'
      }`}
      onClick={onClick}
    >
      <div
        className={`transition-all duration-300 ${
          showClearIcon ? 'opacity-0 scale-50 rotate-90' : 'opacity-100'
        }`}
      >
        <SearchIcon />
      </div>
      <div
        className={`absolute transition-all duration-300 ${
          showClearIcon ? 'opacity-100' : 'opacity-0 scale-50 -rotate-90'
        }`}
      >
        <ClearIcon />
      </div>
    </div>
  );
};

export default SearchInputIcon;
