import { readFileSync } from 'fs';
import path from 'path';

import { NextIntlClientProvider } from 'next-intl';
import React, { useEffect } from 'react';
import { FormProvider, useForm, type UseFormReturn } from 'react-hook-form';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { act, cleanup, render, screen } from '@testing-library/react';
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
  mockStore: {
    configuredEventStages: [] as EventStage[],
    eventAssignments: {} as Record<string, string>,
  },
}));

/** `count` countries assigned to `stageId`, as the setup stores a lineup. */
const lineup = (stageId: string, count: number) =>
  Object.fromEntries(
    Array.from({ length: count }, (_, i) => [`${stageId}-${i}`, stageId]),
  );

vi.mock('@/state/countriesStore', () => ({
  useCountriesStore: (selector: (s: typeof mockStore) => unknown) =>
    selector(mockStore),
}));

const messages = JSON.parse(
  readFileSync(
    path.join(__dirname, '..', '..', '..', '..', 'messages', 'en.json'),
    'utf8',
  ),
);

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
}) {
  const formRef = {
    current: null as UseFormReturn<QualifierFormValues> | null,
  };

  render(
    <NextIntlClientProvider locale="en" messages={messages}>
      <FormHarness defaultValues={opts.defaultValues} formRef={formRef}>
        <QualifierTargetsSection
          isEditMode
          eventStageToEdit={opts.eventStageToEdit}
        />
      </FormHarness>
    </NextIntlClientProvider>,
  );

  return { formRef, user: userEvent.setup() };
}

const field = (name: string) => screen.getByRole('textbox', { name });
const qualifiesTo = (
  formRef: React.MutableRefObject<UseFormReturn<QualifierFormValues> | null>,
) => formRef.current?.getValues('qualifiesTo');

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

  const values = (
    qualifiers: QualifierTarget[],
    stage: EventStage = sf1,
  ): QualifierFormValues => ({
    id: stage.id,
    name: stage.name,
    order: stage.order ?? 0,
    votingMode: StageVotingMode.TELEVOTE_ONLY,
    qualifiesTo: qualifiers,
    eventsOrder: [sf1.id, sf2.id, gf.id],
  });

  const placesMode = () => screen.getByRole('radio', { name: 'Which places' });

  beforeEach(() => {
    mockStore.configuredEventStages = [sf1, sf2, gf];
    mockStore.eventAssignments = {};
  });

  it('names the section and its two ways to qualify', () => {
    renderSection({
      eventStageToEdit: sf1Edit,
      defaultValues: values([{ targetStageId: gf.id, amount: 10 }]),
    });

    expect(
      screen.getByRole('heading', { name: 'Who goes through', level: 3 }),
    ).toBeInTheDocument();
    expect(screen.getByRole('radio', { name: 'How many' })).toBeChecked();
    expect(placesMode()).not.toBeChecked();
    expect(screen.getByText('This stage')).toBeInTheDocument();
  });

  it('says how many go through, out of the stage size when known', () => {
    mockStore.eventAssignments = lineup(sf1.id, 15);

    renderSection({
      eventStageToEdit: sf1Edit,
      defaultValues: values([{ targetStageId: gf.id, amount: 10 }]),
    });

    expect(
      screen.getByText('10 of 15 entries go through.'),
    ).toBeInTheDocument();
  });

  it('leaves the size out while other stages still send entries in', () => {
    mockStore.configuredEventStages = [
      { ...sf1, qualifiesTo: [{ targetStageId: sf2.id, amount: 3 }] },
      sf2,
      gf,
    ];
    mockStore.eventAssignments = lineup(sf2.id, 4);

    renderSection({
      eventStageToEdit: sf2,
      defaultValues: values([{ targetStageId: gf.id, amount: 10 }], sf2),
    });

    expect(screen.getByText('10 entries go through.')).toBeInTheDocument();
    expect(screen.queryByText(/only 4 entries/)).not.toBeInTheDocument();
  });

  it('increments grand final qualifier amount in amount-based mode', async () => {
    const { formRef, user } = renderSection({
      eventStageToEdit: sf1Edit,
      defaultValues: values([{ targetStageId: gf.id, amount: 10 }]),
    });

    await user.click(
      screen.getByRole('button', {
        name: 'Increase qualifiers for Grand Final',
      }),
    );

    expect(qualifiesTo(formRef)).toEqual([
      { targetStageId: gf.id, amount: 11 },
    ]);
    expect(screen.getByText('11 entries go through.')).toBeInTheDocument();
  });

  it('lets a count be emptied while typing a new one', async () => {
    const { formRef, user } = renderSection({
      eventStageToEdit: sf1Edit,
      defaultValues: values([{ targetStageId: gf.id, amount: 10 }]),
    });

    const count = field('Grand Final: how many go there');

    await user.clear(count);
    expect(count).toHaveValue('');

    await user.type(count, '8');
    expect(count).toHaveValue('8');
    expect(qualifiesTo(formRef)).toEqual([{ targetStageId: gf.id, amount: 8 }]);
  });

  it('shows stages that run earlier without controls', () => {
    renderSection({
      eventStageToEdit: sf2,
      defaultValues: values([{ targetStageId: gf.id, amount: 10 }], sf2),
    });

    expect(screen.getByText('Runs earlier')).toBeInTheDocument();
    expect(
      screen.queryByRole('button', {
        name: 'Increase qualifiers for Semi-Final 1',
      }),
    ).not.toBeInTheDocument();
  });

  it('converts amount-based qualifiers to rank ranges when enabling rank mode', async () => {
    const { formRef, user } = renderSection({
      eventStageToEdit: sf1Edit,
      defaultValues: values([{ targetStageId: gf.id, amount: 10 }]),
    });

    await user.click(placesMode());

    expect(qualifiesTo(formRef)).toEqual([
      { targetStageId: gf.id, amount: 10, minRank: 1, maxRank: 10 },
    ]);
    expect(field('Grand Final: first place')).toHaveValue('1');
    expect(field('Grand Final: last place')).toHaveValue('10');
    expect(screen.getByText('Places 1–10: Grand Final.')).toBeInTheDocument();
  });

  it('adds a second rank-based target with derived amount (grand final + semi-final 2)', async () => {
    const { formRef, user } = renderSection({
      eventStageToEdit: sf1Edit,
      defaultValues: values([{ targetStageId: gf.id, amount: 10 }]),
    });

    await user.click(placesMode());

    // The next free place is offered as a hint.
    expect(field('Semi-Final 2: first place')).toHaveAttribute(
      'placeholder',
      '11',
    );

    await user.type(field('Semi-Final 2: first place'), '11');
    await user.type(field('Semi-Final 2: last place'), '15');

    const targets = qualifiesTo(formRef) ?? [];

    expect(targets).toHaveLength(2);
    expect(targets.find((q) => q.targetStageId === gf.id)).toMatchObject({
      minRank: 1,
      maxRank: 10,
      amount: 10,
    });
    expect(targets.find((q) => q.targetStageId === sf2.id)).toMatchObject({
      minRank: 11,
      maxRank: 15,
      amount: 5,
    });
    expect(
      screen.getByText('Places 1–10: Grand Final, 11–15: Semi-Final 2.'),
    ).toBeInTheDocument();
  });

  it('names a gap and an overlap while typing', async () => {
    const { user } = renderSection({
      eventStageToEdit: sf1Edit,
      defaultValues: values([
        { targetStageId: gf.id, amount: 10, minRank: 1, maxRank: 10 },
      ]),
    });

    await user.type(field('Semi-Final 2: first place'), '12');
    await user.type(field('Semi-Final 2: last place'), '15');

    expect(screen.getByText('Place 11 has no stage yet.')).toBeInTheDocument();

    await user.clear(field('Semi-Final 2: first place'));
    await user.type(field('Semi-Final 2: first place'), '8');

    expect(
      screen.getByText(
        'Place 8 goes to two stages: Grand Final and Semi-Final 2.',
      ),
    ).toBeInTheDocument();
    expect(field('Semi-Final 2: first place')).toHaveAttribute(
      'aria-invalid',
      'true',
    );
  });

  it('waits until you leave a half-typed range before asking for its end', async () => {
    const { user } = renderSection({
      eventStageToEdit: sf1Edit,
      defaultValues: values([
        { targetStageId: gf.id, amount: 10, minRank: 1, maxRank: 10 },
      ]),
    });

    await user.type(field('Semi-Final 2: first place'), '11');
    expect(
      screen.queryByText('Semi-Final 2: add the last place.'),
    ).not.toBeInTheDocument();

    await user.click(field('Grand Final: first place'));
    expect(
      screen.getByText('Semi-Final 2: add the last place.'),
    ).toBeInTheDocument();
  });

  it('drops a target whose range is cleared, instead of keeping its old count', async () => {
    const { formRef, user } = renderSection({
      eventStageToEdit: sf1Edit,
      defaultValues: values([
        { targetStageId: gf.id, amount: 10, minRank: 1, maxRank: 10 },
        { targetStageId: sf2.id, amount: 5, minRank: 11, maxRank: 15 },
      ]),
    });

    await user.click(
      screen.getByRole('button', { name: 'Clear qualifiers for Semi-Final 2' }),
    );

    expect(qualifiesTo(formRef)).toEqual([
      { targetStageId: gf.id, amount: 10, minRank: 1, maxRank: 10 },
    ]);
  });

  it('stays in rank mode when the only range is cleared to type a new one', async () => {
    const { user } = renderSection({
      eventStageToEdit: sf1Edit,
      defaultValues: values([
        { targetStageId: gf.id, amount: 4, minRank: 1, maxRank: 4 },
      ]),
    });

    await user.clear(field('Grand Final: first place'));
    await user.clear(field('Grand Final: last place'));

    expect(placesMode()).toBeChecked();

    await user.type(field('Grand Final: first place'), '1');
    await user.click(
      screen.getByRole('button', { name: 'Clear qualifiers for Grand Final' }),
    );

    expect(placesMode()).toBeChecked();
    expect(screen.getByText('Nobody goes through yet.')).toBeInTheDocument();
  });

  it('stays in rank mode when enabled with no qualifiers', async () => {
    const { user } = renderSection({
      eventStageToEdit: { ...sf1, qualifiesTo: [] },
      defaultValues: values([]),
    });

    await user.click(placesMode());

    expect(placesMode()).toBeChecked();
    expect(field('Grand Final: first place')).toBeInTheDocument();
  });

  it('detects the mode from the qualifiers the form is reset with', () => {
    const { formRef } = renderSection({
      eventStageToEdit: sf1Edit,
      defaultValues: values([{ targetStageId: gf.id, amount: 10 }]),
    });

    expect(placesMode()).not.toBeChecked();

    act(() => {
      formRef.current?.reset(
        values([{ targetStageId: gf.id, amount: 10, minRank: 1, maxRank: 10 }]),
      );
    });

    expect(placesMode()).toBeChecked();

    act(() => {
      formRef.current?.reset(values([{ targetStageId: gf.id, amount: 10 }]));
    });

    expect(placesMode()).not.toBeChecked();
  });
});
