import { Layers, Users, X } from 'lucide-react';
import { useTranslations } from 'next-intl';
import React, { useMemo, useState } from 'react';

import { countryName } from './countryMeta';
import { DivergingSlider } from './DivergingSlider';
import { RelFlag } from './RelFlag';

import Button from '@/components/common/Button';
import CustomSelect, {
  Option,
} from '@/components/common/customSelect/CustomSelect';
import { useGeneralStore } from '@/state/generalStore';
import { newDiasporaGroupId } from '@/state/scoreboard/diaspora';

interface CreateBlocEditorProps {
  countryOptions: Option[];
  onClose: () => void;
}

const imgClass = (o: Option) =>
  o.isExisting ? 'w-6 h-6 !object-contain' : 'w-6 h-4';

/**
 * Draft editor for a new custom bloc: a name, ≥2 members, and a default affinity
 * applied to every generated ordered pair. The draft lives in local state until
 * Create commits it to `customGroups`.
 */
export const CreateBlocEditor: React.FC<CreateBlocEditorProps> = ({
  countryOptions,
  onClose,
}) => {
  const t = useTranslations('settings.relations');
  const addGroup = useGeneralStore((s) => s.addDiasporaCustomGroup);

  const [name, setName] = useState('');
  const [memberCodes, setMemberCodes] = useState<string[]>([]);
  const [base, setBase] = useState(55);

  const addOptions = useMemo<Option[]>(
    () => [
      { label: t('addCountry'), value: '' },
      ...countryOptions.filter((o) => !memberCodes.includes(o.value)),
    ],
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [countryOptions, memberCodes],
  );

  const nPairs = memberCodes.length * (memberCodes.length - 1);
  const ready = name.trim().length > 0 && memberCodes.length >= 2;

  const addMember = (code: string) => {
    if (!code || memberCodes.includes(code)) return;
    setMemberCodes((m) => [...m, code]);
  };

  const create = () => {
    if (!ready) return;
    addGroup({
      id: newDiasporaGroupId(),
      name: name.trim(),
      memberCodes,
      base,
      enabled: true,
      pairs: [],
    });
    onClose();
  };

  return (
    <div
      className="rounded-xl border p-3.5"
      style={{
        borderColor: 'var(--rel-pos-bd)',
        background: 'rgba(255,255,255,.03)',
      }}
    >
      <div className="mb-3 flex items-center gap-2 text-[13.5px] font-extrabold text-white">
        <Users size={17} className="text-primary-700" />
        {t('createBlocTitle')}
      </div>

      {/* name */}
      <div className="mb-3.5">
        <div className="mb-1.5 text-[10.5px] font-extrabold uppercase tracking-wider text-white/40">
          {t('blocName')}
        </div>
        <input
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder={t('blocNamePlaceholder')}
          className="h-10 w-full rounded-lg border border-white/10 bg-black/30 px-3 text-[14px] font-bold text-white outline-none placeholder:text-white/40"
        />
      </div>

      {/* members */}
      <div className="mb-3.5">
        <div className="mb-1.5 text-[10.5px] font-extrabold uppercase tracking-wider text-white/40">
          {t('members')}
        </div>
        <div className="mb-2 flex flex-wrap gap-2">
          {memberCodes.map((c) => (
            <span
              key={c}
              className="inline-flex items-center gap-1.5 rounded-full border border-white/10 bg-black/30 py-1 pl-2 pr-1.5"
            >
              <RelFlag code={c} size={16} />
              <b className="text-[12px] font-bold text-white">
                {countryName(c)}
              </b>
              <button
                type="button"
                onClick={() => setMemberCodes((m) => m.filter((x) => x !== c))}
                className="flex text-white/40 hover:text-white/70"
                aria-label={t('remove')}
              >
                <X size={13} />
              </button>
            </span>
          ))}
        </div>
        <CustomSelect
          options={addOptions}
          value=""
          onChange={addMember}
          getImageClassName={imgClass}
        />
      </div>

      {/* default affinity */}
      <div className="mb-3.5">
        <div className="mb-1.5 flex items-baseline justify-between gap-2">
          <span className="text-[10.5px] font-extrabold uppercase tracking-wider text-white/40">
            {t('defaultAffinity')}
          </span>
          <span className="text-[11px] text-white/40">{t('tuneAfter')}</span>
        </div>
        <DivergingSlider value={base} onChange={setBase} delay={0} />
      </div>

      {/* footer */}
      <div className="flex flex-wrap items-center gap-3">
        <div className="flex min-w-[190px] flex-1 items-center gap-2 text-xs text-white/55">
          <Layers size={15} className="shrink-0 text-primary-700" />
          <span>
            {t('pairsFromCount', {
              countries: memberCodes.length,
              pairs: nPairs,
            })}
          </span>
        </div>
        <Button
          variant="tertiary"
          onClick={onClose}
          label={t('cancel')}
          className="!py-2 !px-3.5 !text-[12.5px]"
        />
        <Button
          variant="primary"
          onClick={create}
          disabled={!ready}
          label={t('createBlocCta')}
          className="!py-2 !px-3.5 !text-[12.5px]"
        />
      </div>
    </div>
  );
};
