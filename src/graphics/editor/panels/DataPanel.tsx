'use client';
import { Database, Download, Plus, X } from 'lucide-react';
import { useTranslations } from 'next-intl';
import React, { useState } from 'react';

import ContestPicker from '../../components/ContestPicker';
import {
  ContestStagePicker,
  LiveStagePicker,
} from '../../components/DataSourceControl';
import { DataBinding, ManualRow } from '../../model/design';
import { useDesignData } from '../../render/DesignDataContext';
import { useEditorStore } from '../editorStore';
import { Chip, Hint, IconButton, Seg, SelectInput } from '../ui/controls';
import { useCountryOptions, useDataLabel } from '../useEditorContext';

import { useCountryDisplay, useCountrySorter } from '@/components/board/hooks';
import Button from '@/components/common/Button';
import { ALL_COUNTRIES } from '@/data/countries/common-countries';
import { getFlagPathForImageGeneration } from '@/helpers/getFlagPath';

type Source = Exclude<DataBinding['source'], 'provided'>;

const DEFAULT_ROWS: ManualRow[] = [
  { code: 'AT', name: 'Austria', points: 0 },
  { code: 'SE', name: 'Sweden', points: 0 },
  { code: 'IT', name: 'Italy', points: 0 },
];

/**
 * Data source switcher (handoff §6): Live (stage select), Saved contest
 * (search, yours / public, stage select) or a manual list (table, Add row,
 * Import from live). The footer shows what is resolved right now.
 */
const DataPanel: React.FC = () => {
  const t = useTranslations('graphics.data');
  const data = useEditorStore((s) => s.design.data);
  const setData = useEditorStore((s) => s.setData);
  const label = useDataLabel(data);
  const { countries, inaccessible, status, isSample } = useDesignData();
  const liveCountries = useCountrySorter(useCountryDisplay() ?? []);
  const countryOptions = useCountryOptions();

  const rows = data.source === 'manual' ? data.rows : [];
  const setRows = (next: ManualRow[]) =>
    setData({ source: 'manual', rows: next });
  const updateRow = (i: number, patch: Partial<ManualRow>) =>
    setRows(rows.map((r, k) => (k === i ? { ...r, ...patch } : r)));
  // "Saved contest" shows the picker without touching the binding until a
  // contest is chosen, so the previous source keeps feeding the design (and
  // nothing invalid is ever saved).
  const [pickingContest, setPickingContest] = useState(false);
  const source: Source = pickingContest
    ? 'contest'
    : data.source === 'provided'
    ? 'live'
    : data.source;
  const firstUnusedCountry = () =>
    countryOptions.find((o) => !rows.some((r) => r.code === o.value)) ??
    countryOptions[0];

  return (
    <>
      <Seg<Source>
        value={source}
        onChange={(next) => {
          setPickingContest(next === 'contest' && data.source !== 'contest');
          if (next === 'live') setData({ source: 'live' });
          if (next === 'manual') {
            setData({
              source: 'manual',
              rows: rows.length ? rows : DEFAULT_ROWS,
            });
          }
        }}
        options={[
          { value: 'live', label: t('live') },
          { value: 'contest', label: t('savedContest') },
          { value: 'manual', label: t('manual') },
        ]}
      />
      <Hint strong icon>
        {t('elementsUseThisData')}
      </Hint>

      {data.source === 'live' && !pickingContest && (
        <>
          <LiveStagePicker
            stageId={data.stageId}
            onChange={(stageId) => setData({ source: 'live', stageId })}
          />
          <Hint>{t('liveHint')}</Hint>
          {isSample && <Hint icon>{t('sampleHint')}</Hint>}
        </>
      )}

      {(data.source === 'contest' || pickingContest) && (
        <>
          <ContestPicker
            value={data.source === 'contest' ? data.contestId : null}
            onPick={(picked) => {
              setPickingContest(false);
              setData({ source: 'contest', ...picked, stageId: undefined });
            }}
          />
          {pickingContest && <Hint>{t('pickContestHint')}</Hint>}
          {data.source === 'contest' && !inaccessible && (
            <ContestStagePicker
              stageId={data.stageId}
              onChange={(stageId) => setData({ ...data, stageId })}
            />
          )}
          {data.source === 'contest' && inaccessible && (
            <Hint icon>
              {t('contestInaccessible', { name: inaccessible.contestName })}
            </Hint>
          )}
        </>
      )}

      {data.source === 'manual' && !pickingContest && (
        <>
          <div className="gfx-mtable">
            <div className="gfx-mrow is-head">
              <span />
              <span>{t('country')}</span>
              <span>{t('points')}</span>
              <span />
            </div>
            {rows.map((row, i) => (
              // eslint-disable-next-line react/no-array-index-key
              <div className="gfx-mrow" key={i}>
                <span className="gfx-mflag">
                  <img
                    src={getFlagPathForImageGeneration(
                      { code: row.code, name: row.name, flag: row.flag } as any,
                      'big-rectangle',
                    )}
                    alt=""
                  />
                </span>
                <SelectInput<string>
                  value={row.code}
                  onChange={(code) => {
                    const c = ALL_COUNTRIES.find((x) => x.code === code);

                    updateRow(i, {
                      code,
                      name: c?.name ?? row.name,
                      flag: undefined,
                    });
                  }}
                  options={
                    countryOptions.some((o) => o.value === row.code)
                      ? countryOptions
                      : [
                          { value: row.code, label: row.name },
                          ...countryOptions,
                        ]
                  }
                  ariaLabel={t('country')}
                />
                <input
                  type="number"
                  className="gfx-input"
                  value={row.points}
                  min={0}
                  step={1}
                  aria-label={t('points')}
                  onChange={(e) =>
                    updateRow(i, {
                      // Whole, non-negative points (the schema is `int()`).
                      points: Math.max(
                        0,
                        Math.round(Number(e.target.value) || 0),
                      ),
                    })
                  }
                />
                <IconButton
                  size="xs"
                  label={t('removeRow')}
                  onClick={() => setRows(rows.filter((_, k) => k !== i))}
                >
                  <X className="size-[13px]" />
                </IconButton>
              </div>
            ))}
          </div>
          <div className="gfx-f2">
            <Button
              variant="surface"
              size="sm"
              Icon={<Plus className="size-[14px]" />}
              onClick={() => {
                const next = firstUnusedCountry();

                setRows([
                  ...rows,
                  {
                    code: next?.value ?? 'AT',
                    name: next?.label ?? 'Austria',
                    points: 0,
                  },
                ]);
              }}
            >
              {t('addRow')}
            </Button>
            <Button
              variant="surface"
              size="sm"
              Icon={<Download className="size-[14px]" />}
              onClick={() =>
                setRows(
                  liveCountries.map((c) => ({
                    code: c.code,
                    name: c.name,
                    points: c.points ?? 0,
                    juryPoints: c.juryPoints,
                    televotePoints: c.televotePoints,
                    flag: c.flag,
                  })),
                )
              }
            >
              {t('importFromLive')}
            </Button>
          </div>
        </>
      )}

      <div className="gfx-data-cur">
        <span className="gfx-field-label">{t('nowShowing')}</span>
        <Chip tone="data" icon={<Database className="size-[13px]" />}>
          {label}
        </Chip>
        <span className="gfx-muted">
          {status === 'loading' ? '…' : t('nRows', { count: countries.length })}
        </span>
      </div>
    </>
  );
};

export default DataPanel;
