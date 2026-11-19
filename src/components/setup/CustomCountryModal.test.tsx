import React from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import {
  act,
  cleanup,
  fireEvent,
  render,
  screen,
} from '@testing-library/react';

import CustomCountryModal from './CustomCountryModal';

import { useCountriesStore } from '@/state/countriesStore';
import { useAuthStore } from '@/state/useAuthStore';

/*
 * The save paths that used to lose data: a failed upload after a create
 * made a second entry on retry, an edit with a new file cleared the old
 * flag before the upload, and a link that didn't load was saved as the
 * world flag.
 */

const api = vi.hoisted(() => ({
  create: vi.fn(),
  update: vi.fn(),
  remove: vi.fn(),
  upload: vi.fn(),
}));

vi.mock('next-intl', () => ({
  useTranslations: () => (key: string) => key,
}));

vi.mock('react-toastify', () => ({
  toast: Object.assign(vi.fn(), { success: vi.fn(), error: vi.fn() }),
}));

vi.mock('@/api/customEntries', () => ({
  useCreateCustomEntryMutation: () => ({
    mutateAsync: api.create,
    isPending: false,
  }),
  useUpdateCustomEntryMutation: () => ({
    mutateAsync: api.update,
    isPending: false,
  }),
  useDeleteCustomEntryMutation: () => ({
    mutateAsync: api.remove,
    isPending: false,
  }),
  useUploadCustomEntryFlagMutation: () => ({
    mutateAsync: api.upload,
    isPending: false,
  }),
  useCustomEntryGroupsQuery: () => ({ data: [] }),
}));

vi.mock('@/api/client', () => ({ isNetworkError: () => false }));
vi.mock('@/hooks/useMediaQuery', () => ({ useMediaQuery: () => false }));
vi.mock('@/hooks/useConfirmation', () => ({
  useConfirmation: () => ({ confirm: vi.fn() }),
}));

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

vi.mock('@/components/common/customSelect/CustomSelect', () => ({
  default: () => null,
}));

vi.mock('./custom-entry/EntryRowPreview', () => ({ default: () => null }));

vi.mock('./custom-entry/FlagPicker', () => ({
  default: ({ onPick }: { onPick: (flag: string) => void }) => (
    <button type="button" onClick={() => onPick('/flags/earth.svg')}>
      pick earth
    </button>
  ),
}));

vi.mock('./custom-entry/EntryActionBar', () => ({
  default: ({
    onSave,
    saveDisabled,
  }: {
    onSave: () => void;
    saveDisabled: boolean;
  }) => (
    <button type="button" onClick={onSave} disabled={saveDisabled}>
      save entry
    </button>
  ),
}));

const barnsley = {
  code: 'custom-e1',
  name: 'Barnsley',
  category: 'Custom',
  flag: 'https://cdn.douzepoints.app/custom-entries/flags/u/barnsley.png',
};

const stageUpload = async () => {
  const input = document.querySelector(
    'input[type="file"]',
  ) as HTMLInputElement;
  const file = new File(['<svg/>'], 'crest.svg', { type: 'image/svg+xml' });

  await act(async () => {
    fireEvent.change(input, { target: { files: [file] } });
  });
  // FileReader runs on its own tick.
  await act(() => new Promise((resolve) => setTimeout(resolve, 20)));
};

const save = async () => {
  await act(async () => {
    fireEvent.click(screen.getByText('save entry'));
  });
};

describe('CustomCountryModal saving', () => {
  afterEach(cleanup);

  beforeEach(() => {
    Object.values(api).forEach((fn) => fn.mockReset());
    useAuthStore.setState({ user: { _id: 'u' } } as never);
    useCountriesStore.setState({ customCountries: [barnsley] } as never);
  });

  it('retries a failed upload on the entry it already created', async () => {
    api.create.mockResolvedValue({ _id: 'new1' });
    api.upload.mockRejectedValueOnce(new Error('offline'));
    api.update.mockResolvedValue({});
    api.upload.mockResolvedValueOnce({});

    render(<CustomCountryModal isOpen onClose={vi.fn()} />);
    fireEvent.change(screen.getByLabelText('name'), {
      target: { value: 'Westvale' },
    });
    await stageUpload();

    await save();
    expect(api.create).toHaveBeenCalledTimes(1);
    expect(api.create.mock.calls[0][0].flagUrl).toBeUndefined();
    expect(screen.getByText('savedWithoutFlag')).toBeInTheDocument();

    await save();
    expect(api.create).toHaveBeenCalledTimes(1);
    expect(api.update).toHaveBeenCalledWith(
      expect.objectContaining({ id: 'new1', name: 'Westvale' }),
    );
    expect(api.update.mock.calls[0][0]).not.toHaveProperty('flagUrl');
    expect(api.upload).toHaveBeenLastCalledWith(
      expect.objectContaining({ id: 'new1' }),
    );
  });

  it('keeps the old flag while a new one uploads', async () => {
    api.update.mockResolvedValue({});
    api.upload.mockRejectedValue(new Error('too slow'));

    render(
      <CustomCountryModal isOpen onClose={vi.fn()} countryToEdit={barnsley} />,
    );
    await stageUpload();
    await save();

    expect(api.update).toHaveBeenCalledTimes(1);
    expect(api.update.mock.calls[0][0]).not.toHaveProperty('flagUrl');
    expect(api.upload).toHaveBeenCalledWith(
      expect.objectContaining({ id: 'e1' }),
    );
  });

  it('sends the flag only when it changed', async () => {
    api.update.mockResolvedValue({});
    const onClose = vi.fn();

    render(
      <CustomCountryModal isOpen onClose={onClose} countryToEdit={barnsley} />,
    );
    expect(screen.getByText('save entry')).toBeDisabled();

    fireEvent.change(screen.getByLabelText('name'), {
      target: { value: 'Barnsley FC' },
    });
    await save();
    expect(api.update.mock.calls[0][0]).not.toHaveProperty('flagUrl');

    fireEvent.click(screen.getByText('pick earth'));
    await save();
    expect(api.update.mock.calls[1][0].flagUrl).toBe('/flags/earth.svg');
  });

  it("won't save a link that isn't an image link", async () => {
    render(
      <CustomCountryModal isOpen onClose={vi.fn()} countryToEdit={barnsley} />,
    );

    fireEvent.click(screen.getByText('useImageLink'));
    fireEvent.change(screen.getByLabelText('imageLink'), {
      target: { value: 'example.com/flag.png' },
    });
    await save();

    expect(api.update).not.toHaveBeenCalled();
    expect(screen.getByText('linkInvalid')).toBeInTheDocument();
  });
});
