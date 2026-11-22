import React from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import {
  act,
  cleanup,
  fireEvent,
  render,
  screen,
} from '@testing-library/react';

import EntryOverrideModal from './EntryOverrideModal';

import { useCountriesStore } from '@/state/countriesStore';
import { useGeneralStore } from '@/state/generalStore';
import { useAuthStore } from '@/state/useAuthStore';

/*
 * The name and flag editor: Save stores only what differs from the country
 * as it ships, "Use the original" brings that back, the flag picker opens
 * where the current flag is, an upload goes up before the override is
 * stored, and "Use in my new contests" writes the account's default.
 */

const upload = vi.hoisted(() => vi.fn());

vi.mock('@/api/entryFlags', () => ({
  useEntryFlagsQuery: () => ({
    data: [
      {
        _id: 'f0',
        url: 'https://cdn.douzepoints.app/entry-flags/u/old.png',
        createdAt: '2026-11-20T00:00:00.000Z',
      },
    ],
  }),
  useUploadEntryFlagMutation: () => ({
    mutateAsync: upload,
    isPending: false,
  }),
}));

vi.mock('@/api/client', () => ({ isNetworkError: () => false }));
vi.mock('@/hooks/useMediaQuery', () => ({ useMediaQuery: () => false }));

vi.mock('next-intl', () => ({
  useTranslations: () => (key: string) => key,
}));

vi.mock('@/native/haptics', () => ({ playHaptic: vi.fn() }));

// The picker's segmented switch is fitted by measuring.
vi.stubGlobal(
  'ResizeObserver',
  class {
    observe() {}
    unobserve() {}
    disconnect() {}
  },
);

vi.mock('@/components/common/Modal/Modal', () => ({
  default: ({
    children,
    bottomContent,
  }: {
    children: React.ReactNode;
    bottomContent: React.ReactNode;
  }) => (
    <div>
      {children}
      {bottomContent}
    </div>
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

vi.mock('@/components/setup/custom-entry/EntryRowPreview', () => ({
  default: ({ name, flag }: { name: string; flag: string }) => (
    <span data-testid="preview">{`${name}|${flag}`}</span>
  ),
}));

vi.mock('@/components/setup/custom-entry/EntryActionBar', () => ({
  default: ({
    leading,
    onSave,
    saveDisabled,
  }: {
    leading?: React.ReactNode;
    onSave: () => void;
    saveDisabled: boolean;
  }) => (
    <>
      {leading}
      <button type="button" onClick={onSave} disabled={saveDisabled}>
        save
      </button>
    </>
  ),
}));

const onClose = vi.fn();

const open = (code = 'MK') =>
  render(<EntryOverrideModal isOpen onClose={onClose} code={code} />);

const nameInput = () =>
  document.getElementById('entryOverrideName') as HTMLInputElement;

const stageUpload = async () => {
  const input = document.querySelector(
    'input[type="file"]',
  ) as HTMLInputElement;
  const file = new File(['<svg/>'], 'globe.svg', { type: 'image/svg+xml' });

  await act(async () => {
    fireEvent.change(input, { target: { files: [file] } });
  });
  // FileReader runs on its own tick.
  await act(() => new Promise((resolve) => setTimeout(resolve, 20)));
};

const signIn = (signedIn: boolean) =>
  useAuthStore.setState({
    user: signedIn ? ({ _id: 'u1', username: 'me' } as never) : null,
  });

describe('EntryOverrideModal', () => {
  beforeEach(() => {
    cleanup();
    onClose.mockClear();
    upload.mockReset();
    signIn(true);
    useCountriesStore.setState({ entryOverrides: {}, customCountries: [] });
    useGeneralStore.setState((state) => ({
      settings: { ...state.settings, defaultEntryOverrides: {} },
    }));
  });

  it('starts from the country as it ships, with nothing to save', () => {
    open();

    expect(nameInput().value).toBe('North Macedonia');
    expect(screen.getByText('save')).toHaveProperty('disabled', true);
    // Its own flag is the ringed tile of the Countries tab.
    expect(
      screen.getByRole('button', { name: 'North Macedonia' }),
    ).toHaveProperty('ariaPressed', 'true');
    expect(screen.queryByText('useOriginal')).toBeNull();
  });

  it('saves a new name and another country’s flag', () => {
    open();

    fireEvent.change(nameInput(), { target: { value: ' F.Y.R. Macedonia ' } });
    fireEvent.change(screen.getByLabelText('searchCountries'), {
      target: { value: 'yugo' },
    });
    fireEvent.click(screen.getByRole('button', { name: 'Yugoslavia' }));
    expect(screen.getByTestId('preview').textContent).toBe(
      'F.Y.R. Macedonia|/flags/yu.svg',
    );
    fireEvent.click(screen.getByText('save'));

    expect(useCountriesStore.getState().entryOverrides).toEqual({
      MK: { name: 'F.Y.R. Macedonia', flag: '/flags/yu.svg' },
    });
    expect(onClose).toHaveBeenCalled();
  });

  it('opens on the preset in use, and "Use the original" removes it', () => {
    useCountriesStore.setState({
      entryOverrides: { WW: { flag: '/flags/earth.svg' } },
    });
    open('WW');

    expect(
      screen.getByRole('button', { name: 'presetNames.earth' }),
    ).toHaveProperty('ariaPressed', 'true');

    fireEvent.click(screen.getByText('useOriginal'));
    fireEvent.click(screen.getByText('save'));

    expect(useCountriesStore.getState().entryOverrides).toEqual({});
  });

  it('keeps the built-in name when the field is left empty', () => {
    useCountriesStore.setState({
      entryOverrides: { CZ: { name: 'Czech Republic' } },
    });
    open('CZ');

    fireEvent.change(nameInput(), { target: { value: '  ' } });
    expect(screen.getByTestId('preview').textContent).toBe('|/flags/cz.svg');
    fireEvent.click(screen.getByText('save'));

    expect(useCountriesStore.getState().entryOverrides).toEqual({});
  });

  it('uploads a staged image on Save and uses its URL', async () => {
    upload.mockResolvedValue({
      _id: 'f1',
      url: 'https://cdn.douzepoints.app/entry-flags/u/globe.svg',
      createdAt: '2026-11-22T00:00:00.000Z',
    });
    open('WW');

    await stageUpload();
    expect(screen.getByText('uploadStaged')).toBeTruthy();
    expect(screen.getByTestId('preview').textContent).toMatch(
      /^Rest of the World\|data:image\/svg\+xml/,
    );

    await act(async () => {
      fireEvent.click(screen.getByText('save'));
    });

    expect(upload).toHaveBeenCalledTimes(1);
    expect(useCountriesStore.getState().entryOverrides).toEqual({
      WW: { flag: 'https://cdn.douzepoints.app/entry-flags/u/globe.svg' },
    });
    expect(onClose).toHaveBeenCalled();
  });

  it('keeps everything as it was when the upload fails', async () => {
    upload.mockRejectedValue(new Error('offline'));
    open('WW');

    await stageUpload();
    await act(async () => {
      fireEvent.click(screen.getByText('save'));
    });

    expect(screen.getByText('uploadFailed')).toBeTruthy();
    expect(useCountriesStore.getState().entryOverrides).toEqual({});
    expect(onClose).not.toHaveBeenCalled();
  });

  it('asks to sign in before an upload', async () => {
    signIn(false);
    open('WW');

    fireEvent.click(screen.getByText('uploadImage'));
    expect(screen.getByText('signInToUpload')).toBeTruthy();

    await stageUpload();
    expect(screen.queryByText('uploadStaged')).toBeNull();
  });

  it('lists uploaded flags under Your flags', () => {
    open('WW');

    fireEvent.click(screen.getByRole('radio', { name: 'yourFlags' }));

    expect(screen.getByRole('button', { name: 'uploadedFlag' })).toBeTruthy();
  });

  it('writes the account default with "Use in my new contests", and removes it when unticked', () => {
    open('CZ');

    fireEvent.change(nameInput(), { target: { value: 'Czech Republic' } });
    fireEvent.click(screen.getByText('useByDefault'));
    fireEvent.click(screen.getByText('save'));

    expect(useGeneralStore.getState().settings.defaultEntryOverrides).toEqual({
      CZ: { name: 'Czech Republic' },
    });

    // The contest uses the default, so the box starts ticked.
    cleanup();
    open('CZ');
    expect(screen.getByText('useByDefault').closest('button')).toHaveProperty(
      'ariaPressed',
      'true',
    );

    fireEvent.click(screen.getByText('useByDefault'));
    fireEvent.click(screen.getByText('save'));

    expect(useGeneralStore.getState().settings.defaultEntryOverrides).toEqual(
      {},
    );
    expect(useCountriesStore.getState().entryOverrides).toEqual({
      CZ: { name: 'Czech Republic' },
    });
  });
});
