import React, { useEffect } from 'react';
import { FormProvider, useForm, type UseFormReturn } from 'react-hook-form';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { cleanup, render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

import QualifierTargetsSection from './QualifierTargetsSection';

import {
  StageVotingMode,
  type EventStage,
  type QualifierTarget,
} from '@/models';

type QualifierFormValues = {
  id: string;
  name: string;
  order: number;
  votingMode: StageVotingMode;
  qualifiesTo: QualifierTarget[];
  eventsOrder: string[];
};

const { mockStore } = vi.hoisted(() => ({
  mockStore: { configuredEventStages: [] as EventStage[] },
}));

vi.mock('@/state/countriesStore', () => ({
  useCountriesStore: (selector: (s: typeof mockStore) => unknown) =>
    selector(mockStore),
}));

vi.mock('next-intl', () => ({
  useTranslations: () => (key: string) => key,
}));

function baseStage(id: string, name: string, order: number): EventStage {
  return {
    id,
    name,
    order,
    votingMode: StageVotingMode.TELEVOTE_ONLY,
    countries: [],
    isOver: false,
    isJuryVoting: false,
  };
}

function FormHarness({
  defaultValues,
  formRef,
  children,
}: {
  defaultValues: QualifierFormValues;
  formRef: React.MutableRefObject<UseFormReturn<QualifierFormValues> | null>;
  children: React.ReactNode;
}) {
  const form = useForm<QualifierFormValues>({ defaultValues });

  useEffect(() => {
    formRef.current = form;

    return () => {
      formRef.current = null;
    };
  }, [form, formRef]);

  return <FormProvider {...form}>{children}</FormProvider>;
}

function renderSection(opts: {
  defaultValues: QualifierFormValues;
  eventStageToEdit: EventStage;
  formRef?: React.MutableRefObject<UseFormReturn<QualifierFormValues> | null>;
}) {
  const formRef = opts.formRef ?? { current: null };
  const view = render(
    <FormHarness defaultValues={opts.defaultValues} formRef={formRef}>
      <QualifierTargetsSection
        isEditMode
        eventStageToEdit={opts.eventStageToEdit}
      />
    </FormHarness>,
  );

  return { ...view, formRef };
}

function rankModeToggleButton() {
  const label = screen.getByText(
    'setup.eventStageModal.rankBasedQualification',
  );
  const row = label.parentElement;

  expect(row).toBeTruthy();

  return within(row as HTMLElement).getByRole('button');
}

function totalQualifiersValue(): string {
  const label = screen.getByText('setup.eventStageModal.numberOfQualifiers:');
  const row = label.parentElement;

  expect(row).toBeTruthy();
  const value = within(row as HTMLElement).getByText(/^\d+$/);

  return value.textContent?.trim() ?? '';
}

afterEach(() => {
  cleanup();
});

describe('QualifierTargetsSection', () => {
  const sf1 = baseStage('sf1', 'Semi-Final 1', 0);
  const sf2 = baseStage('sf2', 'Semi-Final 2', 1);
  const gf = baseStage('gf', 'Grand Final', 2);

  const sf1Edit: EventStage = {
    ...sf1,
    qualifiesTo: [{ targetStageId: gf.id, amount: 10 }],
  };

  beforeEach(() => {
    mockStore.configuredEventStages = [sf1, sf2, gf];
  });

  it('renders qualifier section heading', () => {
    const formRef = {
      current: null as UseFormReturn<QualifierFormValues> | null,
    };

    renderSection({
      formRef,
      eventStageToEdit: sf1Edit,
      defaultValues: {
        id: sf1.id,
        name: sf1.name,
        order: 0,
        votingMode: StageVotingMode.TELEVOTE_ONLY,
        qualifiesTo: [{ targetStageId: gf.id, amount: 10 }],
        eventsOrder: [sf1.id, sf2.id, gf.id],
      },
    });

    expect(
      screen.getByRole('heading', {
        name: 'setup.eventStageModal.qualifierTargets',
        level: 4,
      }),
    ).toBeInTheDocument();
  });

  it('shows total qualifiers from amount-based config', () => {
    const formRef = {
      current: null as UseFormReturn<QualifierFormValues> | null,
    };

    renderSection({
      formRef,
      eventStageToEdit: sf1Edit,
      defaultValues: {
        id: sf1.id,
        name: sf1.name,
        order: 0,
        votingMode: StageVotingMode.TELEVOTE_ONLY,
        qualifiesTo: [{ targetStageId: gf.id, amount: 10 }],
        eventsOrder: [sf1.id, sf2.id, gf.id],
      },
    });

    expect(totalQualifiersValue()).toBe('10');
  });

  it('increments grand final qualifier amount in amount-based mode', async () => {
    const user = userEvent.setup();
    const formRef = {
      current: null as UseFormReturn<QualifierFormValues> | null,
    };

    renderSection({
      formRef,
      eventStageToEdit: sf1Edit,
      defaultValues: {
        id: sf1.id,
        name: sf1.name,
        order: 0,
        votingMode: StageVotingMode.TELEVOTE_ONLY,
        qualifiesTo: [{ targetStageId: gf.id, amount: 10 }],
        eventsOrder: [sf1.id, sf2.id, gf.id],
      },
    });

    const increaseButtons = screen.getAllByRole('button', { name: 'Increase' });

    await user.click(increaseButtons[increaseButtons.length - 1]);

    expect(formRef.current?.getValues('qualifiesTo')).toEqual([
      { targetStageId: gf.id, amount: 11 },
    ]);
    expect(totalQualifiersValue()).toBe('11');
  });

  it('converts amount-based qualifiers to rank ranges when enabling rank mode', async () => {
    const user = userEvent.setup();
    const formRef = {
      current: null as UseFormReturn<QualifierFormValues> | null,
    };

    renderSection({
      formRef,
      eventStageToEdit: sf1Edit,
      defaultValues: {
        id: sf1.id,
        name: sf1.name,
        order: 0,
        votingMode: StageVotingMode.TELEVOTE_ONLY,
        qualifiesTo: [{ targetStageId: gf.id, amount: 10 }],
        eventsOrder: [sf1.id, sf2.id, gf.id],
      },
    });

    await user.click(rankModeToggleButton());

    expect(formRef.current?.getValues('qualifiesTo')).toEqual([
      {
        targetStageId: gf.id,
        amount: 10,
        minRank: 1,
        maxRank: 10,
      },
    ]);

    const minInputs = screen.getAllByTitle('Minimum rank');
    const maxInputs = screen.getAllByTitle('Maximum rank');

    expect(minInputs).toHaveLength(2);
    expect(maxInputs).toHaveLength(2);
    expect(minInputs[1]).toHaveValue(1);
    expect(maxInputs[1]).toHaveValue(10);
  });

  it('adds a second rank-based target with derived amount (grand final + semi-final 2)', async () => {
    const user = userEvent.setup();
    const formRef = {
      current: null as UseFormReturn<QualifierFormValues> | null,
    };

    renderSection({
      formRef,
      eventStageToEdit: sf1Edit,
      defaultValues: {
        id: sf1.id,
        name: sf1.name,
        order: 0,
        votingMode: StageVotingMode.TELEVOTE_ONLY,
        qualifiesTo: [{ targetStageId: gf.id, amount: 10 }],
        eventsOrder: [sf1.id, sf2.id, gf.id],
      },
    });

    await user.click(rankModeToggleButton());

    const minInputs = screen.getAllByTitle('Minimum rank');
    const maxInputs = screen.getAllByTitle('Maximum rank');

    await user.clear(minInputs[0]);
    await user.type(minInputs[0], '11');
    await user.clear(maxInputs[0]);
    await user.type(maxInputs[0], '15');

    const qualifiesTo = formRef.current?.getValues('qualifiesTo') ?? [];

    expect(qualifiesTo).toHaveLength(2);

    const gfEntry = qualifiesTo.find((q) => q.targetStageId === gf.id);
    const sf2Entry = qualifiesTo.find((q) => q.targetStageId === sf2.id);

    expect(gfEntry).toMatchObject({
      targetStageId: gf.id,
      minRank: 1,
      maxRank: 10,
      amount: 10,
    });
    expect(sf2Entry).toMatchObject({
      targetStageId: sf2.id,
      minRank: 11,
      maxRank: 15,
      amount: 5,
    });
  });
});
