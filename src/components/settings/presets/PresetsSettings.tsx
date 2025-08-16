import React, { useEffect, useMemo, useState } from 'react';

import { PresetNameModal } from './PresetNameModal';
import { PresetsTable } from './PresetsTable';
import { usePresetLoader } from './usePresetLoader';
import { usePresetSnapshot } from './usePresetSnapshot';

import Button from '@/components/common/Button';
import {
  Preset,
  deletePresetFromDB,
  getAllPresetsFromDB,
  savePresetToDB,
} from '@/helpers/indexedDB';
import { useGeneralStore } from '@/state/generalStore';

export const PresetsSettings: React.FC = () => {
  const { contestName, contestYear } = useGeneralStore((s) => s.settings);

  const [presets, setPresets] = useState<Preset[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [createOpen, setCreateOpen] = useState(false);
  const [editOpen, setEditOpen] = useState(false);
  const [editing, setEditing] = useState<Preset | null>(null);

  const { build } = usePresetSnapshot();
  const { loadPreset } = usePresetLoader();

  const defaultName = useMemo(() => {
    const name = `${contestName} ${contestYear}`;

    const count = presets.filter((p) => p.name === name).length;

    if (count > 0) {
      return `${name} (${count + 1})`;
    }

    return name;
  }, [contestName, contestYear, presets]);

  const refresh = async () => {
    try {
      const all = await getAllPresetsFromDB();

      // sort desc by updatedAt
      all.sort((a, b) => (b.updatedAt ?? 0) - (a.updatedAt ?? 0));
      setPresets(all);
      setError(null);
    } catch (e) {
      setError('Failed to load presets');
    }
  };

  useEffect(() => {
    refresh();
  }, []);

  const handleCreateSave = async (name: string) => {
    const preset = build(name);

    await savePresetToDB(preset);
    await refresh();
  };

  const handleEditSave = async (name: string) => {
    if (!editing) return;
    const updated: Preset = {
      ...editing,
      name,
      updatedAt: Date.now(),
    } as Preset;

    await savePresetToDB(updated);
    await refresh();
  };

  const handleEditDelete = async () => {
    if (!editing) return;
    await deletePresetFromDB(editing.id);
    await refresh();
  };

  const handleLoad = (id: string) => {
    void loadPreset(id);
  };

  const handleEdit = (preset: Preset) => {
    setEditing(preset);
    setEditOpen(true);
  };

  const renderContent = () => {
    if (error) {
      return <div className="text-red-400">{error}</div>;
    }

    return (
      <PresetsTable presets={presets} onLoad={handleLoad} onEdit={handleEdit} />
    );
  };

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between gap-2">
        <div className="text-base sm:text-lg font-semibold">
          Saved Presets ({presets.length})
        </div>
        <Button onClick={() => setCreateOpen(true)}>Save current</Button>
      </div>

      {renderContent()}

      {/* Create modal */}
      <PresetNameModal
        isOpen={createOpen}
        title="Save Current Setup"
        initialName={defaultName}
        onClose={() => setCreateOpen(false)}
        onSave={handleCreateSave}
      />

      {/* Edit modal */}
      <PresetNameModal
        isOpen={editOpen}
        title="Edit Preset"
        initialName={editing?.name ?? defaultName}
        onClose={() => setEditOpen(false)}
        onSave={handleEditSave}
        onDelete={editing ? handleEditDelete : null}
      />
    </div>
  );
};
