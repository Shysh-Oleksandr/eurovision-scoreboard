import React from 'react';

interface HighlightProps {
  text: string;
  query?: string;
}

/** Wraps the first case-insensitive match of `query` within `text` in a themed <mark>. */
export const Highlight: React.FC<HighlightProps> = ({ text, query }) => {
  const q = query?.trim();

  if (!q) return <>{text}</>;

  const idx = text.toLowerCase().indexOf(q.toLowerCase());

  if (idx === -1) return <>{text}</>;

  return (
    <>
      {text.slice(0, idx)}
      <mark className="rounded-[3px] bg-primary-700 px-[2px] text-white">
        {text.slice(idx, idx + q.length)}
      </mark>
      {text.slice(idx + q.length)}
    </>
  );
};
