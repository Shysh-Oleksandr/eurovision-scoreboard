'use client';
import {
  AlertTriangle,
  Bookmark,
  Clock,
  Copy,
  Download,
  FilePlus,
  Filter,
  FolderInput,
  Globe,
  HardDrive,
  LayoutTemplate,
  Link2,
  MoreHorizontal,
  PencilLine,
  Search,
  Sparkles,
  Trash2,
  Upload,
} from 'lucide-react';
import { useTranslations } from 'next-intl';
import React, {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import { toast } from 'react-toastify';

import WidgetPager from '../WidgetPager';

import {
  DesignSortBy,
  useMyDesignsQuery,
  usePublicDesignsQuery,
  useSavedDesignsQuery,
} from '@/api/designs';
import AnchoredMenu, {
  AnchoredMenuEntry,
} from '@/components/common/AnchoredMenu';
import Button from '@/components/common/Button';
import Modal from '@/components/common/Modal/Modal';
import ModalBottomCloseButton from '@/components/common/Modal/ModalBottomCloseButton';
import Tabs, { TabContent } from '@/components/common/tabs/Tabs';
import { CloudGrid } from '@/graphics/components/CloudDesignCards';
import DesignThumb from '@/graphics/components/DesignThumb';
import PromptDialog from '@/graphics/components/PromptDialog';
import ReportDialog from '@/graphics/components/ReportDialog';
import { useTemplateContext } from '@/graphics/editor/useEditorContext';
import { Design, parseDesign } from '@/graphics/model/design';
import { SizeClass, sizeClassOf } from '@/graphics/model/presets';
import { newElementId } from '@/graphics/model/serialize';
import { DesignDataProvider } from '@/graphics/render/DesignDataContext';
import { useGraphicsStudioStore } from '@/graphics/state/graphicsStudioStore';
import {
  deleteDesignRecord,
  DesignRecord,
  listDesignsWithUnreadable,
  newRecordId,
  putDesignRecord,
  UnreadableRecord,
} from '@/graphics/storage/designsDb';
import { EDITOR_TEMPLATES, EditorTemplate } from '@/graphics/templates/editor';
import { useConfirmation } from '@/hooks/useConfirmation';
import { useDebounce } from '@/hooks/useDebounce';
import { useEffectOnce } from '@/hooks/useEffectOnce';
import { useAuthStore } from '@/state/useAuthStore';
import type { CloudDesign } from '@/types/design';

import '@/graphics/editor/editor.css';

type GalleryTab = 'my-designs' | 'templates' | 'saved';

/** Stable reference so every thumbnail does not re-resolve its data. */
const LIVE_BINDING = { source: 'live' } as const;

type SortKey = 'newest' | 'used' | 'liked';
type SizeFilter = 'any' | SizeClass;

const SORT: Record<SortKey, DesignSortBy> = {
  newest: 'createdAt',
  used: 'duplicatesCount',
  liked: 'likes',
};
const SIZES: SizeFilter[] = [
  'any',
  'landscape',
  'portrait',
  'square',
  'story',
  'broadcast',
];

const relativeTime = (ts: number, t: ReturnType<typeof useTranslations>) => {
  const diff = Math.max(0, Date.now() - ts);
  const m = Math.round(diff / 60000);

  if (m < 1) return t('justNow');
  if (m < 60) return t('minutesAgo', { count: m });
  const h = Math.round(m / 60);

  if (h < 24) return t('hoursAgo', { count: h });

  return t('daysAgo', { count: Math.round(h / 24) });
};

const sizeLabel = (design: Design, t: ReturnType<typeof useTranslations>) =>
  design.canvas.autoSize
    ? t('contentSized')
    : `${design.canvas.width} × ${design.canvas.height}`;

const designLink = (id: string) =>
  `${window.location.href.split('?')[0]}?design=${id}`;

/** Download a draft as JSON (a cheap backup: drafts live in this browser). */
const exportDesignJson = (name: string, design: unknown) => {
  const payload = {
    format: 'douzepoints-design',
    version: 1,
    name,
    design,
  };
  const blob = new Blob([JSON.stringify(payload, null, 2)], {
    type: 'application/json',
  });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');

  link.download = `${name
    .replace(/[^\w-]+/g, '-')
    .toLowerCase()}.douze-design.json`;
  link.href = url;
  link.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
};

/* ---------------- cards ---------------- */

const DesignCard: React.FC<{
  record: DesignRecord;
  onOpen: () => void;
  onDuplicate: () => void;
  onRename: () => void;
  onPublish: () => void;
  onExport: () => void;
  onDelete: () => void;
}> = ({
  record,
  onOpen,
  onDuplicate,
  onRename,
  onPublish,
  onExport,
  onDelete,
}) => {
  const t = useTranslations('graphics.gallery');
  const [menuOpen, setMenuOpen] = useState(false);
  const anchorRef = useRef<HTMLButtonElement>(null);
  const items: AnchoredMenuEntry[] = [
    {
      label: t('openInEditor'),
      icon: <PencilLine className="size-4" />,
      onClick: onOpen,
    },
    {
      label: t('duplicate'),
      icon: <Copy className="size-4" />,
      onClick: onDuplicate,
    },
    {
      label: t('rename'),
      icon: <PencilLine className="size-4" />,
      onClick: onRename,
    },
    {
      label: t('exportJson'),
      icon: <Download className="size-4" />,
      onClick: onExport,
    },
    {
      label: record.cloudId ? t('updateTemplate') : t('publishAsTemplate'),
      icon: <Upload className="size-4" />,
      onClick: onPublish,
    },
    ...(record.cloudId
      ? [
          {
            label: t('copyLink'),
            icon: <Link2 className="size-4" />,
            onClick: () => {
              navigator.clipboard.writeText(designLink(record.cloudId!));
              toast.success(t('toast.linkCopied'));
            },
          },
        ]
      : []),
    'hr',
    {
      label: t('delete'),
      icon: <Trash2 className="size-4" />,
      variant: 'danger',
      onClick: onDelete,
    },
  ];
  const { data } = record.design;
  const dataLabel =
    data.source === 'manual'
      ? `${t('manual')} · ${t('nRows', { count: data.rows.length })}`
      : data.source === 'contest'
      ? data.contestName || t('savedContest')
      : t('live');

  return (
    <article className="gfx-gcard is-mine">
      <button
        type="button"
        className="gfx-gthumb-btn"
        aria-label={`${t('openInEditor')}: ${record.name}`}
        onClick={onOpen}
      >
        <div className="gfx-gthumb">
          <DesignThumb design={record.design} width={252} height={150} />
        </div>
      </button>
      <div className="gfx-gbody">
        <div className="gfx-gtitle-row">
          <h3>{record.name}</h3>
          <button
            ref={anchorRef}
            type="button"
            className="gfx-iconbtn gfx-iconbtn--sm"
            aria-label={t('more')}
            aria-expanded={menuOpen}
            onClick={() => setMenuOpen((v) => !v)}
          >
            <MoreHorizontal className="size-[16px]" />
          </button>
          <AnchoredMenu
            open={menuOpen}
            anchor={anchorRef.current}
            onClose={() => setMenuOpen(false)}
            items={items}
            placement="bottom-end"
          />
        </div>
        <div className="gfx-gmeta">
          <span className="gfx-chip">{sizeLabel(record.design, t)}</span>
          <span className="gfx-chip gfx-chip--data">{dataLabel}</span>
          {record.cloudId && (
            <span className="gfx-chip gfx-chip--built">
              <Globe className="size-[12px]" />
              {t('published')}
            </span>
          )}
          <span className="gfx-gtime">
            <Clock className="size-3" />
            {relativeTime(record.updatedAt, t)}
          </span>
        </div>
      </div>
    </article>
  );
};

/** A stored draft that no longer passes the schema: keep it visible. */
const UnreadableCard: React.FC<{
  record: UnreadableRecord;
  onExport: () => void;
  onDelete: () => void;
}> = ({ record, onExport, onDelete }) => {
  const t = useTranslations('graphics.gallery');

  return (
    <article className="gfx-gcard is-mine is-unreadable">
      <div className="gfx-gthumb gfx-gthumb--broken" aria-hidden="true">
        <AlertTriangle className="size-6" />
      </div>
      <div className="gfx-gbody">
        <div className="gfx-gtitle-row">
          <h3>{record.name}</h3>
        </div>
        <p className="gfx-gdesc">{t('unreadable.body')}</p>
        <p className="gfx-gdesc gfx-gdesc--mono" title={record.error}>
          {record.error.slice(0, 120)}
        </p>
        <div className="gfx-gact">
          <Button
            variant="surface"
            size="md"
            className="flex-1 justify-center"
            Icon={<Download className="size-4" />}
            onClick={onExport}
          >
            {t('exportJson')}
          </Button>
          <Button
            variant="surface"
            size="md"
            title={t('delete')}
            Icon={<Trash2 className="size-4" />}
            onClick={onDelete}
          />
        </div>
      </div>
    </article>
  );
};

const TemplateCard: React.FC<{
  template: EditorTemplate;
  design: Design;
  onUse: () => void;
}> = ({ template, design, onUse }) => {
  const t = useTranslations('graphics.gallery');
  const n = design.templateFields?.length ?? 0;

  return (
    <article className="gfx-gcard is-built">
      <button
        type="button"
        className="gfx-gthumb-btn"
        aria-label={`${t('useTemplate')}: ${t(
          `templates.${template.id}.name`,
        )}`}
        onClick={onUse}
      >
        <div className="gfx-gthumb">
          <DesignThumb design={design} width={252} height={150} />
        </div>
      </button>
      <div className="gfx-gbody">
        <div className="gfx-gtitle-row">
          <h3>{t(`templates.${template.id}.name`)}</h3>
          <span className="gfx-chip gfx-chip--built">
            <Sparkles className="size-[13px]" />
            {t('builtIn')}
          </span>
        </div>
        <p className="gfx-gdesc">{t(`templates.${template.id}.description`)}</p>
        <div className="gfx-gmeta">
          <span className="gfx-chip">{sizeLabel(design, t)}</span>
          {n > 0 && (
            <span className="gfx-chip">{t('nFields', { count: n })}</span>
          )}
        </div>
        <div className="gfx-gact">
          <Button
            variant="cta"
            size="md"
            className="flex-1 justify-center"
            onClick={onUse}
          >
            {t('useTemplate')}
          </Button>
        </div>
      </div>
    </article>
  );
};

/* ---------------- modal ---------------- */

interface Props {
  isOpen: boolean;
  onClose: () => void;
  onLoaded: () => void;
}

/**
 * Hub → Graphics (handoff §2): My designs (local drafts), Templates (mine
 * in the cloud, built-in, community with search / sort / size / content
 * filters) and Saved. "Use template" opens the template sheet.
 */
const GraphicsModal: React.FC<Props> = ({ isOpen, onClose, onLoaded }) => {
  const t = useTranslations('graphics.gallery');
  const tab = useGraphicsStudioStore((s) => s.galleryTab);
  const setOpen = useGraphicsStudioStore((s) => s.setGraphicsModalOpen);
  const setTab = useCallback(
    (next: string) => setOpen(true, next as GalleryTab),
    [setOpen],
  );
  const [records, setRecords] = useState<DesignRecord[] | null>(null);
  const [unreadable, setUnreadable] = useState<UnreadableRecord[]>([]);
  const [renaming, setRenaming] = useState<DesignRecord | null>(null);
  const [reporting, setReporting] = useState<CloudDesign | null>(null);
  const importRef = useRef<HTMLInputElement>(null);
  const openEditor = useGraphicsStudioStore((s) => s.openEditor);
  const openSheet = useGraphicsStudioStore((s) => s.openSheet);
  const editorOpen = useGraphicsStudioStore((s) => s.editorOpen);
  const draftsVersion = useGraphicsStudioStore((s) => s.draftsVersion);
  const bumpDrafts = useGraphicsStudioStore((s) => s.bumpDrafts);
  const user = useAuthStore((s) => s.user);
  const ctx = useTemplateContext();
  const { confirm } = useConfirmation();

  const [search, setSearch] = useState('');
  const q = useDebounce(search, 350);
  const [sort, setSort] = useState<SortKey>('newest');
  const [size, setSize] = useState<SizeFilter>('any');
  const [wantScoreboard, setWantScoreboard] = useState(false);
  const [wantStats, setWantStats] = useState(false);
  const [page, setPage] = useState(1);
  const [savedPage, setSavedPage] = useState(1);

  useEffectOnce(onLoaded);

  const refresh = useCallback(async () => {
    const all = await listDesignsWithUnreadable();

    setRecords(all.records);
    setUnreadable(all.unreadable);
  }, []);

  useEffect(() => {
    if (isOpen) refresh();
  }, [isOpen, draftsVersion, editorOpen, refresh]);

  useEffect(() => {
    setPage(1);
  }, [q, sort, size, wantScoreboard, wantStats]);

  const filters = {
    search: q,
    sortBy: SORT[sort],
    sortOrder: 'desc' as const,
    sizeClass: size === 'any' ? undefined : size,
    hasScoreboard: wantScoreboard || undefined,
    hasStats: wantStats || undefined,
  };
  const community = usePublicDesignsQuery({
    ...filters,
    page,
    enabled: isOpen && tab === 'templates',
  });
  const mine = useMyDesignsQuery({
    ...filters,
    limit: 50,
    enabled: isOpen && tab === 'templates' && !!user,
  });
  const saved = useSavedDesignsQuery({
    page: savedPage,
    enabled: isOpen && tab === 'saved' && !!user,
  });

  const builtIn = useMemo(
    () =>
      EDITOR_TEMPLATES.filter((tpl) => tpl.id !== 'blank')
        .map((tpl) => ({ tpl, design: tpl.build(ctx) }))
        .filter(({ tpl }) => {
          const cls = sizeClassOf(tpl.width, tpl.height, tpl.autoSize);

          if (size !== 'any' && cls !== size) return false;
          if (wantScoreboard && !tpl.tags.includes('scoreboard')) return false;
          if (wantStats && !tpl.tags.includes('stats')) return false;
          if (
            q &&
            !t(`templates.${tpl.id}.name`)
              .toLowerCase()
              .includes(q.toLowerCase())
          ) {
            return false;
          }

          return true;
        }),
    [ctx, size, wantScoreboard, wantStats, q, t],
  );

  const newBlank = () =>
    openEditor({ design: EDITOR_TEMPLATES[0].build(ctx), draftId: null });

  const startBuiltIn = ({
    tpl,
    design,
  }: {
    tpl: EditorTemplate;
    design: Design;
  }) => openSheet({ design, source: { kind: 'builtin', templateId: tpl.id } });

  const startCloud = (record: CloudDesign) => {
    try {
      openSheet({
        design: parseDesign(record.design),
        source: { kind: 'cloud', record },
      });
    } catch (err) {
      console.error('Unreadable design', err);
      toast.error(t('toast.unreadable'));
    }
  };

  const duplicate = async (record: DesignRecord) => {
    const now = Date.now();

    await putDesignRecord({
      id: newRecordId('d'),
      name: `${record.name} copy`,
      createdAt: now,
      updatedAt: now,
      design: {
        ...record.design,
        id: newElementId('design'),
        name: `${record.name} copy`,
      },
    });
    bumpDrafts();
    toast.success(t('toast.duplicated'));
  };

  const rename = async (record: DesignRecord, name: string) => {
    if (name === record.name) return;
    await putDesignRecord({
      ...record,
      name,
      updatedAt: Date.now(),
      design: { ...record.design, name },
    });
    bumpDrafts();
  };

  const removeUnreadable = (record: UnreadableRecord) =>
    confirm({
      key: 'delete-graphics-design',
      title: t('deleteTitle', { name: record.name }),
      description: t('deleteBody'),
      type: 'danger',
      onConfirm: async () => {
        await deleteDesignRecord(record.id);
        bumpDrafts();
        toast.success(t('toast.deleted'));
      },
    });

  /** Import a `.douze-design.json` (or a bare design document). */
  const importJson = async (file: File | undefined) => {
    if (!file) return;
    try {
      const json = JSON.parse(await file.text());
      const raw = json?.format === 'douzepoints-design' ? json.design : json;
      const design = parseDesign({
        ...raw,
        id: newElementId('design'),
        name: raw?.name || json?.name || file.name.replace(/\.[^.]+$/, ''),
      });
      const now = Date.now();

      await putDesignRecord({
        id: newRecordId('d'),
        name: design.name,
        createdAt: now,
        updatedAt: now,
        design,
      });
      bumpDrafts();
      toast.success(t('toast.imported', { name: design.name }));
    } catch (err) {
      console.error('Design import failed', err);
      toast.error(t('toast.importFailed'));
    }
  };

  const remove = (record: DesignRecord) =>
    confirm({
      key: 'delete-graphics-design',
      title: t('deleteTitle', { name: record.name }),
      description: t('deleteBody'),
      type: 'danger',
      onConfirm: async () => {
        await deleteDesignRecord(record.id);
        bumpDrafts();
        toast.success(t('toast.deleted'));
      },
    });

  const tabs = useMemo(
    () => [
      { value: 'my-designs', label: t('tabs.myDesigns') },
      { value: 'templates', label: t('tabs.templates') },
      { value: 'saved', label: t('tabs.saved') },
    ],
    [t],
  );

  const clearFilters = () => {
    setSearch('');
    setSort('newest');
    setSize('any');
    setWantScoreboard(false);
    setWantStats(false);
  };
  const filtered =
    !!q || size !== 'any' || wantScoreboard || wantStats || sort !== 'newest';

  const myDesigns = (
    <div className="gfx-gallery">
      <div className="gfx-gallery-head">
        <div className="gfx-gallery-ht">
          <h2>{t('title')}</h2>
          <span className="gfx-gallery-sub">
            <HardDrive className="size-[13px]" />
            {t('keptInBrowser')}
          </span>
        </div>
        <input
          ref={importRef}
          type="file"
          accept="application/json,.json"
          className="hidden"
          onChange={(e) => {
            importJson(e.target.files?.[0]);
            e.target.value = '';
          }}
        />
        <Button
          variant="surface"
          size="md"
          title={t('importJson')}
          Icon={<FolderInput className="size-4" />}
          onClick={() => importRef.current?.click()}
        >
          {t('importJson')}
        </Button>
        <Button
          variant="surface"
          size="md"
          Icon={<FilePlus className="size-4" />}
          onClick={newBlank}
        >
          {t('newBlank')}
        </Button>
      </div>
      {records && records.length === 0 && unreadable.length === 0 ? (
        <div className="gfx-gempty">
          <span className="gfx-gempty-ic">
            <Sparkles className="size-5" />
          </span>
          <h3>{t('empty.title')}</h3>
          <p>{t('empty.body')}</p>
          <div className="gfx-gempty-a">
            <Button
              variant="cta"
              size="md"
              Icon={<LayoutTemplate className="size-4" />}
              onClick={() => setTab('templates')}
            >
              {t('empty.browseTemplates')}
            </Button>
            <Button variant="surface" size="md" onClick={newBlank}>
              {t('newBlank')}
            </Button>
          </div>
        </div>
      ) : (
        <div className="gfx-ggrid">
          {(records ?? []).map((record) => (
            <DesignCard
              key={record.id}
              record={record}
              onOpen={() =>
                openEditor({
                  design: record.design,
                  draftId: record.id,
                  cloudId: record.cloudId ?? null,
                })
              }
              onDuplicate={() => duplicate(record)}
              onRename={() => setRenaming(record)}
              onExport={() => exportDesignJson(record.name, record.design)}
              onPublish={() =>
                openEditor({
                  design: record.design,
                  draftId: record.id,
                  cloudId: record.cloudId ?? null,
                  publish: true,
                })
              }
              onDelete={() => remove(record)}
            />
          ))}
          {unreadable.map((record) => (
            <UnreadableCard
              key={record.id}
              record={record}
              onExport={() => exportDesignJson(record.name, record.raw)}
              onDelete={() => removeUnreadable(record)}
            />
          ))}
        </div>
      )}
    </div>
  );

  const chip = (
    key: string,
    on: boolean,
    label: string,
    onClick: () => void,
  ) => (
    <button
      key={key}
      type="button"
      className={`gfx-fchip${on ? ' is-on' : ''}`}
      aria-pressed={on}
      onClick={onClick}
    >
      {label}
    </button>
  );

  const templatesTab = (
    <div className="gfx-gallery">
      <label className="gfx-csearch is-lg">
        <Search className="size-4" />
        <input
          className="gfx-input"
          value={search}
          placeholder={t('searchTemplates')}
          aria-label={t('searchTemplates')}
          onChange={(e) => setSearch(e.target.value)}
        />
      </label>
      <div className="gfx-fchips">
        <Filter className="size-[15px] gfx-fchips-ic" />
        {(['newest', 'used', 'liked'] as SortKey[]).map((k) =>
          chip(`sort-${k}`, sort === k, t(`sort.${k}`), () => setSort(k)),
        )}
        <span className="gfx-fchips-sep" />
        {SIZES.map((k) =>
          chip(`size-${k}`, size === k, t(`sizes.${k}`), () => setSize(k)),
        )}
        <span className="gfx-fchips-sep" />
        {chip('sb', wantScoreboard, t('hasScoreboard'), () =>
          setWantScoreboard((v) => !v),
        )}
        {chip('st', wantStats, t('hasStats'), () => setWantStats((v) => !v))}
      </div>

      {user && (mine.data?.designs.length ?? 0) > 0 && (
        <div className="gfx-gsec">
          <div className="gfx-gsec-h">
            <h3>{t('mine')}</h3>
            <span>{t('mineSub')}</span>
          </div>
          <CloudGrid
            designs={mine.data!.designs}
            onUse={startCloud}
            onReport={setReporting}
          />
        </div>
      )}

      {builtIn.length > 0 && (
        <div className="gfx-gsec">
          <div className="gfx-gsec-h">
            <h3>{t('builtIn')}</h3>
            <span>{t('builtInSub')}</span>
          </div>
          <div className="gfx-ggrid">
            {builtIn.map((item) => (
              <TemplateCard
                key={item.tpl.id}
                template={item.tpl}
                design={item.design}
                onUse={() => startBuiltIn(item)}
              />
            ))}
          </div>
        </div>
      )}

      <div className="gfx-gsec">
        <div className="gfx-gsec-h">
          <h3>{t('community')}</h3>
          <span>
            {community.isLoading
              ? '…'
              : t('foundN', { count: community.data?.total ?? 0 })}
          </span>
        </div>
        {community.isLoading ? (
          <div className="text-center py-8">
            <span className="loader" />
          </div>
        ) : community.isError ? (
          <div className="gfx-gempty">
            <h3>{t('communityError.title')}</h3>
            <p>{t('communityError.body')}</p>
            <Button
              variant="surface"
              size="md"
              onClick={() => community.refetch()}
            >
              {t('retry')}
            </Button>
          </div>
        ) : community.data && community.data.designs.length > 0 ? (
          <>
            <CloudGrid
              designs={community.data.designs}
              onUse={startCloud}
              onReport={setReporting}
            />
            {community.data.totalPages > 1 && (
              <WidgetPager
                page={page}
                totalPages={community.data.totalPages}
                onPrev={() => setPage((p) => Math.max(1, p - 1))}
                onNext={() =>
                  setPage((p) => Math.min(community.data!.totalPages, p + 1))
                }
              />
            )}
          </>
        ) : (
          <div className="gfx-gempty">
            <span className="gfx-gempty-ic">
              <Search className="size-5" />
            </span>
            <h3>{filtered ? t('noMatch.title') : t('noCommunity.title')}</h3>
            <p>{filtered ? t('noMatch.body') : t('noCommunity.body')}</p>
            {filtered && (
              <Button variant="surface" size="md" onClick={clearFilters}>
                {t('clearFilters')}
              </Button>
            )}
          </div>
        )}
      </div>
    </div>
  );

  const savedTab = (
    <div className="gfx-gallery">
      {!user ? (
        <div className="gfx-gempty">
          <span className="gfx-gempty-ic">
            <Bookmark className="size-5" />
          </span>
          <h3>{t('savedSignIn.title')}</h3>
          <p>{t('savedSignIn.body')}</p>
        </div>
      ) : saved.isLoading ? (
        <div className="text-center py-8">
          <span className="loader" />
        </div>
      ) : saved.data && saved.data.designs.length > 0 ? (
        <>
          <CloudGrid
            designs={saved.data.designs}
            onUse={startCloud}
            onReport={setReporting}
          />
          {saved.data.totalPages > 1 && (
            <WidgetPager
              page={savedPage}
              totalPages={saved.data.totalPages}
              onPrev={() => setSavedPage((p) => Math.max(1, p - 1))}
              onNext={() =>
                setSavedPage((p) => Math.min(saved.data!.totalPages, p + 1))
              }
            />
          )}
        </>
      ) : (
        <div className="gfx-gempty">
          <span className="gfx-gempty-ic">
            <Bookmark className="size-5" />
          </span>
          <h3>{t('nothingSaved.title')}</h3>
          <p>{t('nothingSaved.body')}</p>
          <Button
            variant="cta"
            size="md"
            Icon={<LayoutTemplate className="size-4" />}
            onClick={() => setTab('templates')}
          >
            {t('empty.browseTemplates')}
          </Button>
        </div>
      )}
    </div>
  );

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      containerClassName="!w-[min(100%,1000px)]"
      fullScreenOnPhone
      contentClassName="text-white sm:h-[75vh] h-[72vh] max-h-[72vh]"
      overlayClassName="!z-[1001]"
      bottomContent={<ModalBottomCloseButton onClose={onClose} />}
      topContent={
        <Tabs
          tabs={tabs}
          activeTab={tab}
          setActiveTab={setTab}
          containerClassName="!rounded-none"
        />
      }
    >
      <PromptDialog
        open={!!renaming}
        title={t('renameTitle')}
        label={t('renamePrompt')}
        value={renaming?.name ?? ''}
        confirmLabel={t('rename')}
        onConfirm={(name) => renaming && rename(renaming, name)}
        onClose={() => setRenaming(null)}
      />
      <ReportDialog
        target={
          reporting
            ? { type: 'design', id: reporting._id, name: reporting.name }
            : null
        }
        onClose={() => setReporting(null)}
      />
      <DesignDataProvider binding={LIVE_BINDING}>
        <TabContent
          tabs={[
            { ...tabs[0], content: myDesigns },
            { ...tabs[1], content: templatesTab },
            { ...tabs[2], content: savedTab },
          ]}
          activeTab={tab}
        />
      </DesignDataProvider>
    </Modal>
  );
};

export default GraphicsModal;
