import React from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import {
  act,
  cleanup,
  fireEvent,
  render,
  screen,
} from '@testing-library/react';

import EntryColorsField from './EntryColorsField';

const flagColors = vi.hoisted(() => ({
  current: ['#c6363c', '#0c4076', '#ffffff'] as string[] | null,
}));

vi.mock('next-intl', () => ({
  useTranslations: () => (key: string) => key,
}));

vi.mock('./useFlagImageColors', () => ({
  useFlagImageColors: () => flagColors.current,
}));

vi.mock(
  '@/components/setup/widgets-section/custom-themes/SafeColorPicker',
  () => ({
    default: ({ onChange }: { onChange: (value: string) => void }) => (
      <button type="button" onClick={() => onChange('rgba(0, 51, 160, 1)')}>
        pick blue
      </button>
    ),
  }),
);

vi.mock('@/components/simulation/share/controls', () => ({
  ShareSegmented: ({
    options,
    onChange,
  }: {
    options: { value: string; label: string }[];
    onChange: (value: string) => void;
  }) => (
    <>
      {options.map((option) => (
        <button
          key={option.value}
          type="button"
          onClick={() => onChange(option.value)}
        >
          {option.label}
        </button>
      ))}
    </>
  ),
}));

vi.mock('@/components/common/Button', () => ({
  default: ({
    children,
    onClick,
  }: {
    children: React.ReactNode;
    onClick?: () => void;
  }) => (
    <button type="button" onClick={onClick}>
      {children}
    </button>
  ),
}));

/** Lets the editor's throttled changes reach `onChange`. */
const flush = () =>
  act(() => new Promise((resolve) => setTimeout(resolve, 60)));

const renderField = (value: string[] | null = null) => {
  const onChange = vi.fn();

  render(<EntryColorsField value={value} onChange={onChange} flag="/f.svg" />);

  return onChange;
};

const swatches = () => screen.queryAllByRole('button', { name: 'colorNumber' });

describe('EntryColorsField', () => {
  afterEach(cleanup);

  beforeEach(() => {
    flagColors.current = ['#c6363c', '#0c4076', '#ffffff'];
    // jsdom has no layout to scroll.
    Element.prototype.scrollIntoView = vi.fn();
  });

  it('starts Custom from the colours read from the flag', () => {
    const onChange = renderField();

    expect(swatches()).toHaveLength(0);
    fireEvent.click(screen.getByText('colorsCustom'));

    expect(onChange).toHaveBeenLastCalledWith([
      '#c6363c',
      '#0c4076',
      '#ffffff',
    ]);
    expect(swatches()).toHaveLength(3);
    expect(screen.queryByText('pick blue')).not.toBeInTheDocument();
  });

  it('starts with one colour, picker open, when the flag can’t be read', () => {
    flagColors.current = null;
    const onChange = renderField();

    fireEvent.click(screen.getByText('colorsCustom'));

    expect(onChange).toHaveBeenLastCalledWith(['#ffffff']);
    expect(screen.getByText('pick blue')).toBeInTheDocument();
  });

  it('edits a swatch with the picker as #rrggbb', async () => {
    const onChange = renderField(['#c6363c', '#ffffff']);

    fireEvent.click(swatches()[1]);
    fireEvent.click(screen.getByText('pick blue'));
    await flush();

    expect(onChange).toHaveBeenLastCalledWith(['#c6363c', '#0033a0']);
  });

  it('keeps the custom colours while From the flag is chosen', async () => {
    const onChange = renderField(['#e30613']);

    fireEvent.click(screen.getByText('colorsFromFlag'));
    await flush();
    expect(onChange).toHaveBeenLastCalledWith(null);
    expect(swatches()).toHaveLength(0);

    fireEvent.click(screen.getByText('colorsCustom'));
    await flush();
    expect(onChange).toHaveBeenLastCalledWith(['#e30613']);
  });

  it('adds up to three colours and never removes the last', async () => {
    const onChange = renderField(['#e30613']);

    expect(screen.queryByText('removeColor')).not.toBeInTheDocument();
    fireEvent.click(screen.getByLabelText('addColor'));
    await flush();
    // The next colour is the flag's first one the entry doesn't have yet.
    expect(onChange).toHaveBeenLastCalledWith(['#e30613', '#c6363c']);

    fireEvent.click(screen.getByLabelText('addColor'));
    await flush();
    expect(swatches()).toHaveLength(3);
    expect(screen.queryByLabelText('addColor')).not.toBeInTheDocument();

    // The new swatch is open: remove it.
    fireEvent.click(screen.getByText('removeColor'));
    await flush();
    expect(onChange).toHaveBeenLastCalledWith(['#e30613', '#c6363c']);
  });
});
