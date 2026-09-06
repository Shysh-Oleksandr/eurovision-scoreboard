'use client';

import { Plus, Trash2 } from 'lucide-react';
import { useTranslations } from 'next-intl';
import React, { useEffect, useRef, useState } from 'react';
import { toast } from 'react-toastify';

import { fontSampleText } from './fontPickerTypes';

import {
  FONT_ACCEPT_ATTR,
  FONT_WEIGHT_SLOTS,
  fontToSnapshot,
  useAddFontFileMutation,
  useRemoveFontFileMutation,
  useUpdateFontMutation,
} from '@/api/fonts';
import Button from '@/components/common/Button';
import { Checkbox } from '@/components/common/Checkbox';
import CustomSelect from '@/components/common/customSelect/CustomSelect';
import { Input } from '@/components/Input';
import { toastAxiosError } from '@/helpers/parseAxiosError';
import { useConfirmation } from '@/hooks/useConfirmation';
import { useFontFilesValidation } from '@/hooks/useFontFilesValidation';
import { useAuthStore } from '@/state/useAuthStore';
import { getCustomFontFamilyCss } from '@/theme/customFonts';
import { useCustomFontFaces } from '@/theme/useCustomFontFaces';
import type { Font, FontWeightSlot } from '@/types/font';

interface FontEditorCardProps {
  font: Font;
  /** Server hints from the upload (clamped weights, collisions). */
  warnings?: string[];
  onFontChange: (font: Font) => void;
  /** When provided, renders the primary "Use this font" action. */
  onUse?: () => void;
  useLabel?: string;
}

const WEIGHT_LABEL_KEY: Record<FontWeightSlot, string> = {
  400: 'regular',
  500: 'medium',
  600: 'semibold',
  700: 'bold',
};

/**
 * Everything a user can tweak about one font: name, visibility, licence note,
 * weight slots (reassign / add / remove) and a live preview at every weight.
 * Used right after an upload and from "Manage" in the library.
 */
const FontEditorCard: React.FC<FontEditorCardProps> = ({
  font,
  warnings = [],
  onFontChange,
  onUse,
  useLabel,
}) => {
  const t = useTranslations('widgets.themes.fonts');
  const tc = useTranslations('common');
  const userCountry = useAuthStore((s) => s.user?.country);
  const { confirm } = useConfirmation();
  const { validate } = useFontFilesValidation();

  const updateFont = useUpdateFontMutation();
  const addFile = useAddFontFileMutation();
  const removeFile = useRemoveFontFileMutation();

  const [nameDraft, setNameDraft] = useState(font.name);
  const [addProgress, setAddProgress] = useState<number | null>(null);
  const addFileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    setNameDraft(font.name);
  }, [font._id, font.name]);

  const snapshot = fontToSnapshot(font);
  const fontFamily = getCustomFontFamilyCss(snapshot, 'montserrat');

  useCustomFontFaces(snapshot);

  const isBusy =
    updateFont.isPending || addFile.isPending || removeFile.isPending;

  const runUpdate = async (
    patch: Omit<Parameters<typeof updateFont.mutateAsync>[0], 'id'>,
  ) => {
    try {
      onFontChange(await updateFont.mutateAsync({ id: font._id, ...patch }));
    } catch (error) {
      toastAxiosError(error);
    }
  };

  const commitName = () => {
    const trimmed = nameDraft.trim();

    if (!trimmed) {
      setNameDraft(font.name);

      return;
    }
    if (trimmed !== font.name) void runUpdate({ name: trimmed });
  };

  const handleVisibilityChange = (nextPublic: boolean) => {
    if (!nextPublic) {
      void runUpdate({ isPublic: false });

      return;
    }
    // The confirmation doubles as the licence consent.
    confirm({
      key: 'publish-font',
      type: 'info',
      title: t('publishTitle'),
      description: t('publishDescription'),
      onConfirm: () => runUpdate({ isPublic: true, licenseAccepted: true }),
    });
  };

  const handleReassign = (sha256: string, nextWeight: FontWeightSlot) => {
    const weights = font.faces.map((f) => ({
      sha256: f.sha256,
      weight: f.sha256 === sha256 ? nextWeight : f.weight,
    }));

    void runUpdate({ weights });
  };

  const handleRemove = (weight: FontWeightSlot) => {
    confirm({
      key: 'remove-font-weight',
      type: 'danger',
      title: t('weights.removeTitle', { weight }),
      description: t('weights.removeDescription'),
      onConfirm: async () => {
        try {
          onFontChange(await removeFile.mutateAsync({ id: font._id, weight }));
        } catch (error) {
          toastAxiosError(error);
        }
      },
    });
  };

  const handleAddFile = async (file: File | null) => {
    if (!file) return;
    const { valid, errors } = validate([file], 1);

    errors.forEach((message) => toast.error(message));
    if (!valid.length) return;

    setAddProgress(0);
    try {
      const result = await addFile.mutateAsync({
        id: font._id,
        file: valid[0],
        onUploadProgress: (p) => setAddProgress(p.percent),
      });

      result.warnings.forEach((w) => toast.warn(w));
      onFontChange(result.font);
    } catch (error) {
      toastAxiosError(error);
    } finally {
      setAddProgress(null);
      if (addFileInputRef.current) addFileInputRef.current.value = '';
    }
  };

  const faceByWeight = new Map(font.faces.map((f) => [f.weight, f]));
  const takenSlots = new Set(font.faces.map((f) => f.weight));
  const freeSlots = FONT_WEIGHT_SLOTS.filter((w) => !takenSlots.has(w));
  const resolvedFaceFor = (weight: FontWeightSlot) =>
    font.faces.find(
      (f) => weight >= f.weightRange[0] && weight <= f.weightRange[1],
    );

  return (
    <div className="space-y-4 rounded-[14px] border border-white/10 bg-black/20 p-3 sm:p-4">
      {warnings.length > 0 && (
        <div className="rounded-[10px] border border-amber-300/40 bg-amber-300/10 px-3 py-2 text-sm text-amber-100 space-y-1">
          <p className="font-bold">{t('warningsTitle')}</p>
          <ul className="list-disc pl-4 space-y-0.5">
            {warnings.map((w) => (
              <li key={w}>{w}</li>
            ))}
          </ul>
        </div>
      )}

      <div className="flex flex-col gap-1.5">
        <label
          htmlFor={`font-name-${font._id}`}
          className="text-sm font-medium text-white"
        >
          {t('fontName')}
        </label>
        <Input
          id={`font-name-${font._id}`}
          value={nameDraft}
          maxLength={80}
          onChange={(e) => setNameDraft(e.target.value)}
          onBlur={commitName}
          onKeyDown={(e) => {
            if (e.key === 'Enter') (e.target as HTMLInputElement).blur();
          }}
          disabled={isBusy}
        />
      </div>

      <Checkbox
        id={`font-public-${font._id}`}
        label={t('listPublicly')}
        labelClassName="w-full !px-0 !pt-1 !items-start"
        checked={font.isPublic}
        disabled={isBusy}
        onChange={(e) => handleVisibilityChange(e.target.checked)}
      />

      <div className="space-y-2">
        <h5 className="text-sm font-bold text-white">{t('weights.title')}</h5>
        {font.isVariable ? (
          <div className="rounded-[10px] bg-primary-700/20 border border-white/10 px-3 py-2.5 text-sm text-white/85">
            {t('weights.variable')}
            {font.faces[0]?.wghtRange && (
              <span className="text-white/60">
                {' · '}
                {t('weights.axis', {
                  min: font.faces[0].wghtRange[0],
                  max: font.faces[0].wghtRange[1],
                })}
              </span>
            )}
          </div>
        ) : (
          <div className="grid sm:grid-cols-2 gap-2">
            {FONT_WEIGHT_SLOTS.map((weight) => {
              const face = faceByWeight.get(weight);
              const fallback = face ? undefined : resolvedFaceFor(weight);

              return (
                <div
                  key={weight}
                  className={`rounded-[10px] border px-3 py-2.5 space-y-2 ${
                    face
                      ? 'border-white/15 bg-primary-700/20'
                      : 'border-dashed border-white/15 bg-black/10'
                  }`}
                >
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-sm font-bold text-white">
                      {t(`weights.${WEIGHT_LABEL_KEY[weight]}`)}{' '}
                      <span className="text-white/50 font-medium">
                        {weight}
                      </span>
                    </span>
                    {face ? (
                      <span className="text-[11px] font-bold uppercase tracking-wider text-emerald-200/90">
                        {t('weights.uploaded')}
                      </span>
                    ) : fallback ? (
                      <span className="text-[11px] font-bold uppercase tracking-wider text-white/50">
                        {t('weights.fallsBackTo', { weight: fallback.weight })}
                      </span>
                    ) : null}
                  </div>
                  {face ? (
                    <div className="flex items-center gap-2">
                      <span
                        className="text-xs text-white/60 truncate flex-1"
                        title={face.sourceFilename}
                      >
                        {face.sourceFilename ?? `${weight}.${face.format}`}
                      </span>
                      {freeSlots.length > 0 && (
                        <CustomSelect
                          id={`font-weight-${font._id}-${weight}`}
                          options={[weight, ...freeSlots]
                            .sort((a, b) => a - b)
                            .map((w) => ({
                              value: String(w),
                              label: String(w),
                            }))}
                          value={String(weight)}
                          onChange={(v) =>
                            handleReassign(
                              face.sha256,
                              Number(v) as FontWeightSlot,
                            )
                          }
                          className="w-[88px]"
                          selectClassName="!h-9 !py-1 !text-sm"
                          withIndicator={false}
                          dataTheme="custom-preview"
                        />
                      )}
                      <button
                        type="button"
                        onClick={() => handleRemove(weight)}
                        disabled={isBusy || font.faces.length <= 1}
                        className="p-1.5 rounded-md text-white/60 hover:text-white hover:bg-white/10 disabled:opacity-40 disabled:cursor-not-allowed"
                        aria-label={t('weights.remove')}
                        title={t('weights.remove')}
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  ) : (
                    <Button
                      variant="tertiary"
                      className="w-fit text-sm !py-1.5 !px-3"
                      Icon={<Plus className="w-4 h-4" />}
                      onClick={() => addFileInputRef.current?.click()}
                      disabled={isBusy || addProgress !== null}
                      label={
                        addProgress !== null
                          ? t('uploading', { percent: addProgress })
                          : t('weights.addFile')
                      }
                    />
                  )}
                </div>
              );
            })}
          </div>
        )}
        <input
          ref={addFileInputRef}
          type="file"
          accept={FONT_ACCEPT_ATTR}
          className="hidden"
          onChange={(e) => void handleAddFile(e.target.files?.[0] ?? null)}
        />
        <p className="text-xs text-white/50">{t('fallbackHint')}</p>
      </div>

      <div className="space-y-1.5">
        <h5 className="text-sm font-bold text-white">{t('previewTitle')}</h5>
        <div className="rounded-[10px] bg-black/25 border border-white/10 px-3 py-2.5 space-y-1.5">
          {FONT_WEIGHT_SLOTS.map((weight) => (
            <p
              key={weight}
              className="text-lg leading-tight text-white flex items-baseline gap-3"
              style={{ fontFamily, fontWeight: weight, fontSynthesis: 'none' }}
            >
              <span className="text-xs text-white/40 font-sans font-medium w-8 shrink-0">
                {weight}
              </span>
              {fontSampleText(font.creator?.country || userCountry)}
            </p>
          ))}
        </div>
      </div>

      {onUse && (
        <div className="flex justify-end">
          <Button onClick={onUse} disabled={isBusy} className="text-sm">
            {useLabel ?? t('useThisFont')}
          </Button>
        </div>
      )}
      {!onUse && isBusy && (
        <p className="text-xs text-white/50">{tc('loading')}</p>
      )}
    </div>
  );
};

export default FontEditorCard;
