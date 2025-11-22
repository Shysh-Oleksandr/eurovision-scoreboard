import { useLocale } from 'next-intl';
import React from 'react';

import { PencilIcon } from '@/assets/icons/PencilIcon';
import { UploadIcon } from '@/assets/icons/UploadIcon';
import Button from '@/components/common/Button';
import { formatDate } from '@/components/feedbackInfo/types';
import { Preset } from '@/helpers/indexedDB';
import { EventMode, EventStage } from '@/models';

const TABLE_COLUMNS = [
  { key: 'name', label: 'Name' },
  { key: 'contestName', label: 'Contest' },
  { key: 'year', label: 'Year' },
  { key: 'themeYear', label: 'Theme' },
  { key: 'stagesLabel', label: 'Shows' },
  { key: 'participants', label: 'Participants' },
  { key: 'createdAt', label: 'Created' },
];

interface PresetRow {
  id: string;
  name: string;
  contestName: string;
  year: string;
  themeYear: string;
  stagesLabel: string;
  participants: number;
  createdAt: number;
}

interface PresetsTableProps {
  presets: Preset[];
  onLoad: (id: string) => void;
  onEdit: (preset: Preset) => void;
}

const countStages = (stages: EventStage[], activeMode: EventMode) => {
  if (activeMode === EventMode.GRAND_FINAL_ONLY) {
    return { sfCount: 0, gfCount: 1 };
  }

  return { sfCount: stages.length - 1, gfCount: 1 };
};

const getParticipantsCount = (eventAssignments: Record<string, string>) => {
  const filteredAssignments = Object.values(eventAssignments).filter(
    (country) => country !== 'NOT_PARTICIPATING',
  );

  return filteredAssignments.length;
};

export const PresetsTable: React.FC<PresetsTableProps> = ({
  presets,
  onLoad,
  onEdit,
}) => {
  const locale = useLocale();
  const rows: PresetRow[] = presets.map((p) => {
    const activeMode =
      p.countries?.activeMode || EventMode.SEMI_FINALS_AND_GRAND_FINAL;
    const stages: EventStage[] = p.countries?.configuredEventStages || [];
    const { sfCount, gfCount } = countStages(stages, activeMode);
    const participants = getParticipantsCount(
      p.countries?.eventAssignments[activeMode] || {},
    );
    const contestName = p.general?.settings?.contestName || '—';
    const year = p.general?.year || p.general?.settings?.contestYear || '—';

    const isGrandFinalOnly = activeMode === EventMode.GRAND_FINAL_ONLY;

    return {
      id: p.id,
      name: p.name,
      contestName,
      year,
      themeYear: p.general?.themeYear.replace('-', ' ') || '—',
      stagesLabel:
        isGrandFinalOnly || sfCount === 0
          ? 'GF Only'
          : `${sfCount} SF + ${gfCount} GF`,
      participants,
      createdAt: p.createdAt,
    };
  });

  if (presets.length === 0) {
    return (
      <div className="text-white/70">
        No presets yet. Save your current setup to create one.
      </div>
    );
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-left text-sm rounded-lg overflow-hidden shadow-sm bg-primary-900 bg-gradient-to-br from-primary-900 to-primary-800/70 min-w-[800px]">
        <thead>
          <tr className="text-white/70">
            {TABLE_COLUMNS.map((c) => (
              <th key={c.key} className="py-2 px-3 align-top text-center">
                {c.label}
              </th>
            ))}
            <th className="py-2 pr-3 text-center">Actions</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((r) => (
            <tr
              key={r.id}
              className="border-t border-solid border-primary-800 transition-colors"
            >
              {TABLE_COLUMNS.map((c, index) => (
                <td
                  key={c.key}
                  className={`py-2 px-3 text-center ${
                    index === 0 ? 'font-semibold' : 'font-medium'
                  }`}
                >
                  {c.key === 'createdAt'
                    ? formatDate(
                        new Date(r[c.key as keyof PresetRow]).toISOString(),
                        locale,
                      )
                    : r[c.key as keyof PresetRow]}
                </td>
              ))}
              <td className="py-2 pr-3">
                <div className="flex items-center gap-2 justify-end">
                  <Button
                    variant="tertiary"
                    title="Load preset"
                    onClick={() => onLoad(r.id)}
                    className="sm:!px-3 !px-2 !py-1.5 capitalize !text-sm flex items-center gap-1.5"
                  >
                    <UploadIcon className="w-4 h-4 mb-[1px]" />
                    Load
                  </Button>
                  <Button
                    title="Edit preset"
                    onClick={() => {
                      const found = presets.find((p) => p.id === r.id);

                      if (found) onEdit(found);
                    }}
                    className="sm:!px-3 !px-2 !py-1.5 capitalize !text-sm flex items-center gap-1.5"
                  >
                    <PencilIcon className="w-4 h-4 mb-[1px]" />
                    Edit
                  </Button>
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};
