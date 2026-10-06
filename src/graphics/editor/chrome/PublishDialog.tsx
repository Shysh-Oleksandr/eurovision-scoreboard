'use client';
import { Link2, ListChecks, Maximize, Upload, X } from 'lucide-react';
import { useTranslations } from 'next-intl';
import React, { useEffect, useMemo, useState } from 'react';
import { toast } from 'react-toastify';

import { MissingAssetError, publishDesign } from '../../cloud/publishDesign';
import DesignThumb from '../../components/DesignThumb';
import TemplateFieldsForm from '../../components/TemplateFieldsForm';
import { Design, TemplateField } from '../../model/design';
import { DesignDataProvider } from '../../render/DesignDataContext';
import {
  FieldCandidate,
  resolveTemplateField,
  templateFieldCandidates,
} from '../../templates/fields';
import { useEditorStore } from '../editorStore';
import { TYPE_ICONS } from '../inspector/Inspector';
import { Field, IconButton, Seg, TextArea, TextInput } from '../ui/controls';

import { Dialog } from './EditorDialogs';

import { useInvalidateDesigns } from '@/api/designs';
import Button from '@/components/common/Button';
import type { CloudDesign } from '@/types/design';

type Visibility = 'public' | 'unlisted';

interface Props {
  open: boolean;
  designNodeRef: React.RefObject<HTMLDivElement | null>;
  onClose: () => void;
  onPublished: (record: CloudDesign) => void;
}

/**
 * "Publish as template" (handoff §8): name, description, visibility, the
 * exposed fields as checkbox cards grouped by element (ticked fields get a
 * label input), and on the right the form people will see plus a thumbnail.
 */
const PublishDialog: React.FC<Props> = ({
  open,
  designNodeRef,
  onClose,
  onPublished,
}) => {
  const t = useTranslations('graphics.publish');
  const tf = useTranslations('graphics.fields');
  const ti = useTranslations('graphics.inspector');
  const design = useEditorStore((s) => s.design);
  const cloudId = useEditorStore((s) => s.cloudId);
  const setTemplateFields = useEditorStore((s) => s.setTemplateFields);
  const setCloudId = useEditorStore((s) => s.setCloudId);
  const invalidate = useInvalidateDesigns();

  const groups = useMemo(() => templateFieldCandidates(design), [design]);
  const defaultLabel = (c: FieldCandidate) =>
    c.labelKey ? tf(c.labelKey) : c.elementLabel ?? c.path;

  const [name, setName] = useState(design.name);
  const [description, setDescription] = useState('');
  const [visibility, setVisibility] = useState<Visibility>('public');
  const [ticked, setTicked] = useState<Set<string>>(new Set());
  const [labels, setLabels] = useState<Record<string, string>>({});
  const [busy, setBusy] = useState(false);
  const [preview, setPreview] = useState<Design>(design);

  // Seed from the design's published fields, else the defaults.
  useEffect(() => {
    if (!open) return;
    const existing = design.templateFields;
    const all = groups.flatMap((g) => g.items);
    const seed = existing?.length
      ? existing.filter((f) => all.some((c) => c.path === f.path))
      : all
          .filter((c) => c.defaultOn)
          .map((c) => ({
            path: c.path,
            label: defaultLabel(c),
          }));

    setName(design.name);
    setTicked(new Set(seed.map((f) => f.path)));
    setLabels(Object.fromEntries(seed.map((f) => [f.path, f.label])));
    setPreview(design);
    // Runs on open only.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  const fields: TemplateField[] = useMemo(
    () =>
      groups
        .flatMap((g) => g.items)
        .filter((c) => ticked.has(c.path))
        .map((c) => ({
          path: c.path,
          label: labels[c.path] || defaultLabel(c),
        })),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [groups, ticked, labels],
  );
  const previewFields = useMemo(
    () =>
      fields
        .map((f) => resolveTemplateField(preview, f))
        .filter((f): f is NonNullable<typeof f> => !!f),
    [fields, preview],
  );

  if (!open) return null;

  const toggle = (c: FieldCandidate) =>
    setTicked((prev) => {
      const next = new Set(prev);

      if (next.has(c.path)) next.delete(c.path);
      else next.add(c.path);

      return next;
    });

  const publish = async () => {
    if (!name.trim()) return;
    setBusy(true);
    try {
      const record = await publishDesign({
        design: { ...design, templateFields: fields },
        name: name.trim(),
        description: description.trim(),
        isPublic: visibility === 'public',
        cloudId,
        remixedFrom: design.remixedFrom?.designId,
        node: designNodeRef.current,
        // Remember the record as soon as it exists so a failed upload does
        // not leave an orphan and a second attempt updates it instead.
        onCreated: setCloudId,
      });

      // Only a successful publish changes the draft's fields.
      setTemplateFields(fields);
      setCloudId(record._id);
      invalidate();
      toast.success(
        visibility === 'public' ? t('toast.published') : t('toast.unlisted'),
      );
      onPublished(record);
      onClose();
    } catch (err: any) {
      console.error('Publish failed', err);
      toast.error(
        err instanceof MissingAssetError
          ? t('toast.missingAsset')
          : err?.response?.data?.message || t('toast.failed'),
      );
    } finally {
      setBusy(false);
    }
  };

  return (
    <Dialog onClose={busy ? undefined : onClose} wide ariaLabelledBy="gfx-pt">
      <div className="gfx-dlg-h">
        <h3 id="gfx-pt">{t('title')}</h3>
        <IconButton size="sm" label={t('close')} onClick={onClose}>
          <X className="size-[15px]" />
        </IconButton>
      </div>
      <div className="gfx-pub-grid">
        <div className="gfx-pub-form">
          <Field label={t('name')}>
            <TextInput value={name} onValue={setName} maxLength={100} />
          </Field>
          <div className="gfx-f2 gfx-pub-row">
            <Field label={t('description')}>
              <TextArea
                value={description}
                onValue={setDescription}
                rows={2}
                maxLength={500}
              />
            </Field>
            <Field label={t('visibility')}>
              <Seg<Visibility>
                value={visibility}
                onChange={setVisibility}
                options={[
                  { value: 'public', label: t('public') },
                  { value: 'unlisted', label: t('unlisted') },
                ]}
              />
            </Field>
          </div>
          <div className="gfx-pub-fields">
            <span className="gfx-field-label">
              {t('exposedFields')}
              <em>{t('nSelected', { count: ticked.size })}</em>
            </span>
            <p className="gfx-hint">{t('exposedHint')}</p>
            <div className="gfx-pub-groups">
              {groups.map((g) => (
                <div className="gfx-pub-group" key={g.id}>
                  <span className="gfx-pg-h">
                    {g.type === 'canvas' ? (
                      <Maximize className="size-[13px]" />
                    ) : (
                      TYPE_ICONS[g.type]
                    )}
                    {g.type === 'canvas' ? ti('canvasLabel') : g.name}
                  </span>
                  {g.items.map((c) => {
                    const on = ticked.has(c.path);

                    return (
                      <div className="gfx-pub-item" key={c.path}>
                        <label className="gfx-cb">
                          <input
                            type="checkbox"
                            checked={on}
                            onChange={() => toggle(c)}
                          />
                          <span>{defaultLabel(c)}</span>
                        </label>
                        {on && (
                          <TextInput
                            value={labels[c.path] ?? defaultLabel(c)}
                            aria-label={t('fieldLabel')}
                            onValue={(v) =>
                              setLabels((prev) => ({ ...prev, [c.path]: v }))
                            }
                          />
                        )}
                      </div>
                    );
                  })}
                </div>
              ))}
            </div>
          </div>
          {design.remixedFrom && (
            <p className="gfx-hint">
              <Link2 className="size-[13px] inline-block mr-1 -mt-px" />
              {t('willShowRemix', { name: design.remixedFrom.name })}
            </p>
          )}
        </div>
        <div className="gfx-pub-pv">
          <span className="gfx-field-label">{t('whatPeopleSee')}</span>
          <div className="gfx-pub-pv-box">
            <DesignDataProvider binding={preview.data}>
              {previewFields.length ? (
                <TemplateFieldsForm
                  design={preview}
                  onChange={setPreview}
                  fields={previewFields}
                  compact
                />
              ) : (
                <div className="gfx-gempty is-sm">
                  <span className="gfx-gempty-ic">
                    <ListChecks className="size-5" />
                  </span>
                  <h3>{t('noFields.title')}</h3>
                  <p>{t('noFields.body')}</p>
                </div>
              )}
              <div className="gfx-pub-pv-img">
                <DesignThumb design={preview} width={300} height={170} />
              </div>
            </DesignDataProvider>
          </div>
        </div>
      </div>
      <div className="gfx-dlg-row is-end">
        <button type="button" className="gfx-dlg-cancel" onClick={onClose}>
          {t('cancel')}
        </button>
        <Button
          variant="cta"
          size="md"
          isLoading={busy}
          disabled={!name.trim()}
          Icon={<Upload className="size-4" />}
          onClick={publish}
        >
          {cloudId ? t('update') : t('publish')}
        </Button>
      </div>
    </Dialog>
  );
};

export default PublishDialog;
