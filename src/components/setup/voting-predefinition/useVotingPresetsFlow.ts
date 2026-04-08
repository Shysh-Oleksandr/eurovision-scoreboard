import { useTranslations } from 'next-intl';
import type { Dispatch, SetStateAction } from 'react';
import { useCallback, useMemo, useState } from 'react';
import { toast } from 'react-toastify';

import {
  applyDetailedPresetToStageVotes,
  applyTotalsPresetToLocalTotals,
  hasAnyStageVotes,
} from './presetMappers';

import type { EventStage } from '@/models';
import type { PointsItem } from '@/state/generalStore';
import type {
  ManualShareTotalsRow,
  StageVotes,
} from '@/state/scoreboard/types';
import {
  buildDefaultPresetName,
  buildDetailedPresetPayload,
  ensureUniquePresetName,
  type DetailedVotingPreset,
  type PointsSystemSnapshot,
  type TotalsVotingPreset,
  useVotingPresetsStore,
} from '@/state/votingPresetsStore';

export type VotingPresetRow = DetailedVotingPreset | TotalsVotingPreset;

type UseVotingPresetsFlowArgs = {
  stage: EventStage;
  contestName: string;
  contestYear: string;
  votingCountries: Array<{ code: string }>;
  pointsSystem: PointsItem[];
  votes: Partial<StageVotes> | null;
  setVotes: Dispatch<SetStateAction<Partial<StageVotes> | null>>;
  localTotals: Record<string, ManualShareTotalsRow>;
  setLocalTotals: Dispatch<
    SetStateAction<Record<string, ManualShareTotalsRow>>
  >;
  clearDetailedCellEditing: () => void;
};

export function useVotingPresetsFlow({
  stage,
  contestName,
  contestYear,
  votingCountries,
  pointsSystem,
  votes,
  setVotes,
  localTotals,
  setLocalTotals,
  clearDetailedCellEditing,
}: UseVotingPresetsFlowArgs) {
  const tSetup = useTranslations('setup.votingPredefinition');

  const detailedPresets = useVotingPresetsStore((s) => s.detailedPresets);
  const totalsPresets = useVotingPresetsStore((s) => s.totalsPresets);
  const createDetailedPreset = useVotingPresetsStore(
    (s) => s.createDetailedPreset,
  );
  const updateDetailedPreset = useVotingPresetsStore(
    (s) => s.updateDetailedPreset,
  );
  const createTotalsPreset = useVotingPresetsStore((s) => s.createTotalsPreset);
  const updateTotalsPreset = useVotingPresetsStore((s) => s.updateTotalsPreset);

  const [savePresetOpen, setSavePresetOpen] = useState(false);
  const [loadPresetOpen, setLoadPresetOpen] = useState(false);
  const [presetSaveMode, setPresetSaveMode] = useState<'create' | 'edit'>(
    'create',
  );
  const [activePresetKind, setActivePresetKind] = useState<
    'detailed' | 'totals'
  >('detailed');
  const [saveDefaultName, setSaveDefaultName] = useState('');
  const [editingPreset, setEditingPreset] = useState<VotingPresetRow | null>(
    null,
  );
  const [loadPresetKind, setLoadPresetKind] = useState<'detailed' | 'totals'>(
    'detailed',
  );

  const pointsSystemSnapshot: PointsSystemSnapshot = useMemo(
    () =>
      pointsSystem.map((p) => ({
        id: p.id,
        value: p.value,
        showDouzePoints: p.showDouzePoints,
      })),
    [pointsSystem],
  );

  const presetMeta = useMemo(
    () => ({
      sourceStageId: stage.id,
      sourceStageName: stage.name,
      sourceContestName: contestName,
      sourceContestYear: contestYear,
      participantCount: stage.countries.length,
      votingCount: votingCountries.length,
    }),
    [
      stage.id,
      stage.name,
      stage.countries.length,
      contestName,
      contestYear,
      votingCountries.length,
    ],
  );

  const openSavePresetCreate = useCallback(
    (kind: 'detailed' | 'totals') => {
      setPresetSaveMode('create');
      setEditingPreset(null);
      setActivePresetKind(kind);
      const base = buildDefaultPresetName(stage.name, contestName, contestYear);
      const existingNames =
        kind === 'detailed'
          ? detailedPresets.map((p) => p.name)
          : totalsPresets.map((p) => p.name);

      setSaveDefaultName(ensureUniquePresetName(base, existingNames));
      setSavePresetOpen(true);
    },
    [stage.name, contestName, contestYear, detailedPresets, totalsPresets],
  );

  const openSavePresetEdit = useCallback((preset: VotingPresetRow) => {
    setPresetSaveMode('edit');
    setEditingPreset(preset);
    setActivePresetKind(preset.kind);
    setSavePresetOpen(true);
  }, []);

  const openLoadPresetModal = useCallback((kind: 'detailed' | 'totals') => {
    setLoadPresetKind(kind);
    setLoadPresetOpen(true);
  }, []);

  const closeSavePresetModal = useCallback(() => {
    setSavePresetOpen(false);
    setEditingPreset(null);
  }, []);

  const handleSavePresetConfirm = useCallback(
    (name: string) => {
      if (activePresetKind === 'detailed') {
        const payload = buildDetailedPresetPayload(
          votes,
          stage.votingMode,
          pointsSystemSnapshot,
        );

        if (presetSaveMode === 'create') {
          createDetailedPreset({
            ...presetMeta,
            name,
            payload,
          });
          toast.success(tSetup('presets.toastPresetCreated', { name }));
        } else if (editingPreset?.kind === 'detailed') {
          updateDetailedPreset(editingPreset.id, { name, payload });
          toast.success(tSetup('presets.toastPresetUpdated', { name }));
        }
      } else {
        const payload = {
          votingMode: stage.votingMode,
          rows: { ...localTotals },
        };

        if (presetSaveMode === 'create') {
          createTotalsPreset({
            ...presetMeta,
            name,
            payload,
          });
          toast.success(tSetup('presets.toastPresetCreated', { name }));
        } else if (editingPreset?.kind === 'totals') {
          updateTotalsPreset(editingPreset.id, { name, payload });
          toast.success(tSetup('presets.toastPresetUpdated', { name }));
        }
      }
      setEditingPreset(null);
    },
    [
      activePresetKind,
      votes,
      stage.votingMode,
      pointsSystemSnapshot,
      presetMeta,
      presetSaveMode,
      editingPreset,
      localTotals,
      createDetailedPreset,
      updateDetailedPreset,
      createTotalsPreset,
      updateTotalsPreset,
      tSetup,
    ],
  );

  const handleLoadDetailedPreset = useCallback(
    (preset: DetailedVotingPreset) => {
      const applied = applyDetailedPresetToStageVotes(
        stage,
        preset.payload,
        pointsSystem,
      );

      setVotes(hasAnyStageVotes(applied) ? applied : null);
      clearDetailedCellEditing();
      toast.success(
        tSetup('presets.toastPresetLoadedDetailed', { name: preset.name }),
      );
    },
    [stage, pointsSystem, setVotes, clearDetailedCellEditing, tSetup],
  );

  const handleLoadTotalsPreset = useCallback(
    (preset: TotalsVotingPreset) => {
      setLocalTotals(applyTotalsPresetToLocalTotals(stage, preset.payload));
      toast.success(
        tSetup('presets.toastPresetLoadedTotals', { name: preset.name }),
      );
    },
    [stage, setLocalTotals, tSetup],
  );

  const handlePresetLoad = useCallback(
    (preset: VotingPresetRow) => {
      if (preset.kind === 'detailed') {
        handleLoadDetailedPreset(preset);
      } else {
        handleLoadTotalsPreset(preset);
      }
    },
    [handleLoadDetailedPreset, handleLoadTotalsPreset],
  );

  return {
    openSavePresetCreate,
    openLoadPresetModal,
    savePresetModalProps: {
      isOpen: savePresetOpen,
      onClose: closeSavePresetModal,
      mode: presetSaveMode,
      defaultName: saveDefaultName,
      initialName: editingPreset?.name,
      onConfirm: handleSavePresetConfirm,
    },
    loadPresetModalProps: {
      isOpen: loadPresetOpen,
      onClose: () => setLoadPresetOpen(false),
      presetKind: loadPresetKind,
      onLoad: handlePresetLoad,
      onEdit: openSavePresetEdit,
    },
  };
}
