'use client';
import { useTranslations } from 'next-intl';
import React, { useState } from 'react';

import { DataBinding } from '../model/design';
import { useDesignData } from '../render/DesignDataContext';

import ContestPicker from './ContestPicker';

import { Field, Hint, Seg, SelectInput } from '@/graphics/editor/ui/controls';
import { useScoreboardStore } from '@/state/scoreboardStore';

type Source = 'live' | 'contest' | 'manual';

interface Props {
  value: DataBinding;
  onChange: (binding: DataBinding) => void;
  /** Offer "Manual" (keeps the rows the binding already has). */
  manualRows?: DataBinding | null;
}

/** Live stage select (the running event's stages). */
export const LiveStagePicker: React.FC<{
  stageId?: string;
  onChange: (stageId: string | undefined) => void;
}> = ({ stageId, onChange }) => {
  const t = useTranslations('graphics.data');
  const stages = useScoreboardStore((s) => s.eventStages);
  const options = [
    { value: '', label: t('viewedStage') },
    ...stages.map((s) => ({ value: s.id, label: s.name })),
  ];

  return (
    <Field label={t('stage')}>
      <SelectInput<string>
        value={stageId && stages.some((s) => s.id === stageId) ? stageId : ''}
        options={options}
        onChange={(v) => onChange(v || undefined)}
        ariaLabel={t('stage')}
      />
    </Field>
  );
};

/** Stage select of the bound contest (needs the provider to have loaded it). */
export const ContestStagePicker: React.FC<{
  stageId?: string;
  onChange: (stageId: string | undefined) => void;
}> = ({ stageId, onChange }) => {
  const t = useTranslations('graphics.data');
  const { contestStages, status } = useDesignData();
  const withRows = (contestStages ?? []).filter((s) => s.hasRows);

  if (status === 'loading') return <Hint>{t('loadingContest')}</Hint>;
  if (!withRows.length) return null;
  const current =
    stageId && withRows.some((s) => s.id === stageId)
      ? stageId
      : withRows[withRows.length - 1].id;

  return (
    <Field label={t('stage')}>
      <SelectInput<string>
        value={current}
        options={withRows.map((s) => ({ value: s.id, label: s.name }))}
        onChange={(v) => onChange(v)}
        ariaLabel={t('stage')}
      />
    </Field>
  );
};

/**
 * Compact data-source switcher for template sheets and the publish preview:
 * Live (+ stage) · Saved contest (+ picker, stage) · Manual (the rows the
 * template shipped with). The editor's Data panel has the full version
 * with the manual table.
 */
const DataSourceControl: React.FC<Props> = ({
  value,
  onChange,
  manualRows,
}) => {
  const t = useTranslations('graphics.data');
  const [pickingContest, setPickingContest] = useState(false);
  const source: Source = pickingContest
    ? 'contest'
    : value.source === 'contest'
    ? 'contest'
    : value.source === 'manual'
    ? 'manual'
    : 'live';
  const options = [
    { value: 'live' as Source, label: t('live') },
    { value: 'contest' as Source, label: t('savedContest') },
    ...(manualRows || value.source === 'manual'
      ? [{ value: 'manual' as Source, label: t('manual') }]
      : []),
  ];

  return (
    <div className="gfx-dsc">
      <Seg<Source>
        value={source}
        options={options}
        onChange={(next) => {
          setPickingContest(next === 'contest' && value.source !== 'contest');
          if (next === 'live') onChange({ source: 'live' });
          if (next === 'manual') {
            onChange(
              value.source === 'manual'
                ? value
                : manualRows ?? { source: 'manual', rows: [] },
            );
          }
        }}
      />
      {value.source === 'live' && !pickingContest && (
        <LiveStagePicker
          stageId={value.stageId}
          onChange={(stageId) => onChange({ source: 'live', stageId })}
        />
      )}
      {(value.source === 'contest' || pickingContest) && (
        <>
          <ContestPicker
            value={value.source === 'contest' ? value.contestId : null}
            onPick={(picked) => {
              setPickingContest(false);
              onChange({ source: 'contest', ...picked, stageId: undefined });
            }}
          />
          {value.source === 'contest' && (
            <ContestStagePicker
              stageId={value.stageId}
              onChange={(stageId) => onChange({ ...value, stageId })}
            />
          )}
        </>
      )}
      {value.source === 'manual' && (
        <Hint>{t('nRows', { count: value.rows.length })}</Hint>
      )}
    </div>
  );
};

export default DataSourceControl;
